import type { Calendario, Fecha } from './calendario';

// Un imprevisto es trabajo que llega sin estar en el reparto de nadie (ADR
// 0009). Vence hoy o el dia habil siguiente a cuando se pidio, sin otra
// opcion: lo que se necesita para el viernes no es un imprevisto, se planifica.
export type Plazo = 'hoy' | 'manana';

const diaSiguiente = (f: Fecha): Fecha => {
  const d = new Date(`${f}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export function vencimientoDe(pedido: Fecha, plazo: Plazo, calendario: Calendario): Fecha {
  return plazo === 'hoy' ? calendario.habilSiguiente(pedido) : calendario.habilSiguiente(diaSiguiente(pedido));
}

// No arrastra, porque no tiene serie: cuenta su retraso en dias habiles.
export const retrasoDe = (vence: Fecha, hoy: Fecha, calendario: Calendario): number =>
  hoy > vence ? calendario.habilesEntre(vence, hoy) : 0;

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
  abiertos: number;
  vencidos: number;
  retrasoPromedio: number;
};

type Contable = { vence: Fecha; resultado: Resultado | null; marcadaEn: string | null; borradoEn: string | null };

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
      cifras: { llegados: 0, hechos: 0, noPude: 0, noLoTome: 0, abiertos: 0, vencidos: 0, retrasoPromedio: 0 },
      retrasos: [],
    };
    grupos.set(k, g);

    g.cifras.llegados++;
    if (i.resultado === 'hecho') g.cifras.hechos++;
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
  imprevistos: readonly { vence: Fecha; resultado: Resultado | null; borradoEn: string | null }[],
  tramo: { desde: Fecha; hasta: Fecha },
  hoy: Fecha,
): { esperados: number; hechos: number; sinCumplir: number } {
  let hechos = 0;
  let sinCumplir = 0;

  for (const i of imprevistos) {
    if (i.borradoEn || i.vence < tramo.desde || i.vence > tramo.hasta) continue;
    if (i.resultado === 'hecho') hechos++;
    else if (i.resultado === 'no_pude' || (!i.resultado && hoy > i.vence)) sinCumplir++;
  }

  return { esperados: hechos + sinCumplir, hechos, sinCumplir };
}
