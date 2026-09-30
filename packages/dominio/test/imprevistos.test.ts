import { describe, expect, it } from 'vitest';
import { Calendario } from '../src/calendario';
import { cuandoSePidio, estadoDe, opcionesDeUrgencia, retrasoDe, vencimientoPorUrgencia } from '../src/imprevistos';
import { urgenciaDe } from '../src/urgencia';

const sinFeriados = Calendario.con([]);

describe('el vencimiento de un imprevisto sale de la urgencia elegida', () => {
  // 2026-09-24 es jueves.
  it('cada urgencia vence en el tope de su tramo, en dias habiles', () => {
    const vence = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((u) => vencimientoPorUrgencia('2026-09-24', u, sinFeriados));
    expect(vence).toEqual([
      '2026-09-24', // 9 · hoy
      '2026-09-25', // 8 · manana
      '2026-09-28', // 7 · 2 habiles, salta el fin de semana
      '2026-09-30', // 6 · 4
      '2026-10-05', // 5 · 7
      '2026-10-07', // 4 · 9
      '2026-10-14', // 3 · 14
      '2026-10-19', // 2 · 17
      '2026-10-23', // 1 · 21
      '2026-11-04', // 0 · 29
    ]);
  });

  it('pedido un viernes, 8 vence el lunes', () => {
    expect(vencimientoPorUrgencia('2026-09-25', 8, sinFeriados)).toBe('2026-09-28');
  });

  it('salta los feriados cargados', () => {
    const conFeriado = Calendario.con([{ desde: '2026-10-12', hasta: '2026-10-12' }]);
    // 2026-10-09 es viernes y el lunes 12 es feriado.
    expect(vencimientoPorUrgencia('2026-10-09', 8, conFeriado)).toBe('2026-10-13');
    expect(vencimientoPorUrgencia('2026-10-09', 7, conFeriado)).toBe('2026-10-14');
  });

  it('mas alla de lo cargado cuenta de lunes a viernes', () => {
    // Nada cargado en 2027: del martes 15 de diciembre, 29 habiles son el 26 de
    // enero. El 25 de diciembre se salta; el 1 de enero, que nadie cargo, cuenta.
    const soloEste = Calendario.con([{ desde: '2026-12-25', hasta: '2026-12-25' }]);
    expect(vencimientoPorUrgencia('2026-12-15', 0, soloEste)).toBe('2027-01-26');
  });

  it('pedido un sabado, 9 y 8 son el lunes', () => {
    expect(vencimientoPorUrgencia('2026-09-26', 9, sinFeriados)).toBe('2026-09-28');
    expect(vencimientoPorUrgencia('2026-09-26', 8, sinFeriados)).toBe('2026-09-28');
  });

  // QA de CEB-193: el criterio pide la ida y vuelta tambien con pedido en
  // sabado, y la 9 falla: un sabado, "hoy" y "manana" son el mismo lunes, y
  // ese dia la 9 se ve como 8. Falla a proposito hasta que se decida (CEB-193);
  // cuando se arregle, este test se pone en rojo y hay que quitarle el .fails.
  it.fails('pedido un sabado, la urgencia que se ve ese dia es la elegida', () => {
    for (let u = 0; u <= 9; u++) {
      const vence = vencimientoPorUrgencia('2026-09-26', u, sinFeriados);
      expect(urgenciaDe(sinFeriados.habilesEntre('2026-09-26', vence)), `urgencia ${u}`).toBe(u);
    }
  });

  it('la urgencia que se elige es la que la pantalla muestra ese dia', () => {
    const conFeriado = Calendario.con([{ desde: '2026-10-12', hasta: '2026-10-16' }]);
    for (const pedido of ['2026-09-24', '2026-09-25', '2026-10-09']) {
      for (let u = 0; u <= 9; u++) {
        const vence = vencimientoPorUrgencia(pedido, u, conFeriado);
        expect(urgenciaDe(conFeriado.habilesEntre(pedido, vence))).toBe(u);
      }
    }
  });
});

describe('las opciones del selector', () => {
  it('son diez, de 9 a 0, con su emoji y su fecha; la 8 es manana', () => {
    const opciones = opcionesDeUrgencia('2026-09-24', sinFeriados);
    expect(opciones.map((o) => o.urgencia)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    expect(opciones.map((o) => o.emoji).join('')).toBe('🔥🔥💣💣🧠🧠🍃🍃🍃🍃');
    expect(opciones[1]).toEqual({ urgencia: 8, emoji: '🔥', vence: '2026-09-25' });
    expect(opciones[9]?.vence).toBe('2026-11-04');
  });
});

describe('cuando se pidio', () => {
  it('hoy, o el dia en UTC', () => {
    expect(cuandoSePidio('2026-09-29T20:21:23.297+00:00', '2026-09-29')).toBe('hoy');
    expect(cuandoSePidio('2026-09-29T20:21:23.297+00:00', '2026-10-02')).toBe('2026-09-29');
    // Las 22 del 29 en Caracas ya son el 30 en UTC.
    expect(cuandoSePidio('2026-09-29T22:00:00-04:00', '2026-10-02')).toBe('2026-09-30');
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
