import { Calendario } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { hoyISO, type FilaImprevisto, type QuienPide } from '@/lib/datos';
import type { DatosDelEquipo } from '@/lib/equipo';
import { comoVanSusFunciones, type ComoVaUnaFuncion } from '@/lib/tablero';

// Lo que un supervisor ve de su gente (CEB-145): lo necesario para actuar el
// mismo dia. Llega por una sola funcion de la base, que le devuelve pesos y
// nunca un monto (ADR 0015, INV-40): el supervisor no tiene politica sobre las
// tablas donde vive la ponderacion.

export type PersonaACargo = {
  id: string;
  nombre: string;
  empresaId: string | null;
  sedeId: string | null;
  cotidianidad: number;
  // Todo su reparto, de mas a menos peso, con como va cada funcion.
  funciones: ComoVaUnaFuncion[];
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
  const todo = (data ?? {}) as Partial<DatosDelEquipo>;
  const datos: DatosDelEquipo = {
    gente: todo.gente ?? [],
    funciones: todo.funciones ?? [],
    marcas: todo.marcas ?? [],
    eventos: todo.eventos ?? [],
    imprevistos: todo.imprevistos ?? [],
    intromisiones: todo.intromisiones ?? [],
  };

  const gente: PersonaACargo[] = datos.gente.map((p) => {
    return {
      id: p.id,
      nombre: p.nombre,
      empresaId: p.empresa,
      sedeId: p.sede,
      cotidianidad: p.cotidianidad,
      funciones: comoVanSusFunciones(datos, p.id, hoy, calendario).sort(
        (a, b) => b.ponderacion - a.ponderacion || a.texto.localeCompare(b.texto),
      ),
      imprevistos: datos.imprevistos.filter((i) => i.empleado_id === p.id),
    };
  });

  return {
    hoy,
    calendario,
    datos,
    gente,
    quienesPiden: (quienes ?? []) as QuienPide[],
    yo: usuario.user?.id ?? '',
  };
}
