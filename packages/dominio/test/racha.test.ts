import { describe, expect, it } from 'vitest';
import { diasSeguidosCerrando } from '../src/racha';

// Un dia sin nada que vencer no rompe la racha ni la alarga: no hubo nada que
// cerrar. Romperla exige haber dejado algo abierto.
describe('días seguidos cerrando lo que vencía', () => {
  it('cuenta hacia atrás mientras cada día quedó cerrado', () => {
    expect(
      diasSeguidosCerrando([
        { fecha: '2026-09-14', total: 2, cerradas: 2 },
        { fecha: '2026-09-15', total: 1, cerradas: 1 },
        { fecha: '2026-09-16', total: 3, cerradas: 3 },
      ]),
    ).toBe(3);
  });

  it('un día con algo abierto corta la cuenta ahí mismo', () => {
    expect(
      diasSeguidosCerrando([
        { fecha: '2026-09-14', total: 2, cerradas: 2 },
        { fecha: '2026-09-15', total: 2, cerradas: 1 },
        { fecha: '2026-09-16', total: 1, cerradas: 1 },
      ]),
    ).toBe(1);
  });

  it('un día sin vencimientos no cuenta, pero tampoco rompe', () => {
    expect(
      diasSeguidosCerrando([
        { fecha: '2026-09-14', total: 1, cerradas: 1 },
        { fecha: '2026-09-15', total: 0, cerradas: 0 },
        { fecha: '2026-09-16', total: 1, cerradas: 1 },
      ]),
    ).toBe(2);
  });

  it('sin nada cerrado no hay racha que presumir', () => {
    expect(diasSeguidosCerrando([])).toBe(0);
    expect(diasSeguidosCerrando([{ fecha: '2026-09-16', total: 2, cerradas: 0 }])).toBe(0);
  });
});
