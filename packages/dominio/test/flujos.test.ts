import { describe, expect, it } from 'vitest';
import { estadosVigentes } from '../src/flujos';

describe('estado de un flujo', () => {
  it('es siempre el ultimo evento, y los anteriores no se borran', () => {
    const eventos = [
      { funcionId: 'cxp', estado: 'atrasado' as const, razon: 'Espero a Rosibel', en: '2026-09-14T10:00:00Z' },
      { funcionId: 'cxp', estado: 'al_dia' as const, en: '2026-09-16T09:00:00Z' },
      { funcionId: 'pagos', estado: 'atrasado' as const, razon: 'Falta el cálculo', en: '2026-09-15T08:00:00Z' },
    ];

    expect(estadosVigentes(eventos)).toEqual([
      { funcionId: 'cxp', estado: 'al_dia', en: '2026-09-16T09:00:00Z' },
      { funcionId: 'pagos', estado: 'atrasado', razon: 'Falta el cálculo', en: '2026-09-15T08:00:00Z' },
    ]);
  });

  it('un flujo sin eventos esta al dia: el estado normal es callado', () => {
    expect(estadosVigentes([])).toEqual([]);
  });
});
