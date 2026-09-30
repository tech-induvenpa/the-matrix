import { describe, expect, it } from 'vitest';
import { Calendario } from '../src/calendario';
import {
  cuadranteDelImprevisto,
  cuandoSePidio,
  estadoDe,
  opcionesDeUrgencia,
  ordenarImprevistos,
  retrasoDe,
  vencimientoPorUrgencia,
} from '../src/imprevistos';
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

  // En un dia no habil se cuenta desde el habil siguiente (CEB-193): un
  // sabado, "hoy" es el lunes y "manana" el martes.
  it('pedido un sabado, 9 es el lunes y 8 el martes', () => {
    expect(vencimientoPorUrgencia('2026-09-26', 9, sinFeriados)).toBe('2026-09-28');
    expect(vencimientoPorUrgencia('2026-09-26', 8, sinFeriados)).toBe('2026-09-29');
  });

  it('la urgencia que se elige es la que la pantalla muestra ese dia, tambien en un dia no habil', () => {
    const conFeriado = Calendario.con([{ desde: '2026-10-12', hasta: '2026-10-16' }]);
    // Jueves, viernes, sabado, domingo, y un lunes que es feriado.
    for (const pedido of ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-10-09', '2026-10-12']) {
      for (let u = 0; u <= 9; u++) {
        const vence = vencimientoPorUrgencia(pedido, u, conFeriado);
        expect(urgenciaDe(conFeriado.habilesHasta(pedido, vence)), `${pedido}, urgencia ${u}`).toBe(u);
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

describe('el cuadrante de un imprevisto (CEB-242)', () => {
  // 2026-09-24 es jueves.
  const hoy = '2026-09-24';
  const cuadrante = (importancia: number, vence: string) => cuadranteDelImprevisto(importancia, vence, hoy, sinFeriados);

  it('importante y urgente: hacer ya', () => {
    expect(cuadrante(8, '2026-09-24')).toEqual({ urgencia: 9, importanciaEfectiva: 8, cuadrante: 'hacer' });
  });

  it('poco importante que vence manana: sube a hacer ya, como una funcion mensual', () => {
    expect(cuadrante(1, '2026-09-25')).toEqual({ urgencia: 8, importanciaEfectiva: 5, cuadrante: 'hacer' });
  });

  it('poco importante, urgencia media y mas de tres dias: mantener al dia', () => {
    // Cuatro dias habiles: urgencia 6, todavia sin la subida.
    expect(cuadrante(2, '2026-09-30')).toEqual({ urgencia: 6, importanciaEfectiva: 2, cuadrante: 'mantener' });
  });

  it('urgencia baja: ponle fecha, sea cual sea la importancia', () => {
    expect(cuadrante(9, '2026-10-19').cuadrante).toBe('agendar');
    expect(cuadrante(0, '2026-10-19').cuadrante).toBe('agendar');
  });

  it('vencido sin marca: hacer ya', () => {
    expect(cuadrante(0, '2026-09-21').cuadrante).toBe('hacer');
  });
});

describe('el orden del bloque del empleado (CEB-242)', () => {
  const hoy = '2026-09-24';
  const i = (texto: string, importancia: number, vence: string) => ({ texto, importancia, vence });

  it('por cuadrante, luego mas importancia, luego lo que antes vence', () => {
    const orden = ordenarImprevistos(
      [
        i('mantener', 2, '2026-09-30'),
        i('agendar', 9, '2026-10-19'),
        i('hacer, 6, pasado', 6, '2026-09-28'),
        i('hacer, 1, manana', 1, '2026-09-25'),
        i('hacer, 6, hoy', 6, '2026-09-24'),
        i('hacer, 9', 9, '2026-09-28'),
      ],
      hoy,
      sinFeriados,
    );
    expect(orden.map((x) => x.texto)).toEqual([
      'hacer, 9',
      'hacer, 6, hoy',
      'hacer, 6, pasado',
      'hacer, 1, manana',
      'agendar',
      'mantener',
    ]);
  });
});
