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
