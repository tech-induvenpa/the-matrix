import { describe, expect, it } from 'vitest';
import { seleccionarPlan } from '../src/plan';

// Una diaria vence hoy por definicion, asi que por proximidad gana siempre.
const diaria = (texto: string, importancia: number) =>
  ({ texto, importancia, periodicidad: 'diaria' as const, vence: '2026-09-16' });

const mensual = (texto: string, importancia: number, vence: string) =>
  ({ texto, importancia, periodicidad: 'mensual' as const, vence });

describe('que entra en el plan', () => {
  it('lo que tiene fecha de verdad no lo tapan las diarias', () => {
    const plan = seleccionarPlan(
      [
        diaria('Caja chica', 3),
        diaria('Permisos', 4),
        diaria('Bono de producción', 3),
        mensual('Cierre financiero Auto Bengala', 9, '2026-10-02'),
        mensual('Cierre financiero Changan', 9, '2026-10-02'),
      ],
      3,
    );

    expect(plan.map((o) => o.texto)).toEqual([
      'Cierre financiero Auto Bengala',
      'Cierre financiero Changan',
      'Permisos',
    ]);
  });

  it('entre diarias, primero la que mas importa', () => {
    const plan = seleccionarPlan([diaria('Archivo', 2), diaria('Pagos', 8), diaria('Caja', 5)], 2);
    expect(plan.map((o) => o.texto)).toEqual(['Pagos', 'Caja']);
  });

  it('rellena hasta cinco con lo que haya, aunque sean todas diarias', () => {
    const plan = seleccionarPlan([diaria('A', 3), diaria('B', 4), diaria('C', 5)], 5);
    expect(plan).toHaveLength(3);
  });

  it('entre las que tienen fecha, manda la mas proxima', () => {
    const plan = seleccionarPlan(
      [mensual('Lejana', 9, '2026-12-01'), mensual('Cercana', 2, '2026-09-18')],
      1,
    );
    expect(plan[0]?.texto).toBe('Cercana');
  });
});
