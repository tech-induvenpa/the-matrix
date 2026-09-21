import { describe, expect, it } from 'vitest';
import { reescalarA, reescalarACien, sePuedePublicar, sumaDe } from '../src/reparto-de-un-cargo';

const pesos = (...n: number[]) => n.map((ponderacion, i) => ({ funcionId: `f-${i}`, ponderacion }));

describe('publicar el reparto de un cargo', () => {
  it('cien exacto se publica', () => {
    expect(sePuedePublicar(pesos(25, 25, 50))).toEqual({ publicable: true });
  });

  it('noventa y nueve no, y dice cuanto falta', () => {
    expect(sePuedePublicar(pesos(25, 25, 49))).toEqual({
      publicable: false,
      motivo: 'no_suma_cien',
      suma: 99,
      falta: 1,
    });
  });

  it('ciento uno tampoco, y lo que falta es negativo: sobra', () => {
    expect(sePuedePublicar(pesos(50, 51))).toEqual({
      publicable: false,
      motivo: 'no_suma_cien',
      suma: 101,
      falta: -1,
    });
  });

  it('un cargo vacio no se publica: nadie trabaja el cero por ciento del tiempo', () => {
    expect(sePuedePublicar([])).toEqual({ publicable: false, motivo: 'cargo_vacio' });
  });

  it('un peso negativo o mayor que cien no es un peso', () => {
    expect(sePuedePublicar(pesos(-10, 110))).toEqual({ publicable: false, motivo: 'peso_imposible' });
    expect(sePuedePublicar([{ funcionId: 'f', ponderacion: 33.3 }])).toEqual({
      publicable: false,
      motivo: 'peso_imposible',
    });
  });

  // Una funcion nueva nace en cero (CEB-131) y el cargo sigue sumando cien:
  // crear trabajo no puede romperle el reparto a nadie.
  it('un cero no estorba mientras el resto sume cien', () => {
    expect(sePuedePublicar(pesos(60, 40, 0))).toEqual({ publicable: true });
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
