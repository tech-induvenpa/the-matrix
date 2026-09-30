import type { Calendario, Fecha } from './calendario';
import { cuadranteDe, importanciaEfectiva, type Cuadrante } from './cuadrante';
import { emojiDe, MARGEN, urgenciaDe } from './urgencia';

// Un imprevisto es trabajo que se hace una sola vez y no esta en el reparto de
// nadie (ADR 0009). Quien lo anota elige una urgencia de 0 a 9 y se guarda el
// vencimiento que le corresponde, no el numero (ADR 0013): el tope de su tramo
// en dias habiles. Desde ahi sube solo, como cualquier ocurrencia. Se cuenta
// desde el habil siguiente, como la urgencia (Calendario.habilesHasta): un
// sabado, 9 vence el lunes y 8 el martes.
export const vencimientoPorUrgencia = (pedido: Fecha, urgencia: number, calendario: Calendario): Fecha =>
  calendario.sumarHabiles(calendario.habilSiguiente(pedido), MARGEN[urgencia] ?? MARGEN[0]);

export type OpcionDeUrgencia = { urgencia: number; emoji: string; vence: Fecha };

// Las diez opciones del selector, de 9 a 0. La pantalla solo las pinta.
export const opcionesDeUrgencia = (hoy: Fecha, calendario: Calendario): OpcionDeUrgencia[] =>
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((urgencia) => ({
    urgencia,
    emoji: emojiDe(urgencia),
    vence: vencimientoPorUrgencia(hoy, urgencia, calendario),
  }));

// El dia en que se pidio, o 'hoy'. `pedidoEn` es un instante; el dia se toma
// en UTC, igual que `hoy` en el resto de la aplicacion.
export const cuandoSePidio = (pedidoEn: string, hoy: Fecha): Fecha | 'hoy' => {
  const dia = new Date(pedidoEn).toISOString().slice(0, 10);
  return dia === hoy ? 'hoy' : dia;
};

// No arrastra, porque no tiene serie: cuenta su retraso en dias habiles.
export const retrasoDe = (vence: Fecha, hoy: Fecha, calendario: Calendario): number =>
  hoy > vence ? calendario.habilesEntre(vence, hoy) : 0;

// El cuadrante de un imprevisto (CEB-242): la misma regla que el de una
// ocurrencia, con la importancia que le dio quien lo anoto. Se trata como una
// funcion que no es diaria ni semanal: sube a 5 cuando le quedan tres dias
// habiles o menos, y nada cae en el vacio. Sigue en su propio bloque; el
// cuadrante le da el color y el orden, no un lugar en la semana.
export type CuadranteDelImprevisto = { urgencia: number; importanciaEfectiva: number; cuadrante: Cuadrante };

export function cuadranteDelImprevisto(importancia: number, vence: Fecha, hoy: Fecha, calendario: Calendario): CuadranteDelImprevisto {
  const faltan = calendario.habilesHasta(hoy, vence);
  const urgencia = urgenciaDe(faltan);
  const efectiva = importanciaEfectiva(importancia, faltan, 'mensual');
  return { urgencia, importanciaEfectiva: efectiva, cuadrante: cuadranteDe(urgencia, efectiva) };
}

const RANGO: Record<Cuadrante, number> = { hacer: 0, agendar: 1, mantener: 2 };

// El bloque del empleado: por cuadrante (hacer, agendar, mantener), luego lo
// mas importante, luego lo que antes vence. La importancia es la que se
// escribio, no la efectiva: es la que se ve en la tarjeta.
export function ordenarImprevistos<T extends { importancia: number; vence: Fecha }>(
  imprevistos: readonly T[],
  hoy: Fecha,
  calendario: Calendario,
): T[] {
  const rango = new Map(imprevistos.map((i) => [i, RANGO[cuadranteDelImprevisto(i.importancia, i.vence, hoy, calendario).cuadrante]]));
  return [...imprevistos].sort(
    (a, b) => rango.get(a)! - rango.get(b)! || b.importancia - a.importancia || a.vence.localeCompare(b.vence),
  );
}

export type Resultado = 'hecho' | 'no_pude' | 'no_lo_tome';
export type EstadoDeImprevisto = 'abierto' | 'vencido' | 'marcado' | 'borrado';

