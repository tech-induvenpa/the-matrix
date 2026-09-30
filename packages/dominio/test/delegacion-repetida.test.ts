import { describe, expect, it } from 'vitest';
import { delegacionRepetida, MINIMO_DE_DELEGACIONES, VENTANA_DE_DELEGACION } from '../src/delegacion';

// Una delegacion que se repite es un traspaso que nadie ha hecho (CEB-224).
// Cuanto se repite se mide en proporcion de las ocurrencias de la funcion en
// los ultimos noventa dias, nunca en veces: contar veces pondria siempre las
// diarias arriba.
const HOY = '2026-09-30';

// Veintidos dias habiles de septiembre, y los tres cierres mensuales del trimestre.
const diasDeSeptiembre = Array.from({ length: 30 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`)
  .filter((d) => ![0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay()))
  .map((d) => ({ periodo: d, vence: d }));
const meses = ['2026-07', '2026-08', '2026-09'].map((m) => ({ periodo: m, vence: `${m}-28` }));

const delegacion = (funcionId: string, periodo: string, extra: { pedidoEn?: string; devueltoEn?: string; borradoEn?: string } = {}) => ({
  funcionId,
  periodo,
  pedidoEn: extra.pedidoEn ?? `${periodo.slice(0, 7)}-05T10:00:00Z`,
  devueltoEn: extra.devueltoEn ?? null,
  borradoEn: extra.borradoEn ?? null,
});

const caja = { funcionId: 'caja', texto: 'Caja diaria', supervisor: 'SARA', ocurrencias: diasDeSeptiembre };
const cierre = { funcionId: 'cierre', texto: 'Cierre mensual', supervisor: 'SARA', ocurrencias: meses };

describe('las funciones mas delegadas', () => {
  it('la ventana es de noventa dias y el minimo, dos delegaciones: son del dominio', () => {
    expect(VENTANA_DE_DELEGACION).toBe(90);
    expect(MINIMO_DE_DELEGACIONES).toBe(2);
  });

  it('la diaria delegada ocho veces (36%) queda debajo de la mensual delegada en todas sus ocurrencias (100%)', () => {
    const repetidas = delegacionRepetida(
      [caja, cierre],
      [
        ...diasDeSeptiembre.slice(0, 8).map((o) => delegacion('caja', o.periodo)),
        ...meses.map((m) => delegacion('cierre', m.periodo)),
      ],
      HOY,
    );
    expect(repetidas.map((r) => [r.funcionId, r.delegadas, Math.round(r.proporcion * 100)])).toEqual([
      ['cierre', 3, 100],
      ['caja', 8, 36],
    ]);
    expect(repetidas[0]!.supervisor).toBe('SARA');
  });

  it('una sola delegacion no es repetirse: la mensual delegada una de una no aparece', () => {
    const repetidas = delegacionRepetida([cierre], [delegacion('cierre', '2026-09')], HOY);
    expect(repetidas).toEqual([]);
  });

  it('lo delegado hace mas de noventa dias no cuenta', () => {
    const repetidas = delegacionRepetida(
      [cierre],
      [delegacion('cierre', '2026-05', { pedidoEn: '2026-05-10T10:00:00Z' }), delegacion('cierre', '2026-09')],
      HOY,
    );
    expect(repetidas).toEqual([]);
  });

  it('lo devuelto se cuenta aparte; volver a delegar la misma ocurrencia no la cuenta dos veces', () => {
    const [r] = delegacionRepetida(
      [cierre],
      [delegacion('cierre', '2026-09', { devueltoEn: '2026-09-20T10:00:00Z' }), delegacion('cierre', '2026-09', { pedidoEn: '2026-09-20T10:00:00Z' })],
      HOY,
    );
    expect(r).toMatchObject({ delegadas: 2, devueltas: 1 });
    expect(r!.proporcion).toBeCloseTo(1 / 3);
    expect(r!.proporcionDevuelta).toBeCloseTo(1 / 6);
  });

  it('una delegacion borrada no cuenta', () => {
    const repetidas = delegacionRepetida(
      [cierre],
      [delegacion('cierre', '2026-08', { borradoEn: '2026-08-02T10:00:00Z' }), delegacion('cierre', '2026-09')],
      HOY,
    );
    expect(repetidas).toEqual([]);
  });
});
