import { describe, expect, it } from 'vitest';
import { pendientes } from '../src/marcas';

const ocurrencias = [
  { funcionId: 'impuestos', periodo: '2026-09', vence: '2026-09-18' },
  { funcionId: 'impuestos', periodo: '2026-10', vence: '2026-10-16' },
  { funcionId: 'condominio', periodo: '2026-09', vence: '2026-09-30' },
];

describe('lo que sigue pendiente', () => {
  it('una ocurrencia marcada sale del bloque activo y deja pasar a la siguiente', () => {
    const marcas = [{ funcionId: 'impuestos', periodo: '2026-09' }];

    expect(pendientes(ocurrencias, marcas)).toEqual([
      { funcionId: 'impuestos', periodo: '2026-10', vence: '2026-10-16' },
      { funcionId: 'condominio', periodo: '2026-09', vence: '2026-09-30' },
    ]);
  });

  it('marcar no pude libera el lugar igual que marcar hecho', () => {
    const marcas = [{ funcionId: 'condominio', periodo: '2026-09' }];

    expect(pendientes(ocurrencias, marcas).map((o) => o.funcionId)).toEqual([
      'impuestos',
      'impuestos',
    ]);
  });
});
