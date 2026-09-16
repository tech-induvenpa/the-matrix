import { describe, expect, it } from 'vitest';
import { repartoDelMes } from '../src/reparto';

const funciones = [
  { funcionId: 'nomina', nombre: 'Nómina quincenal', tipo: 'entregable' as const, ponderacion: 9 },
  { funcionId: 'cxp', nombre: 'Cuentas por pagar', tipo: 'flujo' as const, ponderacion: 6 },
  { funcionId: 'asistencia', nombre: 'Asistencia a la gerencia', tipo: 'area' as const, ponderacion: 4 },
  { funcionId: 'imprevistos', nombre: 'Imprevistos', tipo: 'holgura' as const, ponderacion: 1 },
];

describe('reparto del mes', () => {
  it('reparte el cargo entre todas las funciones, de mayor a menor', () => {
    expect(repartoDelMes(funciones).map((f) => [f.funcionId, f.porcentaje])).toEqual([
      ['nomina', 45],
      ['cxp', 30],
      ['asistencia', 20],
      ['imprevistos', 5],
    ]);
  });

  it('las areas y la holgura solo aparecen aqui, y aqui si aparecen', () => {
    // Fuera del mes no se agendan; pero son parte del cargo y explican
    // por que el trabajo del dia no llena la jornada.
    const tipos = repartoDelMes(funciones).map((f) => f.tipo);
    expect(tipos).toContain('area');
    expect(tipos).toContain('holgura');
  });

  it('el reparto siempre suma cien', () => {
    const suma = repartoDelMes(funciones).reduce((t, f) => t + f.porcentaje, 0);
    expect(suma).toBe(100);
  });

  it('sin funciones no reparte nada, en vez de dividir por cero', () => {
    expect(repartoDelMes([])).toEqual([]);
  });
});
