import { describe, expect, it } from 'vitest';
import { cuadranteDe, importanciaEfectiva, ordenarPlan } from '../src/cuadrante';

describe('importancia efectiva', () => {
  it('sube a cinco a tres dias o menos, pero no en diarias ni semanales', () => {
    expect(importanciaEfectiva(3, 2, 'mensual')).toBe(5);
    expect(importanciaEfectiva(3, 2, 'diaria')).toBe(3);
    expect(importanciaEfectiva(3, 2, 'semanal')).toBe(3);
  });

  it('nunca baja lo que ya vale mas', () => {
    expect(importanciaEfectiva(8, 1, 'mensual')).toBe(8);
  });

  it('no deja a nadie en el cuarto cuadrante: sin urgencia ni importancia, sube a cinco', () => {
    expect(importanciaEfectiva(2, 20, 'mensual')).toBe(5);
  });
});

describe('cuadrante', () => {
  it('sale del corte en 4,5 de urgencia e importancia', () => {
    expect(cuadranteDe(8, 9)).toBe('hacer');
    expect(cuadranteDe(8, 3)).toBe('mantener');
    expect(cuadranteDe(1, 9)).toBe('agendar');
  });
});

describe('orden de presentacion', () => {
  it('primero el cuadrante, luego lo que mas pesa en el cargo, luego lo que antes vence', () => {
    const plan = [
      { id: 'a', cuadrante: 'mantener' as const, ponderacion: 25, faltan: 1 },
      { id: 'b', cuadrante: 'hacer' as const, ponderacion: 5, faltan: 3 },
      { id: 'c', cuadrante: 'hacer' as const, ponderacion: 25, faltan: 3 },
      { id: 'd', cuadrante: 'agendar' as const, ponderacion: 10, faltan: 9 },
      { id: 'e', cuadrante: 'agendar' as const, ponderacion: 10, faltan: 4 },
    ];

    expect(ordenarPlan(plan).map((p) => p.id)).toEqual(['c', 'b', 'e', 'd', 'a']);
  });
});
