import { describe, expect, it } from 'vitest';
import { unaPorFuncion } from '../src/plan';

describe('una funcion no aparece dos veces', () => {
  it('deja solo la ocurrencia mas proxima de cada funcion', () => {
    const ocurrencias = [
      { funcionId: 'impuestos', vence: '2026-10-16' },
      { funcionId: 'impuestos', vence: '2026-09-18' },
      { funcionId: 'condominio', vence: '2026-09-30' },
    ];

    expect(unaPorFuncion(ocurrencias)).toEqual([
      { funcionId: 'impuestos', vence: '2026-09-18' },
      { funcionId: 'condominio', vence: '2026-09-30' },
    ]);
  });
});
