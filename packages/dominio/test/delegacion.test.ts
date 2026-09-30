import { describe, expect, it } from 'vitest';
import { delegable, estaAbierta, estadoDeLaDelegacion } from '../src/delegacion';

// Una delegacion es un imprevisto de quien la recibe, vinculado a una
// ocurrencia de su supervisor, que sigue siendo suya (ADR 0012).
const delegacion = (d: Partial<Parameters<typeof estadoDeLaDelegacion>[0]> = {}) => ({
  resultado: null,
  devueltoEn: null,
  borradoEn: null,
  ...d,
});

describe('el estado de una delegacion', () => {
  it('sin marca de quien la recibe, espera', () => {
    expect(estadoDeLaDelegacion(delegacion(), false)).toBe('esperando');
  });

  it('un "hecho" espera la revision del supervisor', () => {
    expect(estadoDeLaDelegacion(delegacion({ resultado: 'hecho' }), false)).toBe('para_revisar');
  });

  it('un "no pude" tambien lo mira el supervisor: tiene que decidir que hace', () => {
    expect(estadoDeLaDelegacion(delegacion({ resultado: 'no_pude' }), false)).toBe('no_pudo');
  });

  it('"no lo tome" la devuelve a su plan', () => {
    expect(estadoDeLaDelegacion(delegacion({ resultado: 'no_lo_tome' }), false)).toBe('no_tomada');
  });

  it('cuando el supervisor marca su ocurrencia, queda aprobada', () => {
    expect(estadoDeLaDelegacion(delegacion({ resultado: 'hecho' }), true)).toBe('aprobada');
  });

  it('devuelta manda sobre todo lo demas', () => {
    expect(estadoDeLaDelegacion(delegacion({ resultado: 'hecho', devueltoEn: '2026-09-29T10:00:00Z' }), false)).toBe(
      'devuelta',
    );
  });

  it('solo esperando y para revisar la mantienen abierta', () => {
    expect(estaAbierta(delegacion(), false)).toBe(true);
    expect(estaAbierta(delegacion({ resultado: 'hecho' }), false)).toBe(true);
    expect(estaAbierta(delegacion({ resultado: 'no_pude' }), false)).toBe(false);
    expect(estaAbierta(delegacion({ resultado: 'no_lo_tome' }), false)).toBe(false);
    expect(estaAbierta(delegacion({ resultado: 'hecho', devueltoEn: '2026-09-29T10:00:00Z' }), false)).toBe(false);
    expect(estaAbierta(delegacion({ borradoEn: '2026-09-29T10:00:00Z' }), false)).toBe(false);
  });
});

describe('que ocurrencia se puede delegar', () => {
  const HOY = '2026-09-29';

  it('una que todavia no vence y no esta delegada', () => {
    expect(delegable({ vence: '2026-10-09' }, HOY, [], false)).toEqual({ si: true });
  });

  it('la que vence hoy todavia se puede', () => {
    expect(delegable({ vence: HOY }, HOY, [], false)).toEqual({ si: true });
  });

  it('una vencida no: ya se dejo pasar', () => {
    expect(delegable({ vence: '2026-09-28' }, HOY, [], false)).toEqual({ si: false, porque: 'vencida' });
  });

  it('una ya marcada no', () => {
    expect(delegable({ vence: '2026-10-09' }, HOY, [], true)).toEqual({ si: false, porque: 'marcada' });
  });

  it('una con una delegacion abierta no; con una cerrada, si', () => {
    expect(delegable({ vence: '2026-10-09' }, HOY, [delegacion({ resultado: 'hecho' })], false)).toEqual({
      si: false,
      porque: 'ya_delegada',
    });
    expect(delegable({ vence: '2026-10-09' }, HOY, [delegacion({ resultado: 'no_lo_tome' })], false)).toEqual({ si: true });
  });
});
