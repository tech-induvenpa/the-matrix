import { arrastreDe, Calendario, estadosVigentes, ocurrenciasEntre, type Arrastre, type Periodicidad } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { hoyISO, type FilaImprevisto, type QuienPide } from '@/lib/datos';

// Lo que un supervisor ve de su gente (CEB-145): lo necesario para actuar el
// mismo dia, y nada de sueldo. Llega por una sola funcion de la base que no
// devuelve pesos, tasas ni bonos (INV-3): el supervisor no tiene politica
// sobre las tablas donde vive la ponderacion.

type FuncionDeSuGente = {
  id: string;
  empleado_id: string;
  texto: string;
  importancia: number;
  periodicidad: Periodicidad;
  tipo: string | null;
  dia_tope: number | null;
  fecha_alta: string;
  desde: string;
};

type MarcaDeSuGente = { funcion_id: string; periodo: string; resultado: string; razon: string | null; marcada_en: string };
type EventoDeSuGente = { funcion_id: string; estado: 'al_dia' | 'atrasado'; razon: string | null; en: string };

export type ComoVaUnaFuncion = {
  id: string;
  texto: string;
  periodicidad: string;
  // Un entregable arrastra; un flujo esta al dia o atrasado desde una fecha.
  arrastre: Arrastre | null;
  atrasadoDesde: string | null;
};

export type Razon = { en: string; funcion: string; quePaso: string; razon: string };

export type PersonaACargo = {
  id: string;
  nombre: string;
  funciones: ComoVaUnaFuncion[];
  razones: Razon[];
  imprevistos: FilaImprevisto[];
};

export async function loDeMiGente() {
  const supabase = await clienteDelServidor();
  const hoy = hoyISO();

  const [{ data }, { data: dias }, { data: quienes }, { data: usuario }] = await Promise.all([
    supabase.rpc('lo_de_mi_gente'),
    supabase.from('dia_no_habil').select('desde, hasta'),
    supabase.rpc('quienes_piden'),
    supabase.auth.getUser(),
  ]);

  const calendario = Calendario.con(dias ?? []);
  const todo = (data ?? {}) as {
    gente?: { id: string; nombre: string }[];
    funciones?: FuncionDeSuGente[];
    marcas?: MarcaDeSuGente[];
    eventos?: EventoDeSuGente[];
    imprevistos?: FilaImprevisto[];
  };
  const funciones = todo.funciones ?? [];
  const marcas = todo.marcas ?? [];
  const eventos = todo.eventos ?? [];

  const vigentes = new Map(
    estadosVigentes(eventos.map((e) => ({ funcionId: e.funcion_id, estado: e.estado, en: e.en }))).map((e) => [e.funcionId, e]),
  );
  const textoDe = new Map(funciones.map((f) => [f.id, f.texto]));

  const gente: PersonaACargo[] = (todo.gente ?? []).map((p) => {
    const suyas = funciones.filter((f) => f.empleado_id === p.id && (f.tipo === 'entregable' || f.tipo === 'flujo'));

    const comoVan = suyas
      .map((f): ComoVaUnaFuncion => {
        if (f.tipo === 'flujo') {
          const v = vigentes.get(f.id);
          return {
            id: f.id,
            texto: f.texto,
            periodicidad: f.periodicidad,
            arrastre: null,
            atrasadoDesde: v?.estado === 'atrasado' ? v.en.slice(0, 10) : null,
          };
        }
        // El arrastre de quien la tiene hoy empieza cuando empezo a tenerla.
        const ocurrencias = ocurrenciasEntre(
          { periodicidad: f.periodicidad, diaTope: f.dia_tope ?? undefined, fechaAlta: f.fecha_alta },
          calendario,
          f.desde,
          hoy,
        );
        const cerradas = marcas.filter((m) => m.funcion_id === f.id && m.resultado === 'hecho');
        return {
          id: f.id,
          texto: f.texto,
          periodicidad: f.periodicidad,
          arrastre: arrastreDe(ocurrencias, cerradas, hoy),
          atrasadoDesde: null,
        };
      })
      // Lo que mas tiempo lleva sin cumplirse, primero.
      .sort((a, b) => desdeCuando(a).localeCompare(desdeCuando(b)) || a.texto.localeCompare(b.texto));

    const ids = new Set(suyas.map((f) => f.id));
    const razones: Razon[] = [
      ...marcas
        .filter((m) => ids.has(m.funcion_id) && m.razon)
        .map((m) => ({ en: m.marcada_en.slice(0, 10), funcion: textoDe.get(m.funcion_id) ?? '', quePaso: 'no pude', razon: m.razon! })),
      ...eventos
        .filter((e) => ids.has(e.funcion_id) && e.razon)
        .map((e) => ({ en: e.en.slice(0, 10), funcion: textoDe.get(e.funcion_id) ?? '', quePaso: 'me atrasé', razon: e.razon! })),
    ].sort((a, b) => b.en.localeCompare(a.en));

    return {
      id: p.id,
      nombre: p.nombre,
      funciones: comoVan,
      razones,
      imprevistos: (todo.imprevistos ?? []).filter((i) => i.empleado_id === p.id),
    };
  });

  return {
    hoy,
    calendario,
    gente,
    quienesPiden: (quienes ?? []) as QuienPide[],
    yo: usuario.user?.id ?? '',
  };
}

// Sin arrastre ni atraso, al final.
const desdeCuando = (f: ComoVaUnaFuncion) =>
  (f.arrastre?.periodos ? f.arrastre.desde : f.atrasadoDesde) ?? '9999-12-31';
