import type { TareaDelPerfil } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { quienPidio, type FilaImprevisto, type QuienPide } from '@/lib/datos';

// Los comentarios que la base me deja ver (CEB-198), con lo necesario para
// encender el punto: de quien es la tarea hoy y si sigue abierta.
export type FilaComentario = {
  id: string;
  funcion_id: string | null;
  periodo: string | null;
  imprevisto_id: string | null;
  autor: string;
  autor_nombre: string;
  escrito_en: string;
  texto: string;
  empleado_id: string | null;
  abierta: boolean;
};

// Una tarea en la URL: `o:<funcion>:<periodo>` o `i:<imprevisto>`.
export const claveDeOcurrencia = (funcionId: string, periodo: string) => `o:${funcionId}:${periodo}`;
export const claveDeImprevisto = (id: string) => `i:${id}`;

const claveDe = (t: { funcion_id: string | null; periodo: string | null; imprevisto_id: string | null }) =>
  t.imprevisto_id ? claveDeImprevisto(t.imprevisto_id) : claveDeOcurrencia(t.funcion_id!, t.periodo!);

// Lo que la base necesita para nombrar la tarea de una clave.
export function deClave(clave: string) {
  const [tipo, id, periodo] = clave.split(':');
  return tipo === 'i'
    ? { funcion_id: null, periodo: null, imprevisto_id: id ?? null }
    : { funcion_id: id ?? null, periodo: periodo ?? null, imprevisto_id: null };
}

// `abierta`: la tarea cuyo perfil esta abierto, para decir quien lo lee.
export async function losComentarios(abierta: string | undefined) {
  const supabase = await clienteDelServidor();
  const nombrada = abierta ? deClave(abierta) : null;
  const [{ data: comentarios }, { data: vistos }, { data: usuario }, { data: lectores }] = await Promise.all([
    supabase.rpc('comentarios_visibles'),
    supabase.from('comentario_visto').select('funcion_id, periodo, imprevisto_id, visto_en'),
    supabase.auth.getUser(),
    nombrada
      ? supabase.rpc('lectores', { la_funcion: nombrada.funcion_id, el_imprevisto: nombrada.imprevisto_id })
      : { data: [] },
  ]);

  const porTarea = new Map<string, FilaComentario[]>();
  for (const c of (comentarios ?? []) as FilaComentario[]) porTarea.set(claveDe(c), [...(porTarea.get(claveDe(c)) ?? []), c]);

  return {
    yo: usuario.user?.id ?? '',
    lectores: (lectores ?? []) as string[],
    porTarea,
    vistoEn: new Map(
      ((vistos ?? []) as (Parameters<typeof claveDe>[0] & { visto_en: string })[]).map((v) => [claveDe(v), v.visto_en]),
    ),
  };
}

// Un imprevisto como lo cuenta su perfil. `anterior`: la delegacion devuelta
// de la que nace, si el que la recibe la puede ver.
export function tareaDeImprevisto(
  i: Pick<FilaImprevisto, 'vence' | 'pedido_por' | 'pedido_por_otro' | 'pedido_en' | 'delega_funcion' | 'resultado' | 'razon' | 'marcada_en'>,
  quienesPiden: readonly QuienPide[],
  anterior?: Pick<FilaImprevisto, 'pedido_por' | 'pedido_por_otro' | 'devuelto_razon' | 'devuelto_en'>,
): TareaDelPerfil {
  return {
    tipo: 'imprevisto',
    vence: i.vence,
    pedidoPor: quienPidio(i, quienesPiden),
    pedidoEn: i.pedido_en,
    delegacion: i.delega_funcion !== null,
    devolucion:
      anterior?.devuelto_razon && anterior.devuelto_en
        ? { por: quienPidio(anterior, quienesPiden), razon: anterior.devuelto_razon, en: anterior.devuelto_en }
        : null,
    marca: i.resultado && i.marcada_en ? { resultado: i.resultado, razon: i.razon, marcadaEn: i.marcada_en } : null,
  };
}
