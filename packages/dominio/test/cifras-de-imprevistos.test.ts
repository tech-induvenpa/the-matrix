import { describe, expect, it } from 'vitest';
import { Calendario } from '../src/calendario';
import { cifrasPor } from '../src/imprevistos';

const calendario = Calendario.con([]);
const HOY = '2026-09-29'; // martes

type Fila = {
  empleado: string;
  vence: string;
  resultado: 'hecho' | 'no_pude' | 'no_lo_tome' | null;
  marcadaEn: string | null;
  borradoEn: string | null;
};

const fila = (f: Partial<Fila>): Fila => ({
  empleado: 'ana', vence: '2026-09-29', resultado: null, marcadaEn: null, borradoEn: null, ...f,
});

describe('las cifras de imprevistos', () => {
  it('cuenta cuantos llegaron y como se marcaron', () => {
    const cifras = cifrasPor(
      [
        fila({ resultado: 'hecho', marcadaEn: '2026-09-29T10:00:00Z' }),
        fila({ resultado: 'no_pude', marcadaEn: '2026-09-29T10:00:00Z' }),
        fila({ resultado: 'no_lo_tome', marcadaEn: '2026-09-29T10:00:00Z' }),
        fila({}),
      ],
      (i) => i.empleado,
      HOY,
      calendario,
    ).get('ana');

    expect(cifras).toMatchObject({ llegados: 4, hechos: 1, noPude: 1, noLoTome: 1, abiertos: 1 });
  });

  it('los borrados no cuentan en nada', () => {
    const cifras = cifrasPor([fila({ borradoEn: '2026-09-29T10:00:00Z' })], (i) => i.empleado, HOY, calendario);
    expect(cifras.get('ana')).toBeUndefined();
  });

  it('un abierto que ya vencio cuenta como vencido', () => {
    const cifras = cifrasPor([fila({ vence: '2026-09-25' })], (i) => i.empleado, HOY, calendario).get('ana');
    expect(cifras).toMatchObject({ abiertos: 1, vencidos: 1 });
  });

  // El retraso promedio es de los que se atrasaron: promediar con los que se
  // hicieron a tiempo esconderia justo lo que se quiere ver.
  it('el retraso promedio sale de los que se atrasaron, abiertos o marcados tarde', () => {
    const cifras = cifrasPor(
      [
        fila({ vence: '2026-09-25' }), // abierto, viernes -> martes: 2 habiles
        fila({ vence: '2026-09-24', resultado: 'hecho', marcadaEn: '2026-09-28T09:00:00Z' }), // jueves -> lunes: 2
        fila({ vence: '2026-09-29', resultado: 'hecho', marcadaEn: '2026-09-29T09:00:00Z' }), // a tiempo
      ],
      (i) => i.empleado,
      HOY,
      calendario,
    ).get('ana');

    expect(cifras?.retrasoPromedio).toBe(2);
  });

  it('sin atrasos, el retraso promedio es cero', () => {
    const cifras = cifrasPor([fila({})], (i) => i.empleado, HOY, calendario).get('ana');
    expect(cifras?.retrasoPromedio).toBe(0);
  });

  it('se agrupa por lo que se le pida: persona o quien lo pidio', () => {
    const cifras = cifrasPor(
      [fila({ empleado: 'ana' }), fila({ empleado: 'benito' }), fila({ empleado: 'benito' })],
      (i) => i.empleado,
      HOY,
      calendario,
    );
    expect(cifras.get('benito')?.llegados).toBe(2);
    expect(cifras.get('ana')?.llegados).toBe(1);
  });
});
