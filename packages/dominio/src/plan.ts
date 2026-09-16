import type { Fecha } from './calendario';

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

// La regla de proximidad no vale para las diarias ni las semanales: vencen hoy
// por definicion, asi que ganarian siempre y taparian lo que de verdad tiene
// fecha. Entran despues, y entre ellas manda lo que mas importa.
const CORTAS: readonly string[] = ['diaria', 'semanal'];

export function seleccionarPlan<
  T extends { vence: Fecha; periodicidad: string; importancia: number },
>(ocurrencias: readonly T[], cuantas: number): T[] {
  const conFecha = ocurrencias
    .filter((o) => !CORTAS.includes(o.periodicidad))
    .sort((a, b) => a.vence.localeCompare(b.vence));

  const delDiaADia = ocurrencias
    .filter((o) => CORTAS.includes(o.periodicidad))
    .sort((a, b) => b.importancia - a.importancia || a.vence.localeCompare(b.vence));

  // Relleno hasta completar: si solo hay trabajo del dia a dia, eso se muestra.
  return [...conFecha, ...delDiaADia].slice(0, cuantas);
}
