import { describe, expect, it } from 'vitest';
import { Calendario } from '../src/calendario';
import { atrasosDelFlujo, diasHabilesDelMes, hechosDeEntregable, hechosDeHolgura } from '../src/descarga';
import { ocurrenciasEntre } from '../src/ocurrencias';
import { conceptoDe, nominaDe, partesDelMes, type FuncionDeLaNomina, type ImprevistoDeLaNomina } from '../src/nomina';

// La nomina: cuanto del bono le corresponde a una persona en un mes, con su
// fundamento (ADR 0016). Se lee como un estado de cuenta.
const calendario = Calendario.con([]);
const PASADO = '2026-10-15'; // septiembre ya termino

const cierreDeCaja = (marcas: { periodo: string; resultado: string }[] = []): FuncionDeLaNomina => ({
  funcionId: 'caja',
  nombre: 'Cierre de caja',
  tipo: 'entregable',
  ponderacion: 40,
  periodicidad: 'semanal',
  fechaAlta: '2026-01-01',
  marcas,
  eventos: [],
});

const conciliacion = (eventos: { estado: 'al_dia' | 'atrasado'; en: string }[] = []): FuncionDeLaNomina => ({
  funcionId: 'conciliacion',
  nombre: 'Conciliación',
  tipo: 'flujo',
  ponderacion: 20,
  periodicidad: 'diaria',
  fechaAlta: '2026-01-01',
  marcas: [],
  eventos,
});

const imprevistos = (hechos: number, noPude: number): ImprevistoDeLaNomina[] => [
  ...Array.from({ length: hechos }, (_, i) => ({ texto: `Hecho ${i}`, vence: '2026-09-10', resultado: 'hecho' as const, borradoEn: null })),
  ...Array.from({ length: noPude }, (_, i) => ({ texto: `No ${i}`, vence: '2026-09-11', resultado: 'no_pude' as const, borradoEn: null })),
];

// Las semanas de septiembre de 2026 que vencen en septiembre: 4, 11, 18 y 25.
const semanas = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21'];
const todasHechas = semanas.map((periodo) => ({ periodo, resultado: 'hecho' }));

const partes = (funciones: FuncionDeLaNomina[], cotidianidad: ImprevistoDeLaNomina[], hoy = PASADO) =>
  partesDelMes({ mes: '2026-09', hoy, calendario, funciones, cotidianidad: 40, imprevistos: cotidianidad });

