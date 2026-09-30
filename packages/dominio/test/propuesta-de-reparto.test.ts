import { describe, expect, it } from 'vitest';
import { proponerReparto } from '../src/propuesta-de-reparto';

// Una sola regla para todo lo que mueve un peso (ADR 0014): lo que entra o sale
// se compensa en proporcion entre todo el resto, cotidianidad incluida; si la
// cotidianidad cae bajo el piso, queda en el piso y lo que falta sale de las
// funciones.
const f = (funcionId: string, ponderacion: number) => ({ funcionId, ponderacion });
const pesoDe = (r: { despues: { funcionId: string; ponderacion: number }[] }, id: string) =>
  r.despues.find((p) => p.funcionId === id)?.ponderacion;

describe('proponer un reparto', () => {
  it('una funcion que entra se lleva su peso de todo, cotidianidad incluida', () => {
    // Cierre 50, Conciliacion 30, cotidianidad 20; entra Arqueo con 15: el
    // resto, 85, se reparte en proporcion.
    const r = proponerReparto([f('cierre', 50), f('conciliacion', 30)], { entra: f('arqueo', 15) });
    // 42,5 y 25,5 se redondean a 43 y 26; el punto que sobra lo devuelve la que mas pesa.
    expect(r.despues).toEqual([f('cierre', 42), f('conciliacion', 26), f('arqueo', 15)]);
    expect(r.cotidianidad).toEqual({ antes: 20, despues: 17 });
    expect(r.enElPiso).toBe(false);
  });

  it('si la cotidianidad cae bajo el piso, queda en diez y lo que falta sale de las funciones', () => {
    // Cierre 60, Conciliacion 28, cotidianidad 12; entra algo con 20. Lo
    // proporcional la dejaria en 9,6: queda en 10, y 60 a 28 se reparten 70.
    const r = proponerReparto([f('cierre', 60), f('conciliacion', 28)], { entra: f('nueva', 20) });
    expect(r.cotidianidad).toEqual({ antes: 12, despues: 10 });
    expect(r.enElPiso).toBe(true);
    expect(pesoDe(r, 'cierre')).toBe(48);
    expect(pesoDe(r, 'conciliacion')).toBe(22);
    expect(pesoDe(r, 'nueva')).toBe(20);
  });

  it('una persona sin funciones: la primera sale toda de la cotidianidad', () => {
    const r = proponerReparto([], { entra: f('primera', 40) });
    expect(r.despues).toEqual([f('primera', 40)]);
    expect(r.cotidianidad).toEqual({ antes: 100, despues: 60 });
  });

  it('una funcion de noventa deja todo lo demas en cero y la cotidianidad en el piso', () => {
    const r = proponerReparto([f('a', 30), f('b', 30)], { entra: f('grande', 90) });
    expect(r.cotidianidad.despues).toBe(10);
    expect(pesoDe(r, 'a')).toBe(0);
    expect(pesoDe(r, 'b')).toBe(0);
  });

  it('cambiar el peso de una funcion reacomoda a las demas y a la cotidianidad', () => {
    // Cierre baja de 50 a 20: lo que suelta, 30, vuelve en proporcion.
    const r = proponerReparto([f('cierre', 50), f('conciliacion', 30)], { cambia: f('cierre', 20) });
    expect(pesoDe(r, 'cierre')).toBe(20);
    expect(pesoDe(r, 'conciliacion')).toBe(48);
    expect(r.cotidianidad).toEqual({ antes: 20, despues: 32 });
  });

  it('una funcion que sale devuelve su peso en proporcion, cotidianidad incluida', () => {
    const r = proponerReparto([f('cierre', 50), f('conciliacion', 30)], { sale: 'cierre' });
    expect(r.despues).toEqual([f('conciliacion', 60)]);
    expect(r.cotidianidad).toEqual({ antes: 20, despues: 40 });
  });

  it('si solo quedaba esa funcion, todo vuelve a la cotidianidad', () => {
    const r = proponerReparto([f('unica', 70)], { sale: 'unica' });
    expect(r.despues).toEqual([]);
    expect(r.cotidianidad).toEqual({ antes: 30, despues: 100 });
  });

  it('siempre cierra en cien, con el redondeo en la parte que mas pesa', () => {
    for (const r of [
      proponerReparto([f('a', 33), f('b', 33), f('c', 23)], { entra: f('d', 7) }),
      proponerReparto([f('a', 17), f('b', 29), f('c', 31)], { cambia: f('b', 11) }),
      proponerReparto([f('a', 17), f('b', 29), f('c', 31)], { sale: 'c' }),
    ]) {
      expect(r.despues.reduce((t, p) => t + p.ponderacion, 0) + r.cotidianidad.despues).toBe(100);
      expect(r.cotidianidad.despues).toBeGreaterThanOrEqual(10);
    }
  });

  it('un reparto que ya venia bajo el piso queda en el piso', () => {
    // Datos de antes de la cotidianidad: funciones que sumaban cien.
    const r = proponerReparto([f('a', 50), f('b', 50)], { cambia: f('a', 50) });
    expect(r.cotidianidad.despues).toBe(10);
    expect(r.despues.reduce((t, p) => t + p.ponderacion, 0)).toBe(90);
  });
});
