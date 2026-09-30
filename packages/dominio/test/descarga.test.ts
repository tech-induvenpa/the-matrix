import { describe, expect, it } from 'vitest';
import { Calendario } from '../src/calendario';
import { atrasosDelFlujo, diasHabilesDelMes, hechosDeEntregable, hechosDeHolgura } from '../src/descarga';

// La descarga es el hecho suelto: una fila por cada vez que algo debia hacerse
// (ADR 0011).
const calendario = Calendario.con([]);
const SEPTIEMBRE = { desde: '2026-09-01', hasta: '2026-09-30' };

describe('los atrasos de un flujo', () => {
  // Se da por cumplido salvo lo que se declare: cuenta desde el dia en que se
  // declaro atrasado hasta el dia antes de ponerse al dia, en dias habiles.
  it('un episodio cuenta los dias habiles entre el atraso y el al dia', () => {
    const eventos = [
      { estado: 'atrasado' as const, en: '2026-09-10T14:00:00Z' }, // jueves
      { estado: 'al_dia' as const, en: '2026-09-15T09:00:00Z' }, // martes
    ];
    // jueves 10, viernes 11, lunes 14: tres dias habiles.
    expect(atrasosDelFlujo(eventos, SEPTIEMBRE, calendario)).toEqual([{ desde: '2026-09-10', dias: 3 }]);
  });

  it('uno que sigue abierto cuenta hasta el final del tramo', () => {
    const eventos = [{ estado: 'atrasado' as const, en: '2026-09-28T10:00:00Z' }]; // lunes
    const hastaHoy = { desde: '2026-09-01', hasta: '2026-09-29' };
    expect(atrasosDelFlujo(eventos, hastaHoy, calendario)).toEqual([{ desde: '2026-09-28', dias: 2 }]);
  });

  it('uno que cruza de mes se parte: cada mes con sus dias', () => {
    const eventos = [
      { estado: 'atrasado' as const, en: '2026-08-27T10:00:00Z' }, // jueves
      { estado: 'al_dia' as const, en: '2026-09-03T10:00:00Z' }, // jueves
    ];
    const agosto = { desde: '2026-08-01', hasta: '2026-08-31' };
    expect(atrasosDelFlujo(eventos, agosto, calendario)).toEqual([{ desde: '2026-08-27', dias: 3 }]);
    expect(atrasosDelFlujo(eventos, SEPTIEMBRE, calendario)).toEqual([{ desde: '2026-09-01', dias: 2 }]);
  });

  it('declararse atrasado dos veces seguidas no abre dos episodios', () => {
    const eventos = [
      { estado: 'atrasado' as const, en: '2026-09-10T10:00:00Z' },
      { estado: 'atrasado' as const, en: '2026-09-11T10:00:00Z' },
      { estado: 'al_dia' as const, en: '2026-09-14T10:00:00Z' },
    ];
    expect(atrasosDelFlujo(eventos, SEPTIEMBRE, calendario)).toEqual([{ desde: '2026-09-10', dias: 2 }]);
  });

  it('ponerse al dia el mismo dia no cuesta nada', () => {
    const eventos = [
      { estado: 'atrasado' as const, en: '2026-09-10T09:00:00Z' },
      { estado: 'al_dia' as const, en: '2026-09-10T17:00:00Z' },
    ];
    expect(atrasosDelFlujo(eventos, SEPTIEMBRE, calendario)).toEqual([]);
  });

  it('las veces de un flujo en un mes son sus dias habiles', () => {
    expect(diasHabilesDelMes(SEPTIEMBRE, calendario)).toBe(22);
  });
});

describe('los hechos de la holgura', () => {
  const HOY = '2026-09-29';
  const imprevisto = (texto: string, vence: string, resultado: 'hecho' | 'no_pude' | 'no_lo_tome' | null, borradoEn: string | null = null) =>
    ({ texto, vence, resultado, borradoEn });

  it('una fila por imprevisto; "no lo tome" sale, pero neutro y fuera de las veces', () => {
    const { filas, veces } = hechosDeHolgura(
      [
        imprevisto('Informe', '2026-09-10', 'hecho'),
        imprevisto('Factura', '2026-09-11', 'no_pude'),
        imprevisto('Auditor', '2026-09-12', 'no_lo_tome'),
        imprevisto('Olvidado', '2026-09-14', null),
      ],
      SEPTIEMBRE,
      HOY,
    );
    expect(filas.map((f) => [f.que, f.cumplio])).toEqual([
      ['Informe', 1],
      ['Factura', 0],
      ['Auditor', null],
      ['Olvidado', 0],
    ]);
    expect(veces).toBe(3);
  });

  it('un "hecho" devuelto sale como devuelto y no cumple', () => {
    const { filas, veces } = hechosDeHolgura(
      [{ texto: 'Cierre', vence: '2026-09-10', resultado: 'hecho', borradoEn: null, devueltoEn: '2026-09-10T15:00:00Z' }],
      SEPTIEMBRE,
      HOY,
    );
    expect(filas.map((f) => [f.resultado, f.cumplio])).toEqual([['devuelto', 0]]);
    expect(veces).toBe(1);
  });

  it('un abierto que todavia no vence y un borrado no salen', () => {
    const { filas } = hechosDeHolgura(
      [imprevisto('Para mañana', '2026-09-30', null), imprevisto('Error', '2026-09-10', null, '2026-09-10T10:00:00Z')],
      SEPTIEMBRE,
      HOY,
    );
    expect(filas).toEqual([]);
  });
});

