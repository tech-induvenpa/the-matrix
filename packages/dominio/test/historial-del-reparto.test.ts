import { describe, expect, it } from 'vitest';
import { parteAParte, type PesoDeUnaParte } from '../src/historial-del-reparto';

// El historial del reparto (ADR 0017): cada cambio publicado guarda los pesos
// antes y despues. Aqui se arma como se lee: parte por parte, la cotidianidad
// siempre al final.
const peso = (funcionId: string | null, parte: string, ponderacion: number): PesoDeUnaParte => ({ funcionId, parte, ponderacion });
const cotidianidad = (n: number) => peso(null, 'Cotidianidad', n);

describe('el historial del reparto, parte por parte', () => {
  it('un cambio: cada parte con su antes y su despues, y cuales cambiaron', () => {
    const antes = [peso('caja', 'Caja', 40), peso('pagos', 'Pagos', 20), cotidianidad(40)];
    const despues = [peso('caja', 'Caja', 10), peso('pagos', 'Pagos', 20), cotidianidad(70)];
    expect(parteAParte(antes, despues)).toEqual([
      { funcionId: 'caja', parte: 'Caja', antes: 40, despues: 10, cambio: true },
      { funcionId: 'pagos', parte: 'Pagos', antes: 20, despues: 20, cambio: false },
      { funcionId: null, parte: 'Cotidianidad', antes: 40, despues: 70, cambio: true },
    ]);
  });

  it('un alta, o quien recibe un traspaso: la que entra no tenia peso antes', () => {
    const antes = [peso('caja', 'Caja', 60), cotidianidad(40)];
    const despues = [peso('caja', 'Caja', 45), peso('nueva', 'Nueva', 25), cotidianidad(30)];
    expect(parteAParte(antes, despues).map((p) => [p.parte, p.antes, p.despues])).toEqual([
      ['Caja', 60, 45],
      ['Nueva', null, 25],
      ['Cotidianidad', 40, 30],
    ]);
  });

  it('un archivo, una eliminacion o quien entrega un traspaso: la que sale no tiene despues, y va despues de las que quedan', () => {
    const antes = [peso('caja', 'Caja', 30), peso('pagos', 'Pagos', 60), cotidianidad(10)];
    const despues = [peso('pagos', 'Pagos', 80), cotidianidad(20)];
    expect(parteAParte(antes, despues).map((p) => [p.parte, p.antes, p.despues])).toEqual([
      ['Pagos', 60, 80],
      ['Caja', 30, null],
      ['Cotidianidad', 10, 20],
    ]);
  });

  it('una funcion renombrada se lee con su nombre de despues', () => {
    const antes = [peso('caja', 'Caja', 30), cotidianidad(70)];
    const despues = [peso('caja', 'Cierre de caja', 30), cotidianidad(70)];
    expect(parteAParte(antes, despues)[0]).toMatchObject({ parte: 'Cierre de caja', cambio: false });
  });
});
