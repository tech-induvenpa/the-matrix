import { describe, expect, it } from 'vitest';
import { vinculables } from '../src/intromision';

const imprevisto = (id: string, pedidoEn: string, borradoEn: string | null = null) => ({ id, pedidoEn, borradoEn });

describe('que imprevistos se pueden vincular a un "no pude"', () => {
  const lista = [
    imprevisto('antes', '2026-09-08T15:00:00Z'),
    imprevisto('el-mismo-dia', '2026-09-10T22:00:00Z'),
    imprevisto('despues', '2026-09-11T09:00:00Z'),
  ];

  it('solo los pedidos hasta el vencimiento, ese dia incluido', () => {
    expect(vinculables(lista, { vence: '2026-09-10' }).map((i) => i.id)).toEqual(['antes', 'el-mismo-dia']);
  });

  it('un borrado no se vincula', () => {
    const conBorrado = [imprevisto('borrado', '2026-09-08T15:00:00Z', '2026-09-08T16:00:00Z')];
    expect(vinculables(conBorrado, { vence: '2026-09-10' })).toEqual([]);
  });
});

describe('que imprevistos se pueden vincular a un atraso de flujo', () => {
  const lista = [imprevisto('viejo', '2026-09-01T10:00:00Z'), imprevisto('nuevo', '2026-09-09T10:00:00Z')];

  it('solo los pedidos desde que estuvo al dia por ultima vez', () => {
    expect(vinculables(lista, { alDiaDesde: '2026-09-05T12:00:00Z' }).map((i) => i.id)).toEqual(['nuevo']);
  });

  it('si nunca estuvo al dia, todos', () => {
    expect(vinculables(lista, { alDiaDesde: null }).map((i) => i.id)).toEqual(['viejo', 'nuevo']);
  });
});
