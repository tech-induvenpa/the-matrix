import { Calendario, estadoDelMes, type EstadoDelMes, type Reapertura } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import type { QuienPide } from '@/lib/datos';

// El cierre del mes visto desde la pantalla (CEB-228, CEB-229). La regla es del
// dominio; aqui solo se leen el calendario y las reaperturas con la sesion de
// quien mira. Todos leen las reaperturas: se reabre para todos.

// Las reaperturas, de la mas vieja a la mas nueva, con quien reabrio en
// palabras. Solo el administrador reabre, y quienes_piden lo nombra.
export async function lasReaperturas(): Promise<Reapertura[]> {
  const supabase = await clienteDelServidor();
  const [{ data }, { data: quienes }] = await Promise.all([
    supabase.from('reapertura').select('mes, razon, quien, en, cerrada_en').order('en'),
    supabase.rpc('quienes_piden'),
  ]);
  const nombreDe = (id: string) => ((quienes ?? []) as QuienPide[]).find((q) => q.id === id)?.nombre ?? 'El administrador';

  return (data ?? []).map((r) => ({
    mes: r.mes as string,
    razon: r.razon as string,
    quien: nombreDe(r.quien as string),
    en: r.en as string,
    cerradaEn: r.cerrada_en as string | null,
  }));
}

export type MesDelCierre = { valor: string; texto: string; estado: EstadoDelMes; hasta: string | null };

// Un instante como se lee en Caracas: "3 oct, 10:00". Lo formatea el servidor,
// que corre en UTC, asi que la zona va explicita.
export const enCaracas = (instante: string) =>
  new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Caracas' }).format(
    new Date(instante),
  );

// Los ultimos doce meses, del mas reciente al mas viejo, con su estado.
export async function losMeses(): Promise<MesDelCierre[]> {
  const supabase = await clienteDelServidor();
  const [{ data: dias }, reaperturas] = await Promise.all([supabase.from('dia_no_habil').select('desde, hasta'), lasReaperturas()]);
  const calendario = Calendario.con(dias ?? []);
  const ahora = new Date();

  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - i, 1));
    const valor = d.toISOString().slice(0, 7);
    const estado = estadoDelMes(valor, calendario, ahora.toISOString(), reaperturas);
    return {
      valor,
      texto: new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d),
      estado,
      hasta: estado.estado === 'reabierto' ? enCaracas(estado.hasta) : null,
    };
  });
}
