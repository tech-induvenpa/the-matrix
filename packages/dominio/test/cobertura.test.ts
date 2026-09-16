import { describe, expect, it } from 'vitest';
import { Calendario } from '../src/calendario';
import { coberturaDe, HORIZONTE } from '../src/cobertura';

const calendario = Calendario.con([{ desde: '2026-09-08', hasta: '2026-09-08' }]);
const hoy = '2026-09-16';

describe('cobertura del calendario', () => {
  it('avisa con margen antes de quedarse sin dias no habiles cargados', () => {
    expect(coberturaDe(calendario, hoy, '2026-12-10').estado).toBe('ok');
    expect(coberturaDe(calendario, hoy, '2026-11-18').estado).toBe('aviso_60');
    expect(coberturaDe(calendario, hoy, '2026-10-21').estado).toBe('aviso_30');
  });

  it('por debajo del horizonte no alcanza ni para el ciclo mas largo', () => {
    const cobertura = coberturaDe(calendario, hoy, '2026-09-30');
    expect(cobertura.estado).toBe('sin_cobertura');
    expect(cobertura.calculaHasta).toBe('2026-09-30');
  });

  it('el horizonte es un mes de dias habiles, que es el ciclo mas largo', () => {
    expect(HORIZONTE).toBe(22);
  });

  it('cuenta los feriados cargados como dias que no cubren nada', () => {
    const conFeriado = Calendario.con([{ desde: '2026-09-21', hasta: '2026-09-25' }]);
    const sinFeriado = Calendario.con([]);
    expect(coberturaDe(conFeriado, hoy, '2026-11-18').habilesRestantes).toBe(
      coberturaDe(sinFeriado, hoy, '2026-11-18').habilesRestantes - 5,
    );
  });
});
