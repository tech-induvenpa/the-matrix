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
