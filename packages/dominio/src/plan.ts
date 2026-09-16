import type { Fecha } from './calendario';

// La ventana de cinco dias habiles delimita la meta de la semana, no lo que se
// muestra: la lista siempre trae lo mas proximo, aunque venza mas adelante.
// ponytail: ordenar y cortar. El orden por cuadrante y ponderacion es CEB-109.
export function proximas<T extends { vence: Fecha }>(ocurrencias: readonly T[], cuantas: number): T[] {
  return [...ocurrencias].sort((a, b) => a.vence.localeCompare(b.vence)).slice(0, cuantas);
}

// Una funcion nunca aparece dos veces en el plan: se muestra su proxima
// ocurrencia, y la siguiente solo cuando le toque (INV-10).
export function unaPorFuncion<T extends { funcionId: string; vence: Fecha }>(
  ocurrencias: readonly T[],
): T[] {
  const proxima = new Map<string, T>();
  for (const o of ocurrencias) {
    const actual = proxima.get(o.funcionId);
    if (!actual || o.vence < actual.vence) proxima.set(o.funcionId, o);
  }
  return [...proxima.values()];
}
