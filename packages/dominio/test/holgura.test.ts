import { describe, expect, it } from 'vitest';
import { cumplimientoDeLaHolgura } from '../src/imprevistos';

// La holgura se cumple con los imprevistos de su titular (CEB-158): hechos
// sobre los que se esperaba hacer. "No lo tome" es neutro.
const SEPTIEMBRE = { desde: '2026-09-01', hasta: '2026-09-30' };
const HOY = '2026-10-05';

type Fila = { vence: string; resultado: 'hecho' | 'no_pude' | 'no_lo_tome' | null; borradoEn: string | null };
const fila = (f: Partial<Fila>): Fila => ({ vence: '2026-09-15', resultado: null, borradoEn: null, ...f });

describe('el cumplimiento de la holgura', () => {
  it('el ejemplo de Ana: 5 hechos, 1 no pude, 1 rechazado, 1 abierto vencido es 5 de 7', () => {
    const imprevistos = [
      ...Array.from({ length: 5 }, () => fila({ resultado: 'hecho' })),
      fila({ resultado: 'no_pude' }),
      fila({ resultado: 'no_lo_tome' }),
      fila({}),
    ];

    expect(cumplimientoDeLaHolgura(imprevistos, SEPTIEMBRE, HOY)).toEqual({ esperados: 7, hechos: 5, sinCumplir: 2 });
  });

  it('rechazar no mueve nada: ni a favor ni en contra', () => {
    const conRechazo = [fila({ resultado: 'hecho' }), fila({ resultado: 'no_lo_tome' }), fila({ resultado: 'no_lo_tome' })];
    expect(cumplimientoDeLaHolgura(conRechazo, SEPTIEMBRE, HOY)).toEqual({ esperados: 1, hechos: 1, sinCumplir: 0 });
  });

  it('un abierto que todavia no vence no cuenta; el dia que vence tampoco', () => {
    const abiertos = [fila({ vence: '2026-09-30' })];
    expect(cumplimientoDeLaHolgura(abiertos, SEPTIEMBRE, '2026-09-30')).toEqual({ esperados: 0, hechos: 0, sinCumplir: 0 });
    expect(cumplimientoDeLaHolgura(abiertos, SEPTIEMBRE, '2026-10-01')).toEqual({ esperados: 1, hechos: 0, sinCumplir: 1 });
  });

  it('los borrados y los que vencen fuera del mes no cuentan', () => {
    const otros = [fila({ borradoEn: '2026-09-15T10:00:00Z' }), fila({ vence: '2026-08-31', resultado: 'no_pude' })];
    expect(cumplimientoDeLaHolgura(otros, SEPTIEMBRE, HOY)).toEqual({ esperados: 0, hechos: 0, sinCumplir: 0 });
  });
});
