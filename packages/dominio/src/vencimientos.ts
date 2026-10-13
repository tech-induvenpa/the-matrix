import type { Calendario, Fecha } from './calendario';
import type { Periodicidad } from './ocurrencias';

export type PorVencer = { clave: string; vence: Fecha; periodicidad?: Periodicidad };

// Las tareas sin marcar a 2 o a 1 dias habiles de vencer, juntas por cuantos
// faltan (CEB-271). Es igualdad, no "hasta": un dia que ya paso no se avisa, y
// una tarea que nace con un dia solo recibe el aviso de 1. Una diaria vence el
// mismo dia en que nace, asi que la de manana tampoco avisa. En un dia no habil
// no se avisa nada: el lunes cuenta como "hoy" (CEB-193) y el aviso saldria un
// dia antes de tiempo.
export function vencimientosPorAvisar(
  tareas: readonly PorVencer[],
  hoy: Fecha,
  calendario: Calendario,
): { faltan: 1 | 2; claves: string[] }[] {
  if (!calendario.esHabil(hoy)) return [];

  const conCuantoFalta = tareas
    .filter((t) => t.periodicidad !== 'diaria')
    .map((t) => ({ clave: t.clave, faltan: calendario.habilesHasta(hoy, t.vence) }));

  return ([2, 1] as const)
    .map((faltan) => ({ faltan, claves: conCuantoFalta.filter((t) => t.faltan === faltan).map((t) => t.clave) }))
    .filter((g) => g.claves.length > 0);
}
