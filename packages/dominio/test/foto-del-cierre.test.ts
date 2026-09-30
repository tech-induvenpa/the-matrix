import { describe, expect, it } from 'vitest';
import { Calendario } from '../src/calendario';
import { fotoDelCierre, nominaDeLaFoto } from '../src/foto-del-cierre';
import { nominaDe, partesDelMes, tareasDelMes, type FuncionDeLaNomina, type ImprevistoDeLaNomina } from '../src/nomina';

// La foto del cierre (ADR 0017): la nomina de cada persona tal como quedo al
// cierre del mes. Lo que se guarda y lo que se lee de vuelta tienen que ser la
// misma nomina, al centavo, sin recalcular nada.
const calendario = Calendario.con([]);

const caja: FuncionDeLaNomina = {
  funcionId: 'caja',
  nombre: 'Cierre de caja',
  tipo: 'entregable',
  ponderacion: 40,
  periodicidad: 'semanal',
  fechaAlta: '2026-01-01',
  // Una de cuatro semanas sin cumplir.
  marcas: [
    { periodo: '2026-08-31', resultado: 'hecho' },
    { periodo: '2026-09-07', resultado: 'hecho' },
    { periodo: '2026-09-14', resultado: 'hecho' },
    { periodo: '2026-09-21', resultado: 'no_pude' },
  ],
  eventos: [],
};

const pagos: FuncionDeLaNomina = { ...caja, funcionId: 'pagos', nombre: 'Pagos', ponderacion: 10, periodicidad: 'mensual', marcas: [{ periodo: '2026-09', resultado: 'hecho' }] };

const conciliacion: FuncionDeLaNomina = {
  funcionId: 'conciliacion',
  nombre: 'Conciliación',
  tipo: 'flujo',
  ponderacion: 20,
  periodicidad: 'diaria',
  fechaAlta: '2026-01-01',
  marcas: [],
  eventos: [
    { estado: 'atrasado', en: '2026-09-10T14:00:00Z' },
    { estado: 'al_dia', en: '2026-09-14T09:00:00Z' },
  ],
};

const imprevistos: ImprevistoDeLaNomina[] = [
  ...Array.from({ length: 9 }, (_, i) => ({ texto: `Hecho ${i}`, vence: '2026-09-10', resultado: 'hecho' as const, borradoEn: null })),
  { texto: 'No', vence: '2026-09-11', resultado: 'no_pude', borradoEn: null },
];

const partes = partesDelMes({ mes: '2026-09', hoy: '2026-10-15', calendario, funciones: [caja, pagos, conciliacion], cotidianidad: 30, imprevistos });

// Lo que viaja a la base y vuelve: la foto pasa por JSON.
const guardadaYLeida = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe('la foto del cierre', () => {
  it('guarda cada parte con su peso, lo que no se cumplio y su descuento; y el total y la empresa', () => {
    const foto = fotoDelCierre({ empresaId: 'toyota', bono: 500, partes });

    expect(foto.empresaId).toBe('toyota');
    expect(foto.bono).toBe(500);
    expect(foto.total).toBe(nominaDe(500, partes)!.total);
    expect(foto.partes.map((p) => [p.funcionId ?? null, p.parte, p.ponderacion, p.sinCumplir, p.veces, p.descuento])).toEqual([
      ['caja', 'Cierre de caja', 40, 1, 4, 50],
      ['conciliacion', 'Conciliación', 20, 2, 22, 9.09],
      ['pagos', 'Pagos', 10, 0, 1, 0],
      [null, 'Cotidianidad', 30, 1, 10, 15],
    ]);
  });

  it('leida de vuelta es la misma nomina, al centavo', () => {
    const foto = guardadaYLeida(fotoDelCierre({ empresaId: 'toyota', bono: 777.77, partes }));
    expect(nominaDeLaFoto(foto)).toEqual(nominaDe(777.77, partes));
  });

  it('las tareas del mes salen de la foto igual que en vivo', () => {
    const foto = guardadaYLeida(fotoDelCierre({ empresaId: null, bono: 500, partes }));
    expect(tareasDelMes(foto.partes)).toEqual(tareasDelMes(partes));
  });

  it('sin bono ese mes, la foto guarda las partes pero no hay nomina', () => {
    const foto = guardadaYLeida(fotoDelCierre({ empresaId: 'toyota', bono: null, partes }));
    expect(foto.total).toBeNull();
    expect(foto.partes).toHaveLength(4);
    expect(foto.partes.every((p) => p.descuento === 0)).toBe(true);
    expect(nominaDeLaFoto(foto)).toBeNull();
  });

  it('la foto no se recalcula: lo que dice su descuento es lo que se lee', () => {
    const foto = guardadaYLeida(fotoDelCierre({ empresaId: null, bono: 500, partes }));
    // Si despues cambiara la cuenta, lo pagado sigue siendo lo que dice la foto.
    const tocada = { ...foto, partes: foto.partes.map((p) => (p.parte === 'Cierre de caja' ? { ...p, ponderacion: 5 } : p)) };
    expect(nominaDeLaFoto(tocada)!.lineas.find((l) => l.parte === 'Cierre de caja')!.descuento).toBe(50);
    expect(nominaDeLaFoto(tocada)!.total).toBe(foto.total);
  });
});