describe('la nomina de un mes', () => {
  it('con todo cumplido no hay descuentos: el total es el bono', () => {
    const nomina = nominaDe(500, partes([cierreDeCaja(todasHechas), conciliacion()], imprevistos(10, 0)));
    expect(nomina).toEqual({ bono: 500, lineas: [], total: 500 });
  });

  it('el ejemplo de Ana: $500 menos $50, $9,09 y $20 son $420,91', () => {
    const nomina = nominaDe(
      500,
      partes(
        [
          cierreDeCaja([...todasHechas.slice(0, 3), { periodo: semanas[3]!, resultado: 'no_pude' }]),
          conciliacion([
            { estado: 'atrasado', en: '2026-09-10T14:00:00Z' }, // jueves
            { estado: 'al_dia', en: '2026-09-14T09:00:00Z' }, // lunes: jueves y viernes atrasada
          ]),
        ],
        imprevistos(9, 1),
      ),
    )!;

    expect(nomina.lineas.map((l) => [conceptoDe(l), l.descuento])).toEqual([
      ['Cierre de caja (40%): 1 de 4 sin cumplir', 50],
      ['Conciliación (20%): 2 de 22 días hábiles con atraso', 9.09],
      ['Cotidianidad (40%): 1 de 10 imprevistos sin cumplir', 20],
    ]);
    expect(nomina.total).toBe(420.91);
  });

  it('un entregable vencido sin marcar cuenta como no cumplido, y uno que aun no vence no cuenta', () => {
    // A mitad de septiembre: solo vencieron las semanas del 4 y del 11.
    const nomina = nominaDe(500, partes([cierreDeCaja([{ periodo: semanas[0]!, resultado: 'hecho' }])], [], '2026-09-15'))!;
    expect(nomina.lineas.map((l) => [l.parte, l.sinCumplir, l.veces, l.descuento])).toEqual([['Cierre de caja', 1, 2, 100]]);
  });

  it('un flujo descuenta sus dias habiles atrasados sobre los del mes entero', () => {
    const nomina = nominaDe(1000, partes([conciliacion([{ estado: 'atrasado', en: '2026-09-28T10:00:00Z' }])], []))!;
    // lunes 28, martes 29, miercoles 30: tres de veintidos.
    expect(nomina.lineas).toEqual([{ parte: 'Conciliación', tipo: 'flujo', ponderacion: 20, sinCumplir: 3, veces: 22, descuento: 27.27 }]);
    expect(nomina.total).toBe(972.73);
  });

  it('la cotidianidad descuenta lo que no se hizo de lo que se esperaba; "no lo tome" es neutro', () => {
    const conRechazo = [...imprevistos(3, 1), { texto: 'Rechazado', vence: '2026-09-12', resultado: 'no_lo_tome' as const, borradoEn: null }];
    const nomina = nominaDe(800, partes([], conRechazo))!;
    expect(nomina.lineas).toEqual([
      { parte: 'Cotidianidad', tipo: 'cotidianidad', ponderacion: 40, sinCumplir: 1, veces: 4, descuento: 80 },
    ]);
  });

  it('un mes sin imprevistos esperados no descuenta cotidianidad', () => {
    const nomina = nominaDe(500, partes([], []))!;
    expect(nomina.lineas).toEqual([]);
    expect(nomina.total).toBe(500);
  });

  it('sin bono ese mes no hay nomina', () => {
    expect(nominaDe(null, partes([cierreDeCaja()], imprevistos(1, 1)))).toBeNull();
  });

  it('alta a mitad de mes: lo que empieza a contar despues no le descuenta nada', () => {
    const nueva = { ...cierreDeCaja(), periodicidad: 'mensual' as const, fechaAlta: '2026-09-15' };
    expect(nominaDe(500, partes([nueva], []))!.lineas).toEqual([]);
  });

  it('una funcion de peso cero no descuenta aunque no se cumpla', () => {
    const sinPeso = { ...cierreDeCaja(), ponderacion: 0 };
    expect(nominaDe(500, partes([sinPeso], []))!.lineas).toEqual([]);
  });

  it('el total siempre cuadra al centavo: es el bono menos los descuentos ya redondeados', () => {
    for (const bono of [333.33, 777.77, 1234.56, 99.99, 500]) {
      for (let atrasados = 1; atrasados <= 21; atrasados += 4) {
        const nomina = nominaDe(bono, [
          { parte: 'A', tipo: 'entregable', ponderacion: 37, sinCumplir: 1, veces: 3 },
          { parte: 'B', tipo: 'flujo', ponderacion: 23, sinCumplir: atrasados, veces: 22 },
          { parte: 'Cotidianidad', tipo: 'cotidianidad', ponderacion: 40, sinCumplir: 2, veces: 7 },
        ])!;
        const centavos = (d: number) => Math.round(d * 100);
        expect(centavos(nomina.total)).toBe(centavos(bono) - nomina.lineas.reduce((t, l) => t + centavos(l.descuento), 0));
        for (const l of nomina.lineas) expect(Math.abs(l.descuento * 100 - centavos(l.descuento))).toBeLessThan(1e-9);
      }
    }
  });

  // La nomina y la descarga salen de los mismos hechos y nunca se contradicen:
  // cada descuento es la suma del MONTO NO CUMPLIDO de sus filas, redondeada.
  it('cada descuento coincide con la suma de sus filas en la descarga', () => {
    const bono = 777.77;
    const tramo = { desde: '2026-09-01', hasta: '2026-09-30' };
    const caja = cierreDeCaja([{ periodo: semanas[0]!, resultado: 'no_pude' }, { periodo: semanas[1]!, resultado: 'hecho' }]);
    const flujo = conciliacion([{ estado: 'atrasado', en: '2026-09-03T10:00:00Z' }, { estado: 'al_dia', en: '2026-09-09T10:00:00Z' }]);
    const suyos = imprevistos(5, 2);
    const nomina = nominaDe(bono, partes([caja, flujo], suyos))!;

    // Las filas como las escribe la ruta de la descarga: =K/L*(1-I) y =M*N/100.
    const ocurrencias = ocurrenciasEntre({ periodicidad: 'semanal', fechaAlta: caja.fechaAlta }, calendario, tramo.desde, tramo.hasta);
    const filasCaja = hechosDeEntregable(ocurrencias, caja.marcas).map((h) => ((40 / ocurrencias.length) * (1 - h.cumplio) * bono) / 100);
    const veces = diasHabilesDelMes(tramo, calendario);
    const filasFlujo = atrasosDelFlujo(flujo.eventos, tramo, calendario).map((a) => ((20 / veces) * a.dias * bono) / 100);
    const holgura = hechosDeHolgura(suyos, tramo, PASADO);
    const filasCotidianidad = holgura.filas.map((h) => (h.cumplio === null ? 0 : ((40 / holgura.veces) * (1 - h.cumplio) * bono) / 100));
    const suma = (filas: number[]) => Math.round(filas.reduce((t, f) => t + f, 0) * 100) / 100;

    expect(nomina.lineas.map((l) => l.descuento)).toEqual([suma(filasCaja), suma(filasFlujo), suma(filasCotidianidad)]);
  });
});
