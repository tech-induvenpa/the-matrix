import type { Calendario, Fecha } from './calendario';
import type { Resultado } from './imprevistos';

// La descarga es el hecho suelto: una fila por cada vez que algo debia hacerse
// (ADR 0011). Aqui se decide que filas salen y que paso en cada una; la ruta
// solo las escribe, y las cuentas van como formulas en la hoja.

export type Tramo = { desde: Fecha; hasta: Fecha };

const diaAnterior = (f: Fecha): Fecha => {
  const d = new Date(`${f}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

// Dias habiles de `desde` a `hasta`, los dos incluidos.
const habilesDe = (desde: Fecha, hasta: Fecha, calendario: Calendario) =>
  hasta < desde ? 0 : calendario.habilesEntre(diaAnterior(desde), hasta);

// Las veces que un flujo debia estar al dia en un mes: sus dias habiles.
export const diasHabilesDelMes = (mes: Tramo, calendario: Calendario) => habilesDe(mes.desde, mes.hasta, calendario);

// Un flujo se da por cumplido salvo lo que se declare. Cada episodio va desde
// el dia en que se declaro atrasado hasta el dia antes de ponerse al dia; si
// sigue abierto, hasta el final del tramo. Se recorta al tramo, asi que uno
// que cruza de mes sale en los dos, cada uno con sus dias. Declarar atrasado
// dos veces seguidas no abre un segundo episodio, pero su razon es la vigente.
export function atrasosDelFlujo(
  eventos: readonly { estado: 'al_dia' | 'atrasado'; en: string; razon?: string | null }[],
  tramo: Tramo,
  calendario: Calendario,
): { desde: Fecha; dias: number; razon?: string }[] {
  const ordenados = [...eventos].sort((a, b) => a.en.localeCompare(b.en));
  const episodios: { inicio: Fecha; fin: Fecha | null; razon?: string }[] = [];

  for (const e of ordenados) {
    const dia = e.en.slice(0, 10);
    const abierto = episodios.at(-1);
    if (e.estado === 'atrasado' && (!abierto || abierto.fin !== null)) episodios.push({ inicio: dia, fin: null });
    if (e.estado === 'atrasado' && e.razon) episodios.at(-1)!.razon = e.razon;
    if (e.estado === 'al_dia' && abierto && abierto.fin === null) abierto.fin = dia;
  }

  return episodios
    .map(({ inicio, fin, razon }) => {
      const desde = inicio > tramo.desde ? inicio : tramo.desde;
      // El dia en que se puso al dia ya no cuenta.
      const hasta = fin === null ? tramo.hasta : diaAnterior(fin) < tramo.hasta ? diaAnterior(fin) : tramo.hasta;
      return { desde, dias: habilesDe(desde, hasta, calendario), razon };
    })
    .filter((e) => e.dias > 0);
}

export type HechoDeLaHolgura = {
  que: string;
  vence: Fecha;
  resultado: Resultado | 'devuelto' | 'sin_marcar';
  // null en "no lo tome": es neutro, ni cumple ni deja de cumplir.
  cumplio: 0 | 1 | null;
  // Tal cual la escribieron (CEB-218); vacia en lo hecho y en lo vencido sin marcar.
  razon: string;
};

// Una fila por imprevisto que vencio en el tramo. "No lo tome" sale, pero es
// neutro y no cuenta en las veces; un abierto que todavia no vence no sale,
// porque aun no se le puede pedir. Los borrados no existen.
export function hechosDeHolgura(
  imprevistos: readonly {
    texto: string;
    vence: Fecha;
    resultado: Resultado | null;
    razon?: string | null;
    borradoEn: string | null;
    devueltoEn?: string | null;
    devueltoRazon?: string | null;
  }[],
  tramo: Tramo,
  hoy: Fecha,
): { filas: HechoDeLaHolgura[]; veces: number } {
  const filas = imprevistos
    .filter((i) => !i.borradoEn && i.vence >= tramo.desde && i.vence <= tramo.hasta)
    .filter((i) => i.resultado || hoy > i.vence)
    .sort((a, b) => a.vence.localeCompare(b.vence))
    .map((i): HechoDeLaHolgura => ({
      que: i.texto,
      vence: i.vence,
      // Un "hecho" devuelto por el supervisor no cumple (ADR 0012).
      resultado: i.devueltoEn ? 'devuelto' : (i.resultado ?? 'sin_marcar'),
      cumplio: i.devueltoEn ? 0 : i.resultado === 'no_lo_tome' ? null : i.resultado === 'hecho' ? 1 : 0,
      // Devuelto, la razon es la de quien lo devolvio: el "hecho" no tenia.
      razon: (i.devueltoEn ? i.devueltoRazon : i.resultado === 'hecho' ? null : i.razon) ?? '',
    }));

  return { filas, veces: filas.filter((f) => f.cumplio !== null).length };
}

// Una fila por ocurrencia vencida de un entregable. Solo "hecho" cumple: un
// "no pude" libera el lugar en el plan, pero cuenta en contra.
export function hechosDeEntregable(
  ocurrencias: readonly { periodo: string; vence: Fecha }[],
  marcas: readonly { periodo: string; resultado: string; razon?: string | null }[],
): { que: string; vence: Fecha; resultado: 'hecho' | 'no_pude' | 'sin_marcar'; cumplio: 0 | 1; razon: string }[] {
  const marcaDe = new Map(marcas.map((m) => [m.periodo, m]));
  return ocurrencias.map((o) => {
    const m = marcaDe.get(o.periodo);
    const resultado = m?.resultado === 'hecho' ? 'hecho' : m?.resultado === 'no_pude' ? 'no_pude' : 'sin_marcar';
    return {
      que: o.periodo,
      vence: o.vence,
      resultado,
      cumplio: resultado === 'hecho' ? 1 : 0,
      razon: (resultado === 'no_pude' && m?.razon) || '',
    };
  });
}
