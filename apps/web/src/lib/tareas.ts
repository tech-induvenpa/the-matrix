import {
  cuadranteDe,
  importanciaEfectiva,
  listaDeTareas,
  ocurrenciasEntre,
  unaPorFuncion,
  urgenciaDe,
  type Calendario,
  type Cuadrante,
  type EnLaLista,
  type Periodicidad,
} from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { sumarDias, type FilaImprevisto } from '@/lib/datos';

// Las tareas abiertas de una persona, para su supervisor o el administrador
// (CEB-198). Lo mismo que ve ella en su semana: una ocurrencia por funcion, la
// mas proxima sin marcar, rescatando diez dias de lo vencido. Sin ponderacion:
// la base no la manda (INV-3).
type FuncionDeLaPersona = {
  id: string;
  texto: string;
  importancia: number;
  periodicidad: Periodicidad;
  dia_tope: number | null;
  fecha_alta: string;
};

export type OcurrenciaAbierta = {
  funcionId: string;
  periodo: string;
  texto: string;
  vence: string;
  importancia: number;
  urgencia: number;
  faltan: number;
  cuadrante: Cuadrante;
  marcada: boolean;
};

export type TareaDeLaLista = EnLaLista<OcurrenciaAbierta, FilaImprevisto>;

export async function tareasAbiertasDe(empleadoId: string, hoy: string, calendario: Calendario): Promise<TareaDeLaLista[]> {
  const supabase = await clienteDelServidor();
  const { data } = await supabase.rpc('tareas_de', { el_empleado: empleadoId });
  const todo = (data ?? {}) as {
    funciones?: FuncionDeLaPersona[];
    marcas?: { funcion_id: string; periodo: string }[];
    imprevistos?: FilaImprevisto[];
  };
  const marcadas = new Set((todo.marcas ?? []).map((m) => `${m.funcion_id}|${m.periodo}`));

  const abiertas = (todo.funciones ?? []).flatMap((f) =>
    ocurrenciasEntre(
      { periodicidad: f.periodicidad, diaTope: f.dia_tope ?? undefined, fechaAlta: f.fecha_alta },
      calendario,
      sumarDias(hoy, -10),
      sumarDias(hoy, 120),
    )
      .filter((o) => !marcadas.has(`${f.id}|${o.periodo}`))
      .map((o) => ({ ...o, funcionId: f.id, texto: f.texto, importancia: f.importancia, periodicidad: f.periodicidad })),
  );

  const ocurrencias = unaPorFuncion(abiertas).map((o): OcurrenciaAbierta => {
    const faltan = calendario.habilesHasta(hoy, o.vence);
    const urgencia = urgenciaDe(faltan);
    return {
      ...o,
      faltan,
      urgencia,
      cuadrante: cuadranteDe(urgencia, importanciaEfectiva(o.importancia, faltan, o.periodicidad)),
      marcada: false,
    };
  });

  const imprevistos = (todo.imprevistos ?? []).map((i) => ({ ...i, borradoEn: i.borrado_en }));
  return listaDeTareas(ocurrencias, imprevistos, hoy, calendario);
}
