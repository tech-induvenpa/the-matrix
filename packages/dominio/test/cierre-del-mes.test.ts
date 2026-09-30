import { describe, expect, it } from 'vitest';
import { Calendario } from '../src/calendario';
import { cierreDelMes, estadoDelMes, mesDe, ultimoHabilDelMes } from '../src/cierre-del-mes';

const sinFeriados = Calendario.con([]);

describe('el ultimo dia habil del mes', () => {
  it('es el ultimo dia del mes cuando es habil', () => {
    // Septiembre de 2026 termina un miercoles.
    expect(ultimoHabilDelMes('2026-09', sinFeriados)).toBe('2026-09-30');
  });

  it('retrocede al viernes cuando el mes termina en fin de semana', () => {
    // Octubre de 2026 termina un sabado.
    expect(ultimoHabilDelMes('2026-10', sinFeriados)).toBe('2026-10-30');
    // Mayo de 2026 termina un domingo.
    expect(ultimoHabilDelMes('2026-05', sinFeriados)).toBe('2026-05-29');
  });

  it('salta los feriados del calendario de JFS', () => {
    // El 31 de diciembre de 2026 es jueves; con el 24 al 31 libres, cierra el 23.
    const conColectivas = Calendario.con([{ desde: '2026-12-24', hasta: '2026-12-31' }]);
    expect(ultimoHabilDelMes('2026-12', conColectivas)).toBe('2026-12-23');
    // Un feriado el ultimo dia, y el anterior es fin de semana.
    const feriado = Calendario.con([{ desde: '2026-08-31', hasta: '2026-08-31' }]);
    expect(ultimoHabilDelMes('2026-08', feriado)).toBe('2026-08-28');
  });
});

describe('el instante del cierre', () => {
  it('son las 23:59 de Caracas del ultimo dia habil, que en UTC es el dia siguiente a las 03:59', () => {
    expect(cierreDelMes('2026-09', sinFeriados)).toBe('2026-10-01T03:59:00.000Z');
    expect(cierreDelMes('2026-10', sinFeriados)).toBe('2026-10-31T03:59:00.000Z');
  });

  it('un minuto antes el mes esta abierto; a las 23:59 y despues, cerrado', () => {
    expect(estadoDelMes('2026-09', sinFeriados, '2026-10-01T03:58:00.000Z').estado).toBe('abierto');
    expect(estadoDelMes('2026-09', sinFeriados, '2026-10-01T03:59:00.000Z').estado).toBe('cerrado');
    expect(estadoDelMes('2026-09', sinFeriados, '2026-10-01T04:00:00.000Z').estado).toBe('cerrado');
  });

  it('el cierre de un mes no toca al siguiente', () => {
    expect(estadoDelMes('2026-10', sinFeriados, '2026-10-01T04:00:00.000Z').estado).toBe('abierto');
  });

  it('antes de su ultimo dia habil, un mes esta abierto aunque ya no queden habiles por delante', () => {
    // Un sabado 31 de octubre: el cierre fue el viernes a las 23:59.
    expect(estadoDelMes('2026-10', sinFeriados, '2026-10-30T12:00:00.000Z').estado).toBe('abierto');
    expect(estadoDelMes('2026-10', sinFeriados, '2026-10-31T12:00:00.000Z').estado).toBe('cerrado');
  });
});

describe('el mes de una fecha', () => {
  it('es su anio y su mes', () => {
    expect(mesDe('2026-09-30')).toBe('2026-09');
  });
});
