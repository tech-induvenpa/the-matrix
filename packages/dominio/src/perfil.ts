import type { Calendario, Fecha } from './calendario';
import type { Resultado } from './imprevistos';
import { urgenciaDe } from './urgencia';

// El perfil de la tarea (CEB-198): la historia de una ocurrencia o un
// imprevisto en una sola linea de tiempo. Toda la regla vive aqui; la pantalla
// solo pinta.

export type MarcaDelPerfil = { resultado: Resultado; razon: string | null; marcadaEn: string };

export type TareaDelPerfil =
  | { tipo: 'ocurrencia'; vence: Fecha; marca: MarcaDelPerfil | null }
  | {
      tipo: 'imprevisto';
      vence: Fecha;
      pedidoPor: string;
      pedidoEn: string;
      delegacion: boolean;
      // La delegacion anterior que se devolvio y dio origen a esta.
      devolucion: { por: string; razon: string; en: string } | null;
      marca: MarcaDelPerfil | null;
    };

export type Comentario = { autor: string; autorNombre: string; escritoEn: string; texto: string };

export type TipoDeEvento = 'pedido' | 'delegado' | 'devuelto' | 'comentario' | 'vencio' | Resultado;

export type EventoDelPerfil = { tipo: TipoDeEvento; emoji: string; quien?: string; cuando: string; texto?: string };

const EMOJI: Record<TipoDeEvento, string> = {
  pedido: '📥',
  delegado: '🤝',
  devuelto: '↩️',
  comentario: '💬',
  vencio: '⏰',
  hecho: '✅',
  no_pude: '❌',
  no_lo_tome: '🙅',
};

const evento = (tipo: TipoDeEvento, cuando: string, quien?: string, texto?: string): EventoDelPerfil => ({
  tipo,
  emoji: EMOJI[tipo],
  cuando,
  ...(quien !== undefined && { quien }),
  ...(texto !== undefined && { texto }),
});

// Lo mas reciente arriba: se abre el perfil para ver que paso ultimo. Una
// ocurrencia no tiene evento de nacimiento: es calculada. El vencimiento solo
// aparece si paso sin marca, al final de su dia: lo que se dijo ese dia fue
// antes de vencer. La marca va primero: despues de ella no se comenta.
export function lineaDeTiempo(tarea: TareaDelPerfil, comentarios: readonly Comentario[], hoy: Fecha): EventoDelPerfil[] {
  const eventos: EventoDelPerfil[] = comentarios.map((c) => evento('comentario', c.escritoEn, c.autorNombre, c.texto));

  if (tarea.tipo === 'imprevisto') {
    eventos.push(evento(tarea.delegacion ? 'delegado' : 'pedido', tarea.pedidoEn, tarea.pedidoPor));
    if (tarea.devolucion) eventos.push(evento('devuelto', tarea.devolucion.en, tarea.devolucion.por, tarea.devolucion.razon));
  }
  if (!tarea.marca && tarea.vence < hoy) eventos.push(evento('vencio', `${tarea.vence}T23:59:59.999Z`));

  eventos.sort((a, b) => b.cuando.localeCompare(a.cuando));

  if (tarea.marca) {
    eventos.unshift(evento(tarea.marca.resultado, tarea.marca.marcadaEn, undefined, tarea.marca.razon ?? undefined));
  }
  return eventos;
}

// Un comentario de otro que no he visto. Una tarea marcada no tiene nada sin
// leer. `vistoEn` null: nunca abri el perfil.
export function sinLeer(
  comentarios: readonly Pick<Comentario, 'autor' | 'escritoEn'>[],
  vistoEn: string | null,
  yo: string,
  marcada: boolean,
): boolean {
  if (marcada) return false;
  return comentarios.some((c) => c.autor !== yo && (vistoEn === null || c.escritoEn > vistoEn));
}

// El punto junto al nombre: alguna de sus tareas tiene algo sin leer para mi.
export const haySinLeer = (
  tareas: readonly { comentarios: readonly Pick<Comentario, 'autor' | 'escritoEn'>[]; vistoEn: string | null; marcada: boolean }[],
  yo: string,
) => tareas.some((t) => sinLeer(t.comentarios, t.vistoEn, yo, t.marcada));

export type EnLaLista<O, I> =
  | { tipo: 'ocurrencia'; urgencia: number; importancia: number; tarea: O }
  | { tipo: 'imprevisto'; urgencia: number; importancia: 0; tarea: I };

// Las tareas abiertas de una persona, ocurrencias e imprevistos juntos, por
// urgencia y luego importancia. Un imprevisto cuenta con importancia 0. Sin
// ponderacion a proposito: ordenar por peso le delataria al supervisor lo que
// pesa en el cargo de su gente.
export function listaDeTareas<
  O extends { vence: Fecha; importancia: number; marcada: boolean },
  I extends { vence: Fecha; resultado: Resultado | null; borradoEn: string | null },
>(ocurrencias: readonly O[], imprevistos: readonly I[], hoy: Fecha, calendario: Calendario): EnLaLista<O, I>[] {
  const urgencia = (vence: Fecha) => urgenciaDe(calendario.habilesEntre(hoy, vence));

  return [
    ...ocurrencias
      .filter((o) => !o.marcada)
      .map((o): EnLaLista<O, I> => ({ tipo: 'ocurrencia', urgencia: urgencia(o.vence), importancia: o.importancia, tarea: o })),
    ...imprevistos
      .filter((i) => !i.resultado && !i.borradoEn)
      .map((i): EnLaLista<O, I> => ({ tipo: 'imprevisto', urgencia: urgencia(i.vence), importancia: 0, tarea: i })),
  ].sort((a, b) => b.urgencia - a.urgencia || b.importancia - a.importancia);
}

// "Lo leen: Ana, Benito y el administrador". Quien escribe sabe quien lee.
export function loLeen(nombres: readonly string[]): string {
  const todos = [...new Set(nombres)];
  return todos.length ? `Lo leen: ${todos.join(', ')} y el administrador` : 'Lo lee el administrador';
}
