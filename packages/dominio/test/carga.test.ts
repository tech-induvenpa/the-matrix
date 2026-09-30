import { describe, expect, it } from 'vitest';
import { cargaDeImprevistos } from '../src/carga';

// Cuanto le cae a alguien para su tamano (CEB-223): sus imprevistos abiertos
// por cada 10% de su cotidianidad. Veinte no son lo mismo con cotidianidad
// noventa que con diez (ADR 0015).
const HOY = '2026-09-15';
const abierto = (vence: string, extra: { resultado?: 'hecho' | 'no_pude' | 'no_lo_tome'; borradoEn?: string } = {}) => ({
  vence,
  resultado: extra.resultado ?? null,
  borradoEn: extra.borradoEn ?? null,
});
const veinte = Array.from({ length: 20 }, () => abierto('2026-09-20'));

describe('la carga de imprevistos', () => {
  it('las mismas veinte tareas: 2,2 por cada 10% con cotidianidad noventa, y 20 con diez', () => {
    expect(cargaDeImprevistos(veinte, 90, HOY).total).toBeCloseTo(2.22, 2);
    expect(cargaDeImprevistos(veinte, 10, HOY).total).toBe(20);
  });

  it('se parte en en plazo y vencidos', () => {
    const carga = cargaDeImprevistos([abierto('2026-09-15'), abierto('2026-09-30'), abierto('2026-09-14'), abierto('2026-09-01')], 20, HOY);
    expect(carga).toEqual({ enPlazo: 1, vencidos: 1, total: 2 });
  });

  it('un imprevisto borrado no cuenta', () => {
    expect(cargaDeImprevistos([abierto('2026-09-20', { borradoEn: '2026-09-10T10:00:00Z' })], 10, HOY).total).toBe(0);
  });

  it('un imprevisto marcado no cuenta: ya no esta abierto', () => {
    expect(cargaDeImprevistos([abierto('2026-09-20', { resultado: 'hecho' }), abierto('2026-09-01', { resultado: 'no_pude' })], 10, HOY).total).toBe(0);
  });
});
