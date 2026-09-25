import { describe, expect, it } from 'vitest';
import { Calendario } from '../src/calendario';
import { estadoDe, retrasoDe, vencimientoDe } from '../src/imprevistos';

const sinFeriados = Calendario.con([]);

describe('el vencimiento de un imprevisto', () => {
  // 2026-09-25 es viernes.
  it('pedido un viernes para manana vence el lunes', () => {
    expect(vencimientoDe('2026-09-25', 'manana', sinFeriados)).toBe('2026-09-28');
  });

  it('para hoy, un dia habil, vence ese mismo dia', () => {
    expect(vencimientoDe('2026-09-24', 'hoy', sinFeriados)).toBe('2026-09-24');
  });

  it('la vispera de un feriado, manana salta el feriado', () => {
    const conFeriado = Calendario.con([{ desde: '2026-10-12', hasta: '2026-10-12' }]);
    // 2026-10-09 es viernes y el lunes 12 es feriado.
    expect(vencimientoDe('2026-10-09', 'manana', conFeriado)).toBe('2026-10-13');
  });

  it('pedido un sabado, hoy y manana son el lunes: nunca pasa del habil siguiente', () => {
    expect(vencimientoDe('2026-09-26', 'hoy', sinFeriados)).toBe('2026-09-28');
    expect(vencimientoDe('2026-09-26', 'manana', sinFeriados)).toBe('2026-09-28');
  });
});

describe('el retraso de un imprevisto', () => {
  it('antes de vencer no tiene retraso', () => {
    expect(retrasoDe('2026-09-28', '2026-09-25', sinFeriados)).toBe(0);
  });

  it('se cuenta en dias habiles desde que vencio', () => {
    // Vencio el viernes 25; el martes 29 lleva dos habiles de retraso.
    expect(retrasoDe('2026-09-25', '2026-09-29', sinFeriados)).toBe(2);
  });
});

describe('el estado de un imprevisto', () => {
  const base = { vence: '2026-09-25', resultado: null, borradoEn: null };

  it('sin marca y antes de vencer esta abierto', () => {
    expect(estadoDe(base, '2026-09-25')).toBe('abierto');
  });

  it('sin marca y despues de vencer sigue abierto, pero vencido', () => {
    expect(estadoDe(base, '2026-09-28')).toBe('vencido');
  });

  it('con marca esta marcado, venza cuando venza', () => {
    expect(estadoDe({ ...base, resultado: 'no_lo_tome' }, '2026-10-30')).toBe('marcado');
  });

  it('borrado gana a todo lo demas', () => {
    expect(estadoDe({ ...base, borradoEn: '2026-09-25T10:00:00Z' }, '2026-09-28')).toBe('borrado');
  });
});
