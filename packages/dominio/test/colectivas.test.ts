import { describe, expect, it } from 'vitest';
import { Calendario } from '../src/calendario';
import { ocurrenciasEntre } from '../src/ocurrencias';

// Las colectivas de JFS: cuatro semanas seguidas sin un solo dia habil.
const calendario = Calendario.con([{ desde: '2026-12-21', hasta: '2027-01-18' }]);
const alta = '2026-06-01';

const entre = (periodicidad: 'diaria' | 'semanal' | 'mensual', diaTope?: number) =>
  ocurrenciasEntre({ periodicidad, diaTope, fechaAlta: alta }, calendario, '2026-12-01', '2027-02-10');

describe('un bloque largo de dias no habiles', () => {
  it('un periodo sin ningun dia habil no produce ocurrencia', () => {
    // Esa semana nadie trabajo: no hay nada que entregar ni que marcar.
    const semanas = entre('semanal').map((o) => o.periodo);

    expect(semanas).not.toContain('2026-12-28');
    expect(semanas).not.toContain('2027-01-04');
    expect(semanas).not.toContain('2027-01-11');
  });

  it('el vencimiento nunca se sale del periodo al que pertenece', () => {
    // Adelantarlo al habil anterior lo sacaba a diciembre: pedia el trabajo
    // de enero antes de que enero empezara.
    const enero = entre('mensual', 3).find((o) => o.periodo === '2027-01');

    expect(enero?.vence).toBe('2027-01-19');
  });

  it('si cabe dentro del periodo, se sigue adelantando al habil anterior', () => {
    expect(entre('mensual').find((o) => o.periodo === '2026-12')?.vence).toBe('2026-12-18');
  });

  it('las diarias se detienen en el bloque y vuelven al terminar', () => {
    const dias = entre('diaria').map((o) => o.vence);

    expect(dias).toContain('2026-12-18');
    expect(dias).toContain('2027-01-19');
    expect(dias.filter((d) => d >= '2026-12-21' && d <= '2027-01-18')).toEqual([]);
  });
});
