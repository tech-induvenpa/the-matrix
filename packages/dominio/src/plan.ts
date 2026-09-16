import type { Fecha } from './calendario';

// La ventana de cinco dias habiles delimita la meta de la semana, no lo que se
// muestra: la lista siempre trae lo mas proximo, aunque venza mas adelante.
// ponytail: ordenar y cortar. El orden por cuadrante y ponderacion es CEB-109.
export function proximas<T extends { vence: Fecha }>(ocurrencias: readonly T[], cuantas: number): T[] {
  return [...ocurrencias].sort((a, b) => a.vence.localeCompare(b.vence)).slice(0, cuantas);
}
