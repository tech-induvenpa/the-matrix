import { beforeAll, describe, expect, it } from 'vitest';
import { Calendario, ocurrenciasEntre } from '@matriz/dominio';
import { comoServicio } from './entorno';

// INV-7 · Nada vence en un dia no habil. Con el calendario que JFS carga de
// verdad, incluido el bloque de vacaciones colectivas, no con uno inventado.
describe('INV-7: ningun vencimiento cae en dia no habil', () => {
  let calendario: Calendario;
  let rangos: { desde: string; hasta: string }[];

  beforeAll(async () => {
    const { data } = await comoServicio().from('dia_no_habil').select('desde, hasta');
    rangos = data ?? [];
    calendario = Calendario.con(rangos);
  });

  it('el calendario cargado incluye el bloque de colectivas', () => {
    expect(rangos.some((r) => r.desde !== r.hasta)).toBe(true);
  });

  it('ninguna ocurrencia de ninguna periodicidad vence en un dia no habil', () => {
    for (const periodicidad of ['diaria', 'semanal', 'quincenal', 'mensual', 'trimestral'] as const) {
      const ocurrencias = ocurrenciasEntre(
        { periodicidad, diaTope: periodicidad === 'mensual' ? 3 : undefined, fechaAlta: '2026-06-01' },
        calendario,
        '2026-09-01',
        '2027-12-31',
      );

      expect(ocurrencias.length).toBeGreaterThan(0);
      for (const o of ocurrencias) expect(calendario.esHabil(o.vence)).toBe(true);
    }
  });

  it('un dia tope que cae dentro de las colectivas no arrastra el vencimiento fuera de su mes', () => {
    const enero = ocurrenciasEntre(
      { periodicidad: 'mensual', diaTope: 3, fechaAlta: '2026-06-01' },
      calendario,
      '2026-12-01',
      '2027-02-28',
    ).find((o) => o.periodo === '2027-01');

    expect(enero?.vence.startsWith('2027-01')).toBe(true);
  });
});
