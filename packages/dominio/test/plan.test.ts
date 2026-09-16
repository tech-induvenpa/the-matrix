import { describe, expect, it } from 'vitest';
import { proximas } from '../src/plan';

describe('lo que se muestra', () => {
  it('trae siempre lo mas proximo, aunque venza despues de esta semana', () => {
    const ocurrencias = [
      { texto: 'Cierre Changan', vence: '2026-10-02' },
      { texto: 'Impuestos', vence: '2026-09-18' },
      { texto: 'Condominio', vence: '2026-09-30' },
      { texto: 'Alcaldia', vence: '2026-11-30' },
    ];

    expect(proximas(ocurrencias, 3).map((o) => o.texto)).toEqual([
      'Impuestos',
      'Condominio',
      'Cierre Changan',
    ]);
  });

  it('no inventa filas cuando hay menos de las pedidas', () => {
    expect(proximas([{ texto: 'Impuestos', vence: '2026-09-18' }], 5)).toHaveLength(1);
  });
});
