import { describe, expect, it } from 'vitest';
import { Calendario } from '../src/calendario';

// Septiembre de 2026: el martes 8 es feriado de la empresa.
const calendario = Calendario.con([{ desde: '2026-09-08', hasta: '2026-09-08' }]);

describe('dia habil', () => {
  it('excluye fines de semana y los dias que la empresa no trabaja', () => {
    expect(calendario.esHabil('2026-09-07')).toBe(true); // lunes
    expect(calendario.esHabil('2026-09-08')).toBe(false); // feriado
    expect(calendario.esHabil('2026-09-05')).toBe(false); // sabado
    expect(calendario.esHabil('2026-09-06')).toBe(false); // domingo
  });
});

describe('habil anterior', () => {
  it('retrocede hasta el dia habil anterior, y se queda si ya lo es', () => {
    expect(calendario.habilAnterior('2026-10-03')).toBe('2026-10-02'); // sabado -> viernes
    expect(calendario.habilAnterior('2026-09-08')).toBe('2026-09-07'); // feriado -> lunes
    expect(calendario.habilAnterior('2026-09-07')).toBe('2026-09-07'); // ya es habil
  });
});

describe('mirar hacia adelante', () => {
  it('encuentra el primer dia habil desde una fecha, ella incluida', () => {
    const calendario = Calendario.con([{ desde: '2026-12-21', hasta: '2027-01-18' }]);

    expect(calendario.habilSiguiente('2027-01-04')).toBe('2027-01-19');
    expect(calendario.habilSiguiente('2026-12-18')).toBe('2026-12-18');
  });
});
