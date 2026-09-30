import { describe, expect, it } from 'vitest';
import { barrasDelEquipo, periodosDesplazados } from '../src/barras';
import { SIN_ARRASTRE } from '../src/arrastre';

// Cuanto del cargo esta sin cumplir (CEB-221): una barra por persona con su
// ponderacion arrastrada, partida en un segmento por funcion con arrastre y
// uno de cotidianidad. Lo que desplazo un imprevisto vinculado va rayado
// dentro de su segmento.
const arrastra = (periodos: number) => ({ periodos, desde: '2026-07-31' });
const funcion = (funcionId: string, ponderacion: number, arrastre = SIN_ARRASTRE, desplazados = 0) => ({
  funcionId,
  texto: funcionId,
  ponderacion,
  arrastre,
  desplazados,
});
const persona = (
  nombre: string,
  funciones: ReturnType<typeof funcion>[],
  imprevistos = { esperados: 0, sinCumplir: 0 },
) => ({
  persona: { nombre },
  funciones,
  cotidianidad: 100 - funciones.reduce((t, f) => t + f.ponderacion, 0),
  imprevistos,
});
const suma = (xs: readonly { peso: number }[]) => xs.reduce((t, x) => t + x.peso, 0);

describe('las barras del equipo', () => {
  it('una persona sin nada sin cumplir tiene la barra vacia', () => {
    const [barra] = barrasDelEquipo([persona('ANA', [funcion('cierre', 40)], { esperados: 3, sinCumplir: 0 })]);
    expect(barra).toMatchObject({ total: 0, desplazado: 0, segmentos: [] });
  });

  it('un segmento por funcion con arrastre, de la mas pesada a la mas liviana', () => {
    const [barra] = barrasDelEquipo([
      persona('ANA', [funcion('caja', 10, arrastra(8)), funcion('cierre', 30, arrastra(2)), funcion('informe', 20)]),
    ]);
    expect(barra!.segmentos.map((s) => [s.tipo, s.tipo === 'funcion' ? s.funcionId : null, s.peso])).toEqual([
      ['funcion', 'cierre', 30],
      ['funcion', 'caja', 10],
    ]);
    expect(barra!.total).toBe(40);
  });

  it('una funcion de peso cero con arrastre no ocupa espacio en la barra', () => {
    const [barra] = barrasDelEquipo([persona('ANA', [funcion('seguimiento', 0, arrastra(3))])]);
    expect(barra!.segmentos).toEqual([]);
  });

  it('la cotidianidad sin cumplir es su ponderacion por la fraccion de imprevistos esperados sin cumplir', () => {
    const [barra] = barrasDelEquipo([persona('ANA', [funcion('cierre', 60)], { esperados: 4, sinCumplir: 1 })]);
    expect(barra!.segmentos).toEqual([{ tipo: 'cotidianidad', peso: 10, desplazado: 0 }]);
  });

  it('un mes sin imprevistos esperados no cuenta en contra', () => {
    const [barra] = barrasDelEquipo([persona('ANA', [], { esperados: 0, sinCumplir: 0 })]);
    expect(barra!.total).toBe(0);
  });

  it('lo desplazado es la parte del segmento cuyos periodos se vincularon a un imprevisto', () => {
    const [barra] = barrasDelEquipo([persona('ANA', [funcion('cierre', 30, arrastra(3), 1)])]);
    expect(barra!.segmentos).toEqual([{ tipo: 'funcion', funcionId: 'cierre', texto: 'cierre', peso: 30, desplazado: 10 }]);
    expect(barra!.desplazado).toBe(10);
  });

  it('lo desplazado nunca excede su segmento', () => {
    const [barra] = barrasDelEquipo([persona('ANA', [funcion('cierre', 30, arrastra(2), 5)])]);
    expect(barra!.segmentos[0]!.desplazado).toBe(30);
  });

  it('los segmentos suman la ponderacion arrastrada, y nunca mas de cien aunque todo este sin cumplir', () => {
    const [barra] = barrasDelEquipo([
      persona('ANA', [funcion('cierre', 50, arrastra(1), 1), funcion('caja', 40, arrastra(20), 3)], { esperados: 7, sinCumplir: 7 }),
    ]);
    expect(suma(barra!.segmentos)).toBe(barra!.total);
    expect(barra!.total).toBe(100);
    for (const s of barra!.segmentos) expect(s.desplazado).toBeLessThanOrEqual(s.peso);
  });

  it('las personas van de mayor a menor ponderacion arrastrada, y a igual peso por nombre', () => {
    const barras = barrasDelEquipo([
      persona('BENITO', [funcion('b', 10, arrastra(1))]),
      persona('ANA', [funcion('a', 30, arrastra(1))]),
      persona('CARLA', [funcion('c', 10, arrastra(4))]),
      persona('DORA', []),
    ]);
    expect(barras.map((b) => b.persona.nombre)).toEqual(['ANA', 'BENITO', 'CARLA', 'DORA']);
  });
});

describe('los periodos desplazados de un arrastre', () => {
  const ocurrencias = [
    { periodo: '2026-06', vence: '2026-06-30' },
    { periodo: '2026-07', vence: '2026-07-31' },
    { periodo: '2026-08', vence: '2026-08-31' },
    { periodo: '2026-09', vence: '2026-09-30' },
  ];

  it('cuenta los periodos del arrastre con un "no pude" vinculado a un imprevisto', () => {
    const arrastre = { periodos: 2, desde: '2026-07-31' };
    expect(periodosDesplazados(ocurrencias, arrastre, new Set(['2026-06', '2026-07', '2026-08']), '2026-09-15')).toBe(2);
  });

  it('un vinculo fuera del arrastre, o sin arrastre, no desplaza nada', () => {
    expect(periodosDesplazados(ocurrencias, { periodos: 1, desde: '2026-08-31' }, new Set(['2026-06']), '2026-09-15')).toBe(0);
    expect(periodosDesplazados(ocurrencias, SIN_ARRASTRE, new Set(['2026-08']), '2026-09-15')).toBe(0);
  });
});
