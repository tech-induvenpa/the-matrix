import { describe, expect, it } from 'vitest';
import { Calendario } from '../src/calendario';
import { ocurrenciasEntre } from '../src/ocurrencias';

// Septiembre de 2026: el martes 8 es feriado de la empresa.
const calendario = Calendario.con([{ desde: '2026-09-08', hasta: '2026-09-08' }]);
const alta = '2026-01-01';
const vencimientos = (periodicidad: 'diaria' | 'semanal' | 'quincenal' | 'trimestral', desde: string, hasta: string) =>
  ocurrenciasEntre({ periodicidad, fechaAlta: alta }, calendario, desde, hasta).map((o) => o.vence);

describe('cada periodicidad vence donde le toca', () => {
  it('diaria: un vencimiento por dia habil, y ninguno en los que no se trabaja', () => {
    expect(vencimientos('diaria', '2026-09-04', '2026-09-09')).toEqual([
      '2026-09-04', // viernes
      '2026-09-07', // lunes; el sabado y el domingo no cuentan
      '2026-09-09', // miercoles; el martes 8 es feriado
    ]);
  });

  it('semanal: el ultimo dia habil de cada semana', () => {
    expect(vencimientos('semanal', '2026-09-07', '2026-09-25')).toEqual([
      '2026-09-11',
      '2026-09-18',
      '2026-09-25',
    ]);
  });

  it('quincenal: el 15 y el ultimo habil del mes', () => {
    expect(vencimientos('quincenal', '2026-09-01', '2026-10-31')).toEqual([
      '2026-09-15', // martes
      '2026-09-30', // miercoles
      '2026-10-15', // jueves
      '2026-10-30', // el 31 cae sabado
    ]);
  });

  it('trimestral: el ultimo habil del trimestre', () => {
    expect(vencimientos('trimestral', '2026-07-01', '2026-12-31')).toEqual([
      '2026-09-30',
      '2026-12-31',
    ]);
  });
});
