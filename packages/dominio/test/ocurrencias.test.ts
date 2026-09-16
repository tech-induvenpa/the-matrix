import { describe, expect, it } from 'vitest';
import { Calendario } from '../src/calendario';
import { ocurrenciasEntre } from '../src/ocurrencias';

const calendario = Calendario.con([{ desde: '2026-09-08', hasta: '2026-09-08' }]);

const cierre = {
  periodicidad: 'mensual',
  diaTope: 3,
  fechaAlta: '2026-08-01',
} as const;

describe('ocurrencias de una mensual con dia tope', () => {
  it('vence el dia tope, adelantado al habil anterior cuando no es habil', () => {
    expect(ocurrenciasEntre(cierre, calendario, '2026-09-01', '2026-10-31')).toEqual([
      { periodo: '2026-09', vence: '2026-09-03' }, // jueves
      { periodo: '2026-10', vence: '2026-10-02' }, // el 3 cae sabado
    ]);
  });
});

describe('alta de una funcion', () => {
  it('empieza a contar en el siguiente periodo completo, nunca con un vencimiento imposible', () => {
    const nueva = { periodicidad: 'mensual', diaTope: 3, fechaAlta: '2026-09-10' } as const;

    expect(ocurrenciasEntre(nueva, calendario, '2026-09-01', '2026-11-30')).toEqual([
      { periodo: '2026-10', vence: '2026-10-02' },
      { periodo: '2026-11', vence: '2026-11-03' },
    ]);
  });
});
