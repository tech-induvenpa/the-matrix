import type { Fecha } from './calendario';
import type { Resultado } from './imprevistos';

// Una delegacion es un imprevisto de quien la recibe, vinculado a una
// ocurrencia de su supervisor que sigue siendo suya (ADR 0012). La marca de
// quien la recibe no cierra la ocurrencia: el supervisor la revisa, y la
// aprueba marcando la suya o la devuelve. Su vencimiento es el de la
// ocurrencia, asi que no hace falta calcularlo aqui.

export type Delegacion = { resultado: Resultado | null; devueltoEn: string | null; borradoEn: string | null };

export type EstadoDeLaDelegacion = 'esperando' | 'para_revisar' | 'no_pudo' | 'no_tomada' | 'devuelta' | 'aprobada';

// `ocurrenciaMarcada`: si el supervisor ya marco su ocurrencia. Es lo que la
// cierra, y lo unico que la cierra.
export function estadoDeLaDelegacion(d: Delegacion, ocurrenciaMarcada: boolean): EstadoDeLaDelegacion {
  if (d.devueltoEn) return 'devuelta';
  if (d.resultado === 'no_lo_tome') return 'no_tomada';
  if (ocurrenciaMarcada) return 'aprobada';
  if (d.resultado === 'hecho') return 'para_revisar';
  if (d.resultado === 'no_pude') return 'no_pudo';
  return 'esperando';
}

// Abierta es lo que todavia espera a alguien: a quien la recibio, o al
// supervisor con un "hecho" sin revisar. Un "no pude" o "no lo tome" la
// cierran y dejan delegar otra vez.
export const estaAbierta = (d: Delegacion, ocurrenciaMarcada: boolean) => {
  if (d.borradoEn) return false;
  const estado = estadoDeLaDelegacion(d, ocurrenciaMarcada);
  return estado === 'esperando' || estado === 'para_revisar';
};

export type Delegable = { si: true } | { si: false; porque: 'vencida' | 'marcada' | 'ya_delegada' };

// Solo se delega lo que todavia no vencio: una delegacion vence con su
// ocurrencia, y delegar algo vencido haria nacer el imprevisto de otro ya
// contando en contra, por algo que el supervisor dejo pasar.
export function delegable(
  ocurrencia: { vence: Fecha },
  hoy: Fecha,
  delegaciones: readonly Delegacion[],
  ocurrenciaMarcada: boolean,
): Delegable {
  if (ocurrenciaMarcada) return { si: false, porque: 'marcada' };
  if (ocurrencia.vence < hoy) return { si: false, porque: 'vencida' };
  if (delegaciones.some((d) => estaAbierta(d, false))) return { si: false, porque: 'ya_delegada' };
  return { si: true };
}

export type DelegacionesDeUnaFuncion = { supervisor: string; funcion: string; delegadas: number; devueltas: number };

// Para el administrador: una delegacion que se repite es un traspaso que nadie
// hizo. Por eso se agrupa por funcion y no como una tasa por persona.
export function delegacionesPorFuncion(
  delegaciones: readonly { supervisor: string; funcion: string; devueltoEn: string | null; borradoEn: string | null }[],
): DelegacionesDeUnaFuncion[] {
  const grupos = new Map<string, DelegacionesDeUnaFuncion>();
  for (const d of delegaciones) {
    if (d.borradoEn) continue;
    const clave = `${d.supervisor}|${d.funcion}`;
    const g = grupos.get(clave) ?? { supervisor: d.supervisor, funcion: d.funcion, delegadas: 0, devueltas: 0 };
    g.delegadas++;
    if (d.devueltoEn) g.devueltas++;
    grupos.set(clave, g);
  }
  return [...grupos.values()].sort(
    (a, b) => a.supervisor.localeCompare(b.supervisor) || b.delegadas - a.delegadas || a.funcion.localeCompare(b.funcion),
  );
}