// Un imprevisto vencido sin marca sigue abierto a la vista: que se acumulen es
// el dato. Borrado no cuenta en ninguna cifra, pero no desaparece de la base.
export function estadoDe(
  i: { vence: Fecha; resultado: Resultado | null; borradoEn: string | null },
  hoy: Fecha,
): EstadoDeImprevisto {
  if (i.borradoEn) return 'borrado';
  if (i.resultado) return 'marcado';
  return hoy > i.vence ? 'vencido' : 'abierto';
}

export type Cifras = {
  llegados: number;
  hechos: number;
  noPude: number;
  noLoTome: number;
  // Un "hecho" que el supervisor devolvio (ADR 0012): no cuenta como hecho.
  devueltos: number;
  abiertos: number;
  vencidos: number;
  retrasoPromedio: number;
};

type Contable = {
  vence: Fecha;
  resultado: Resultado | null;
  marcadaEn: string | null;
  borradoEn: string | null;
  devueltoEn?: string | null;
};

// Cuantos imprevistos le caen a alguien y si los termina (preguntas 1 y 2 de
// CEB-146). Se agrupa por lo que se pida -- persona o quien lo pidio -- porque
// son la misma cuenta vista desde dos lados. "No lo tome" cuenta como llegado:
// rechazar es una respuesta, no un imprevisto que no existio.
export function cifrasPor<T extends Contable>(
  imprevistos: readonly T[],
  clave: (i: T) => string,
  hoy: Fecha,
  calendario: Calendario,
): Map<string, Cifras> {
  const grupos = new Map<string, { cifras: Cifras; retrasos: number[] }>();

  for (const i of imprevistos) {
    if (i.borradoEn) continue;

    const k = clave(i);
    const g = grupos.get(k) ?? {
      cifras: { llegados: 0, hechos: 0, noPude: 0, noLoTome: 0, devueltos: 0, abiertos: 0, vencidos: 0, retrasoPromedio: 0 },
      retrasos: [],
    };
    grupos.set(k, g);

    g.cifras.llegados++;
    if (i.devueltoEn) g.cifras.devueltos++;
    else if (i.resultado === 'hecho') g.cifras.hechos++;
    if (i.resultado === 'no_pude') g.cifras.noPude++;
    if (i.resultado === 'no_lo_tome') g.cifras.noLoTome++;
    if (!i.resultado) g.cifras.abiertos++;
    if (!i.resultado && hoy > i.vence) g.cifras.vencidos++;

    // Un rechazo no se atrasa: dijo que no a tiempo o no, pero no quedo colgado.
    if (i.resultado !== 'no_lo_tome') {
      const hasta = i.marcadaEn ? i.marcadaEn.slice(0, 10) : hoy;
      const retraso = retrasoDe(i.vence, hasta, calendario);
      if (retraso > 0) g.retrasos.push(retraso);
    }
  }

  return new Map(
    [...grupos].map(([k, { cifras, retrasos }]) => [
      k,
      { ...cifras, retrasoPromedio: retrasos.length ? retrasos.reduce((t, r) => t + r, 0) / retrasos.length : 0 },
    ]),
  );
}

// La holgura se cumple con los imprevistos de su titular (CEB-158): es por
// donde pesa lo no planificado. Hechos sobre los que se esperaba hacer.
// "No lo tome" es neutro -- rechazar a tiempo no es fallar, y si contara en
// contra la gente aceptaria todo --, y un abierto que aun no vence tampoco
// cuenta: todavia no se le puede pedir. Se toman los que vencen en el tramo.
export function cumplimientoDeLaHolgura(
  imprevistos: readonly { vence: Fecha; resultado: Resultado | null; borradoEn: string | null; devueltoEn?: string | null }[],
  tramo: { desde: Fecha; hasta: Fecha },
  hoy: Fecha,
): { esperados: number; hechos: number; sinCumplir: number } {
  let hechos = 0;
  let sinCumplir = 0;

  for (const i of imprevistos) {
    if (i.borradoEn || i.vence < tramo.desde || i.vence > tramo.hasta) continue;
    // Un "hecho" devuelto cuenta como un "no pude" (ADR 0012).
    if (i.resultado === 'hecho' && !i.devueltoEn) hechos++;
    else if (i.devueltoEn || i.resultado === 'no_pude' || (!i.resultado && hoy > i.vence)) sinCumplir++;
  }

  return { esperados: hechos + sinCumplir, hechos, sinCumplir };
}
