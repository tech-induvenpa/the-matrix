import { describe, expect, it } from 'vitest';
import { repartoDelMes } from '../src/reparto';

const funciones = [
  { funcionId: 'nomina', nombre: 'Nómina quincenal', tipo: 'entregable' as const, ponderacion: 45 },
  { funcionId: 'cxp', nombre: 'Cuentas por pagar', tipo: 'flujo' as const, ponderacion: 30 },
  { funcionId: 'asistencia', nombre: 'Asistencia a la gerencia', tipo: 'area' as const, ponderacion: 5 },
];

describe('reparto del mes', () => {
  it('cada funcion vale su ponderacion, y la cotidianidad completa el cien', () => {
    expect(repartoDelMes(funciones).map((f) => [f.funcionId, f.porcentaje])).toEqual([
      ['nomina', 45],
      ['cxp', 30],
      ['cotidianidad', 20],
      ['asistencia', 5],
    ]);
  });

  it('las areas y la cotidianidad solo aparecen aqui, y aqui si aparecen', () => {
    // Fuera del mes no se agendan; pero son parte del cargo y explican
    // por que el trabajo del dia no llena la jornada.
    const tipos = repartoDelMes(funciones).map((f) => f.tipo);
    expect(tipos).toContain('area');
    expect(tipos).toContain('cotidianidad');
  });

  it('el reparto siempre suma cien', () => {
    const suma = repartoDelMes(funciones).reduce((t, f) => t + f.porcentaje, 0);
    expect(suma).toBe(100);
  });

  it('sin funciones, todo el cargo es cotidianidad', () => {
    expect(repartoDelMes([]).map((f) => [f.funcionId, f.porcentaje])).toEqual([['cotidianidad', 100]]);
  });
});
