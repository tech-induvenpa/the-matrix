import type { Periodicidad } from './ocurrencias';

export type Cuadrante = 'hacer' | 'agendar' | 'mantener';

// De 4,5 en adelante cuenta como alto.
const CORTE = 4.5;

// La regla de proximidad no aplica a diarias ni semanales: su fecha esta
// siempre encima por definicion, y las dejaria fijas en el campo de ejecucion.
const SIEMPRE_ENCIMA: Periodicidad[] = ['diaria', 'semanal'];

export function importanciaEfectiva(
  importancia: number,
  diasHabilesRestantes: number,
  periodicidad: Periodicidad,
): number {
  let efectiva = importancia;
  if (diasHabilesRestantes <= 3 && !SIEMPRE_ENCIMA.includes(periodicidad)) {
    efectiva = Math.max(efectiva, 5);
  }
  // Nada cae en el vacio: si no aprieta ni pesa, igual es minimamente importante.
  if (diasHabilesRestantes > 7 && efectiva < CORTE) efectiva = 5;
  return efectiva;
}

export function cuadranteDe(urgencia: number, importancia: number): Cuadrante {
  if (urgencia < CORTE) return 'agendar';
  return importancia >= CORTE ? 'hacer' : 'mantener';
}

const RANGO: Record<Cuadrante, number> = { hacer: 0, agendar: 1, mantener: 2 };

export function ordenarPlan<T extends { cuadrante: Cuadrante; ponderacion: number; faltan: number }>(
  plan: readonly T[],
): T[] {
  return [...plan].sort(
    (a, b) =>
      RANGO[a.cuadrante] - RANGO[b.cuadrante] ||
      b.ponderacion - a.ponderacion ||
      a.faltan - b.faltan,
  );
}
