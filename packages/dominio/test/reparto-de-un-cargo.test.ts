import { describe, expect, it } from 'vitest';
import { cotidianidadDe, PISO_DE_COTIDIANIDAD, reescalarA, reescalarACien, sePuedePublicar, sumaDe } from '../src/reparto-de-un-cargo';

const pesos = (...n: number[]) => n.map((ponderacion, i) => ({ funcionId: `f-${i}`, ponderacion }));

// La cotidianidad es el resto del cargo, nunca menos del piso (ADR 0014): las
// funciones de una persona suman a lo sumo noventa.
describe('publicar el reparto de un cargo', () => {
  it('noventa en funciones se publica: la cotidianidad queda en el piso', () => {
    expect(sePuedePublicar(pesos(40, 50))).toEqual({ publicable: true });
    expect(cotidianidadDe(pesos(40, 50))).toBe(10);
  });

  it('menos de noventa tambien: el resto es cotidianidad', () => {
    expect(sePuedePublicar(pesos(25, 25))).toEqual({ publicable: true });
    expect(cotidianidadDe(pesos(25, 25))).toBe(50);
  });

  it('mas de noventa no, y dice cuanto sobra', () => {
    expect(sePuedePublicar(pesos(50, 45))).toEqual({ publicable: false, motivo: 'bajo_el_piso', suma: 95, sobra: 5 });
  });

  it('un cargo sin funciones se publica: es todo cotidianidad', () => {
    expect(sePuedePublicar([])).toEqual({ publicable: true });
    expect(cotidianidadDe([])).toBe(100);
  });

  it('un peso negativo o mayor que noventa no es un peso', () => {
    expect(sePuedePublicar(pesos(-10, 50))).toEqual({ publicable: false, motivo: 'peso_imposible' });
    expect(sePuedePublicar([{ funcionId: 'f', ponderacion: 33.3 }])).toEqual({
      publicable: false,
      motivo: 'peso_imposible',
    });
  });

  it('un cero no estorba: es seguimiento sin peso', () => {
    expect(sePuedePublicar(pesos(60, 30, 0))).toEqual({ publicable: true });
  });

  it('el piso es diez', () => {
    expect(PISO_DE_COTIDIANIDAD).toBe(10);
  });
});

describe('cuando una funcion se va del cargo', () => {
  it('las demas conservan su proporcion, no su numero', () => {
    // 10 y 30 de un total de 40: una pesa el triple que la otra, y lo sigue
    // pesando despues.
    expect(reescalarACien(pesos(10, 30))).toEqual(pesos(25, 75));
  });

  it('un reparto que ya suma cien no se toca', () => {
    expect(reescalarACien(pesos(25, 25, 50))).toEqual(pesos(25, 25, 50));
  });

  it('el redondeo se cobra en la que mas pesa, y el total siempre da cien', () => {
    const escalado = reescalarACien(pesos(10, 10, 10));
    expect(sumaDe(escalado)).toBe(100);
    expect(escalado.map((p) => p.ponderacion).sort((a, b) => a - b)).toEqual([33, 33, 34]);
  });

  it('un cargo entero en cero no se puede reescalar: no hay proporcion que conservar', () => {
    expect(reescalarACien(pesos(0, 0))).toEqual(pesos(0, 0));
  });

  // Cuando llega una funcion de fuera, las de casa tienen que dejarle sitio.
  it('hacer sitio para una funcion nueva conserva las proporciones de las demas', () => {
    // 60 y 40 tienen que caber en 75: siguen siendo tres a dos.
    expect(reescalarA(pesos(60, 40), 75)).toEqual(pesos(45, 30));
  });

  it('un cargo entero cede su sitio si hace falta', () => {
    expect(reescalarA(pesos(100), 40)).toEqual(pesos(40));
  });

  it('sin funciones no hay nada que reescalar', () => {
    expect(reescalarA([], 80)).toEqual([]);
  });
});