describe('los hechos de un entregable', () => {
  it('solo "hecho" cumple: un "no pude" cuenta en contra', () => {
    const hechos = hechosDeEntregable(
      [
        { periodo: '2026-09-07', vence: '2026-09-11' },
        { periodo: '2026-09-14', vence: '2026-09-18' },
        { periodo: '2026-09-21', vence: '2026-09-25' },
      ],
      [
        { periodo: '2026-09-07', resultado: 'hecho' },
        { periodo: '2026-09-14', resultado: 'no_pude' },
      ],
    );
    expect(hechos.map((h) => [h.resultado, h.cumplio])).toEqual([
      ['hecho', 1],
      ['no_pude', 0],
      ['sin_marcar', 0],
    ]);
  });
});

// La columna RAZON (CEB-218): el texto tal cual, para analizarlo fuera del
// sistema. Vacia donde no hubo razon que dar.
describe('la razon de cada fila', () => {
  it('un "no pude" lleva su razon; lo hecho y lo vencido sin marcar van vacios', () => {
    const hechos = hechosDeEntregable(
      [
        { periodo: '2026-09-07', vence: '2026-09-11' },
        { periodo: '2026-09-14', vence: '2026-09-18' },
        { periodo: '2026-09-21', vence: '2026-09-25' },
      ],
      [
        { periodo: '2026-09-07', resultado: 'hecho', razon: null },
        { periodo: '2026-09-14', resultado: 'no_pude', razon: 'sin sistema; volvio el lunes' },
      ],
    );
    expect(hechos.map((h) => h.razon)).toEqual(['', 'sin sistema; volvio el lunes', '']);
  });

  it('en un imprevisto: "no pude", "no lo tome" y la razon de la devolucion', () => {
    const { filas } = hechosDeHolgura(
      [
        { texto: 'Informe', vence: '2026-09-10', resultado: 'hecho', razon: null, borradoEn: null },
        { texto: 'Factura', vence: '2026-09-11', resultado: 'no_pude', razon: 'no llego\nel proveedor', borradoEn: null },
        { texto: 'Auditor', vence: '2026-09-12', resultado: 'no_lo_tome', razon: 'no es mio', borradoEn: null },
        { texto: 'Cierre', vence: '2026-09-13', resultado: 'hecho', razon: null, borradoEn: null, devueltoEn: '2026-09-13T15:00:00Z', devueltoRazon: 'faltan los anexos' },
        { texto: 'Olvidado', vence: '2026-09-14', resultado: null, razon: null, borradoEn: null },
      ],
      SEPTIEMBRE,
      '2026-09-29',
    );
    expect(filas.map((f) => [f.que, f.razon])).toEqual([
      ['Informe', ''],
      ['Factura', 'no llego\nel proveedor'],
      ['Auditor', 'no es mio'],
      ['Cierre', 'faltan los anexos'],
      ['Olvidado', ''],
    ]);
  });

  it('un imprevisto borrado sigue sin salir, aunque tenga razon', () => {
    const { filas } = hechosDeHolgura(
      [{ texto: 'Error', vence: '2026-09-10', resultado: 'no_pude', razon: 'me equivoque', borradoEn: '2026-09-10T10:00:00Z' }],
      SEPTIEMBRE,
      '2026-09-29',
    );
    expect(filas).toEqual([]);
  });

  it('un atraso de flujo lleva la razon vigente de su episodio', () => {
    const eventos = [
      { estado: 'atrasado' as const, en: '2026-09-10T10:00:00Z', razon: 'cola de facturas' },
      { estado: 'atrasado' as const, en: '2026-09-11T10:00:00Z', razon: 'sigue la cola; y falta gente' },
      { estado: 'al_dia' as const, en: '2026-09-14T10:00:00Z' },
      { estado: 'atrasado' as const, en: '2026-09-21T10:00:00Z', razon: 'cierre del mes' },
    ];
    expect(atrasosDelFlujo(eventos, SEPTIEMBRE, calendario).map((a) => a.razon)).toEqual([
      'sigue la cola; y falta gente',
      'cierre del mes',
    ]);
  });
});
