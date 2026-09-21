import type { Fecha } from './calendario';
import type { Ocurrencia } from './ocurrencias';

// El arrastre: periodos seguidos en que una funcion no se cumplio, por "no
// pude" o por vencer sin marcar (ADR 0008).
//
// Se cuenta en periodos y se muestra en tiempo. "Cuantos meses lleva fallando"
// no se puede contar en meses: una semanal falla cuatro veces en un mes y una
// trimestral no puede fallar mas de una vez por trimestre. La unidad honesta es
// el periodo, que es donde vive la ocurrencia; la fecha es lo que un humano
// necesita para saber si esto ya es grave.

export type Arrastre = { periodos: number; desde: Fecha | null };

export const SIN_ARRASTRE: Arrastre = { periodos: 0, desde: null };

// Solo cuenta lo ya vencido: una ocurrencia que todavia no llega no esta
// incumplida, esta pendiente. Y se cuenta hacia atras desde la mas reciente:
// un incumplimiento de marzo no arrastra si abril se cerro.
export function arrastreDe(
  ocurrencias: readonly Ocurrencia[],
  cerradas: readonly { periodo: string }[],
  hoy: Fecha,
): Arrastre {
  const yaEsta = new Set(cerradas.map((c) => c.periodo));

  const vencidas = ocurrencias.filter((o) => o.vence <= hoy).sort((a, b) => b.vence.localeCompare(a.vence));

  let periodos = 0;
  let desde: Fecha | null = null;

  for (const o of vencidas) {
    if (yaEsta.has(o.periodo)) break;
    periodos += 1;
    desde = o.vence;
  }

  return { periodos, desde };
}

export type FuncionConArrastre = {
  funcionId: string;
  ponderacion: number;
  arrastre: Arrastre;
};

// Cuanto del cargo de una persona esta sin cumplirse ahora mismo. Es lo unico
// comparable entre personas y entre cadencias, y por eso es el orden del
// reporte: contar periodos pondria siempre las diarias arriba, porque acumulan
// veintidos veces mas rapido que una mensual.
export const ponderacionArrastrada = (funciones: readonly FuncionConArrastre[]) =>
  funciones.filter((f) => f.arrastre.periodos > 0).reduce((t, f) => t + f.ponderacion, 0);

// Un patron es un arrastre de dos periodos o mas: el mismo hecho, visto desde
// el cierre de mes del empleado y con umbral.
export const UMBRAL_DEL_PATRON = 2;
export const esPatron = (a: Arrastre) => a.periodos >= UMBRAL_DEL_PATRON;
