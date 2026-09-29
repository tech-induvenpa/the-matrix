import { describe, expect, it } from 'vitest';
import { Calendario } from '../src/calendario';
import { emojiDe, urgenciaDe } from '../src/urgencia';

const calendario = Calendario.con([{ desde: '2026-09-08', hasta: '2026-09-08' }]);

describe('urgencia calculada', () => {
  it('sale de los dias habiles que faltan, saltando lo que no se trabaja', () => {
    // Del miercoles 2 al jueves 3 hay un dia habil; el feriado del 8 no cuenta.
    expect(calendario.habilesEntre('2026-09-02', '2026-09-03')).toBe(1);
    expect(calendario.habilesEntre('2026-09-02', '2026-09-09')).toBe(4);
  });

  it('convierte esos dias en un numero del 0 al 9', () => {
    expect(urgenciaDe(0)).toBe(9);
    expect(urgenciaDe(1)).toBe(8);
    expect(urgenciaDe(8)).toBe(4);
    expect(urgenciaDe(30)).toBe(0);
  });

  it('el emoji sale de la urgencia: 🔥 9-8, 💣 7-6, 🧠 5-4, 🍃 3-0', () => {
    expect([9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(emojiDe).join('')).toBe('🔥🔥💣💣🧠🧠🍃🍃🍃🍃');
  });
});
