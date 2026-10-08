import type { Fecha } from './calendario';
import type { Resultado } from './imprevistos';
import type { Ocurrencia } from './ocurrencias';

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

// Un imprevisto propio se delega con la misma regla (ADR 0018): abierto, sin
// marca, no vencido y sin otra delegacion abierta. Una delegacion no se delega
// otra vez: no hay cadena.
export type DelegableImprevisto = { si: true } | { si: false; porque: 'cerrado' | 'vencido' | 'ya_delegado' | 'es_delegacion' };

export function delegableImprevisto(
  imprevisto: { vence: Fecha; resultado: Resultado | null; borradoEn: string | null; esDelegacion: boolean },
  hoy: Fecha,
  delegaciones: readonly Delegacion[],
): DelegableImprevisto {
  if (imprevisto.esDelegacion) return { si: false, porque: 'es_delegacion' };
  if (imprevisto.resultado || imprevisto.borradoEn) return { si: false, porque: 'cerrado' };
  if (imprevisto.vence < hoy) return { si: false, porque: 'vencido' };
  if (delegaciones.some((d) => estaAbierta(d, false))) return { si: false, porque: 'ya_delegado' };
  return { si: true };
}

// Una delegacion que se repite es un traspaso que nadie hizo (CEB-224). Se
// mira en una ventana movil, nunca en un mes cerrado, y una sola delegacion no
// es repetirse. Las dos son decisiones de negocio.
export const VENTANA_DE_DELEGACION = 90;
export const MINIMO_DE_DELEGACIONES = 2;

export type DelegacionRepetida = {
  funcionId: string;
  texto: string;
  // Quien la delega: el titular de la funcion.
  supervisor: string;
  delegadas: number;
  devueltas: number;
  // La parte de sus ocurrencias de la ventana que se delego, de 0 a 1. En
  // proporcion y no en veces: contar veces pondria siempre las diarias arriba.
  proporcion: number;
  // De esa parte, la que se devolvio: la misma proporcion por devueltas sobre delegadas.
  proporcionDevuelta: number;
};

const haceDias = (hoy: Fecha, dias: number): Fecha =>
  new Date(Date.parse(`${hoy}T00:00:00Z`) - dias * 864e5).toISOString().slice(0, 10);

// Las ocurrencias de la ventana son las que vencieron en ella, mas las
// delegadas que aun no vencen: solo se delega lo que no vencio. Volver a
// delegar la misma ocurrencia es otra vez, pero no otra ocurrencia.
export function delegacionRepetida(
  funciones: readonly { funcionId: string; texto: string; supervisor: string; ocurrencias: readonly Ocurrencia[] }[],
  delegaciones: readonly { funcionId: string; periodo: string; pedidoEn: string; devueltoEn: string | null; borradoEn: string | null }[],
  hoy: Fecha,
): DelegacionRepetida[] {
  const desde = haceDias(hoy, VENTANA_DE_DELEGACION);
  const enLaVentana = delegaciones.filter((d) => !d.borradoEn && d.pedidoEn.slice(0, 10) >= desde);

  return funciones
    .flatMap((f) => {
      const suyas = enLaVentana.filter((d) => d.funcionId === f.funcionId);
      if (suyas.length < MINIMO_DE_DELEGACIONES) return [];
      const delegados = new Set(suyas.map((d) => d.periodo));
      const ocurrencias = new Set([...f.ocurrencias.filter((o) => o.vence >= desde && o.vence <= hoy).map((o) => o.periodo), ...delegados]);
      const devueltas = suyas.filter((d) => d.devueltoEn).length;
      const proporcion = delegados.size / ocurrencias.size;
      return [
        {
          funcionId: f.funcionId,
          texto: f.texto,
          supervisor: f.supervisor,
          delegadas: suyas.length,
          devueltas,
          proporcion,
          proporcionDevuelta: (proporcion * devueltas) / suyas.length,
        },
      ];
    })
    .sort((a, b) => b.proporcion - a.proporcion || b.delegadas - a.delegadas || a.texto.localeCompare(b.texto));
}
