import { describe, expect, it } from 'vitest';
import { cerradasDelMes } from '../src/cerradas';

// Las cerradas del mes (CEB-220): de las ocurrencias e imprevistos de una
// persona, los marcados en el mes en curso, sin borrados. Es donde se lee cada
// razon en su contexto.
const ocurrencia = (texto: string, marcadaEn: string) => ({ texto, marcadaEn });
const imprevisto = (texto: string, marcadaEn: string | null, borradoEn: string | null = null) => ({ texto, marcadaEn, borradoEn });

describe('las cerradas del mes', () => {
  it('el primer dia del mes todavia no hay ninguna: lo del mes pasado no entra', () => {
    const cerradas = cerradasDelMes(
      [ocurrencia('Cierre de agosto', '2026-08-31T20:00:00Z')],
      [imprevisto('Informe', '2026-08-28T15:00:00Z')],
      '2026-09-01',
    );
    expect(cerradas).toEqual([]);
  });

  it('ocurrencias e imprevistos marcados este mes entran juntos, lo mas reciente arriba', () => {
    const cerradas = cerradasDelMes(
      [ocurrencia('Cierre', '2026-09-10T15:00:00Z'), ocurrencia('Conciliacion', '2026-09-20T15:00:00Z')],
      [imprevisto('Llamar al banco', '2026-09-15T12:00:00Z')],
      '2026-09-30',
    );
    expect(cerradas.map((c) => [c.tipo, c.tarea.texto])).toEqual([
      ['ocurrencia', 'Conciliacion'],
      ['imprevisto', 'Llamar al banco'],
      ['ocurrencia', 'Cierre'],
    ]);
  });

  it('lo marcado el mes pasado no entra, aunque haya vencido este', () => {
    const cerradas = cerradasDelMes([ocurrencia('Cierre', '2026-08-31T23:00:00Z')], [], '2026-09-15');
    expect(cerradas).toEqual([]);
  });

  it('un imprevisto borrado no entra, y uno abierto tampoco', () => {
    const cerradas = cerradasDelMes(
      [],
      [imprevisto('Error', '2026-09-10T10:00:00Z', '2026-09-11T10:00:00Z'), imprevisto('Abierto', null), imprevisto('Hecho', '2026-09-12T10:00:00Z')],
      '2026-09-30',
    );
    expect(cerradas.map((c) => c.tarea.texto)).toEqual(['Hecho']);
  });
});
