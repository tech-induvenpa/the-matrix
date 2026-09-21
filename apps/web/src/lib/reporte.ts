import {
  arrastreDe,
  Calendario,
  ocurrenciasEntre,
  ponderacionArrastrada,
  type Arrastre,
  type Periodicidad,
} from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { hoyISO } from '@/lib/datos';

export type FuncionDelReporte = {
  funcionId: string;
  texto: string;
  periodicidad: string;
  ponderacion: number;
  // Lo que arrastra quien la tiene hoy: se reinicia en el traspaso, porque
  // nadie hereda la mora de otro.
  delTitular: Arrastre;
  // Lo que arrastra la funcion, cruzando a todos sus titulares. Una funcion
  // que dos personas seguidas no pudieron sostener no es un problema de
  // ninguna de las dos.
  deLaFuncion: Arrastre;
  manos: number;
};

export type PersonaDelReporte = {
  id: string;
  nombre: string;
  arrastrado: number;
  funciones: FuncionDelReporte[];
};

// Cuanto para atras se mira. Un año basta para ver un patron y no tanto como
// para que el calculo se note.
const DESDE_HACE = 365;

export async function reporte(): Promise<PersonaDelReporte[]> {
  const supabase = await clienteDelServidor();
  const hoy = hoyISO();
  const desde = new Date(Date.parse(`${hoy}T00:00:00Z`) - DESDE_HACE * 864e5).toISOString().slice(0, 10);

  const [{ data: dias }, { data: titularidades }, { data: marcas }] = await Promise.all([
    supabase.from('dia_no_habil').select('desde, hasta'),
    supabase
      .from('titularidad')
      .select(
        'funcion_id, empleado_id, ponderacion, desde, hasta, publicado_en, empleado(nombre_bloque), funcion!inner(texto, periodicidad, fecha_alta, tipo_generado, tipo_corregido, activa)',
      ),
    supabase.from('marca').select('funcion_id, periodo'),
  ]);

  const calendario = Calendario.con(dias ?? []);
  const cerradasPor = new Map<string, { periodo: string }[]>();
  for (const m of marcas ?? []) {
    const clave = m.funcion_id as string;
    cerradasPor.set(clave, [...(cerradasPor.get(clave) ?? []), { periodo: m.periodo as string }]);
  }

  const todas = (titularidades ?? []) as Record<string, unknown>[];
  const manosPor = new Map<string, number>();
  for (const t of todas) {
    const clave = t.funcion_id as string;
    manosPor.set(clave, (manosPor.get(clave) ?? 0) + 1);
  }

  const ocurrenciasDe = (f: Record<string, unknown>, desdeCuando: string, hastaCuando: string) =>
    ocurrenciasEntre(
      {
        periodicidad: f.periodicidad as Periodicidad,
        fechaAlta: f.fecha_alta as string,
        diaTope: undefined,
      },
      calendario,
      desdeCuando,
      hastaCuando,
    );

  const gente = new Map<string, PersonaDelReporte>();

  for (const t of todas) {
    const funcion = t.funcion as Record<string, unknown>;
    const tipo = (funcion.tipo_corregido ?? funcion.tipo_generado) as string | null;

    // Solo los entregables vencen: un flujo o un area no arrastran nada.
    if (!funcion.activa || tipo !== 'entregable') continue;
    if (t.hasta !== null || t.publicado_en === null) continue;

    const funcionId = t.funcion_id as string;
    const empleadoId = t.empleado_id as string;
    const cerradas = cerradasPor.get(funcionId) ?? [];

    // El arrastre del titular empieza cuando empezo su tenencia.
    const suyas = ocurrenciasDe(funcion, (t.desde as string) > desde ? (t.desde as string) : desde, hoy);
    const todasLas = ocurrenciasDe(funcion, desde, hoy);

    const fila: FuncionDelReporte = {
      funcionId,
      texto: funcion.texto as string,
      periodicidad: funcion.periodicidad as string,
      ponderacion: t.ponderacion as number,
      delTitular: arrastreDe(suyas, cerradas, hoy),
      deLaFuncion: arrastreDe(todasLas, cerradas, hoy),
      manos: manosPor.get(funcionId) ?? 1,
    };

    const nombre = ((t.empleado as { nombre_bloque?: string } | null)?.nombre_bloque ?? '') as string;
    const persona = gente.get(empleadoId) ?? { id: empleadoId, nombre, arrastrado: 0, funciones: [] };
    persona.funciones.push(fila);
    gente.set(empleadoId, persona);
  }

  // El orden es por ponderacion arrastrada, no por numero de periodos: cuanto
  // del cargo de alguien esta sin cumplirse es lo unico comparable entre
  // personas y entre cadencias, y es ademas el impacto salarial expresado en
  // el unico lenguaje que el sistema conoce (ADR 0007).
  return [...gente.values()]
    .map((p) => ({
      ...p,
      arrastrado: ponderacionArrastrada(p.funciones.map((f) => ({ ...f, arrastre: f.delTitular }))),
      funciones: p.funciones.sort(
        (a, b) => b.deLaFuncion.periodos - a.deLaFuncion.periodos || b.ponderacion - a.ponderacion,
      ),
    }))
    .sort((a, b) => b.arrastrado - a.arrastrado || a.nombre.localeCompare(b.nombre));
}
