'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { Calendario, vencimientoDe, vinculables, type Limite, type Plazo } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { proyectarRazones } from '@/lib/razones';
import { hoyISO } from '@/lib/datos';

// La razon vuelve al documento DESPUES de guardar y DESPUES de responder
// (INV-4). Si Google esta caido, el empleado ya vio su marca guardada y no
// perdio nada: como la pestana se regenera entera, la proxima razon que si
// pase se lleva tambien esta.
function llevarRazonesAlDocumento() {
  after(async () => {
    try {
      await proyectarRazones();
    } catch (fallo) {
      console.error('[razones] no se pudo escribir la pestaña:', fallo);
    }
  });
}

// Lo que la pantalla dice de vuelta. Celebrar es para lo que se termina; lo
// demas se confirma y ya, porque felicitar a alguien por declarar un atraso
// suena a burla.
export type Aviso = { mensaje: string; celebra: boolean };

// Cinco, y se elige uno al azar aqui, en el servidor: si lo eligiera el
// navegador, el primer render y la hidratacion dirian cosas distintas.
const AL_TERMINAR = [
  '¡Listo! Una menos esta semana.',
  'Hecho. Eso ya no vive en tu cabeza.',
  'Cerrado a tiempo. Así se ve el estándar.',
  '¡Bien ahí! Sigue el ritmo.',
  'Una más resuelta. Vas bien.',
];

const alAzar = (mensajes: string[]) => mensajes[Math.floor(Math.random() * mensajes.length)]!;

// Marcar cierra la ocurrencia (funcion, periodo). La seguridad por fila decide
// si esa funcion es de quien marca: aqui no se filtra a mano.
async function marcar(funcionId: string, periodo: string, resultado: 'hecho' | 'no_pude', razon?: string) {
  const supabase = await clienteDelServidor();
  await supabase.from('marca').insert({ funcion_id: funcionId, periodo, resultado, razon: razon ?? null });
  revalidatePath('/');
}

export async function marcarHecho(funcionId: string, periodo: string): Promise<Aviso> {
  await marcar(funcionId, periodo, 'hecho');
  return { mensaje: alAzar(AL_TERMINAR), celebra: true };
}

// "No pude" puede traer los imprevistos que lo causaron (intromision). La base
// solo sabe el fin del periodo; el vencimiento exacto, con dia tope, lo sabe el
// dominio y se aplica aqui antes de llamarla (regla 3 de CEB-146).
export async function marcarNoPude(
  funcionId: string,
  periodo: string,
  vence: string,
  formulario: FormData,
): Promise<Aviso | undefined> {
  const razon = String(formulario.get('razon') ?? '').trim();
  if (!razon) return; // No se puede decir "no pude" sin decir por que.

  const supabase = await clienteDelServidor();
  const imprevistos = await soloVinculables(formulario, { vence });
  const { error } = await supabase.rpc('marcar_no_pude', {
    la_funcion: funcionId,
    el_periodo: periodo,
    la_razon: razon,
    imprevistos,
  });
  if (error) throw error;

  revalidatePath('/');
  llevarRazonesAlDocumento();
  return { mensaje: 'Anotado. ¡Solo si sabemos qué pasó, podemos mejorar!', celebra: false };
}

// Lo que el formulario dice que vincular, filtrado por lo que de verdad se
// puede. Nadie arma el formulario a mano, pero esta es la frontera.
async function soloVinculables(formulario: FormData, limite: Limite): Promise<string[]> {
  const pedidos = formulario.getAll('imprevisto').map(String);
  if (pedidos.length === 0) return [];

  const supabase = await clienteDelServidor();
  const { data } = await supabase.from('imprevisto').select('id, pedido_en, borrado_en').in('id', pedidos);

  return vinculables(
    (data ?? []).map((i) => ({ id: i.id as string, pedidoEn: i.pedido_en as string, borradoEn: i.borrado_en as string | null })),
    limite,
  ).map((i) => i.id);
}

// Un flujo no se marca: cambia de estado cuando el empleado dice que cambio.
export async function cambiarEstadoFlujo(
  funcionId: string,
  estado: 'al_dia' | 'atrasado',
  formulario: FormData,
): Promise<Aviso | undefined> {
  const razon = String(formulario.get('razon') ?? '').trim();
  if (estado === 'atrasado' && !razon) return; // nadie se atrasa sin decir por que

  const supabase = await clienteDelServidor();
  if (estado === 'al_dia') {
    await supabase.from('evento_flujo').insert({ funcion_id: funcionId, estado, razon: null });
  } else {
    // El atraso puede traer los imprevistos que lo causaron, pedidos desde que
    // el flujo estuvo al dia por ultima vez.
    const { data: ultimo } = await supabase
      .from('evento_flujo')
      .select('en')
      .eq('funcion_id', funcionId)
      .eq('estado', 'al_dia')
      .order('en', { ascending: false })
      .limit(1)
      .maybeSingle();
    const imprevistos = await soloVinculables(formulario, { alDiaDesde: (ultimo?.en as string | undefined) ?? null });
    const { error } = await supabase.rpc('atrasar_flujo', { la_funcion: funcionId, la_razon: razon, imprevistos });
    if (error) throw error;
  }
  revalidatePath('/');

  // Ponerse al dia tambien cuenta: JFS ve que el atraso se cerro.
  llevarRazonesAlDocumento();

  return estado === 'al_dia'
    ? { mensaje: '¡Al día otra vez! Se nota.', celebra: true }
    : { mensaje: 'Anotado. Avisar a tiempo también cuenta.', celebra: false };
}

// Deshacer borra la marca: la ocurrencia vuelve a estar pendiente. La
// seguridad por fila ya decide que solo se puede deshacer lo propio.
export async function deshacerMarca(funcionId: string, periodo: string): Promise<Aviso> {
  const supabase = await clienteDelServidor();
  await supabase.from('marca').delete().eq('funcion_id', funcionId).eq('periodo', periodo);
  revalidatePath('/');
  llevarRazonesAlDocumento();

  return { mensaje: 'Deshecho. Vuelve a tu lista.', celebra: false };
}

// Imprevistos (CEB-146). Vencen hoy o el habil siguiente: el vencimiento lo
// calcula el dominio y la base lo vuelve a comprobar (INV-18).
export async function registrarImprevisto(empleadoId: string, formulario: FormData): Promise<Aviso | undefined> {
  const texto = String(formulario.get('texto') ?? '').trim();
  const plazo: Plazo = formulario.get('plazo') === 'hoy' ? 'hoy' : 'manana';
  const pidio = String(formulario.get('pidio') ?? '');
  const otro = String(formulario.get('otro') ?? '').trim();
  if (!texto || (pidio === 'otro' && !otro)) return;

  const supabase = await clienteDelServidor();
  const { data: dias } = await supabase.from('dia_no_habil').select('desde, hasta');
  const { error } = await supabase.from('imprevisto').insert({
    empleado_id: empleadoId,
    texto,
    vence: vencimientoDe(hoyISO(), plazo, Calendario.con(dias ?? [])),
    pedido_por_admin: pidio === 'otro' ? null : pidio,
    pedido_por_otro: pidio === 'otro' ? otro : null,
  });
  if (error) throw error;

  revalidatePath('/', 'layout');
  return { mensaje: 'Anotado. Ya cuenta.', celebra: false };
}

export async function marcarImprevistoHecho(id: string): Promise<Aviso> {
  const supabase = await clienteDelServidor();
  const { error } = await supabase.rpc('marcar_imprevisto', { el_imprevisto: id, el_resultado: 'hecho', la_razon: null });
  if (error) throw error;
  revalidatePath('/', 'layout');
  return { mensaje: alAzar(AL_TERMINAR), celebra: true };
}

// "No pude" y "no lo tome" piden razon, igual que todo lo que no se hizo.
export async function marcarImprevistoSinHacer(
  id: string,
  resultado: 'no_pude' | 'no_lo_tome',
  formulario: FormData,
): Promise<Aviso | undefined> {
  const razon = String(formulario.get('razon') ?? '').trim();
  if (!razon) return;

  const supabase = await clienteDelServidor();
  const { error } = await supabase.rpc('marcar_imprevisto', { el_imprevisto: id, el_resultado: resultado, la_razon: razon });
  if (error) throw error;
  revalidatePath('/', 'layout');
  return {
    mensaje: resultado === 'no_lo_tome' ? 'Anotado. Decir que no a tiempo también cuenta.' : 'Anotado. Así se entiende después.',
    celebra: false,
  };
}

export async function desmarcarImprevisto(id: string): Promise<Aviso> {
  const supabase = await clienteDelServidor();
  const { error } = await supabase.rpc('desmarcar_imprevisto', { el_imprevisto: id });
  if (error) throw error;
  revalidatePath('/', 'layout');
  return { mensaje: 'Deshecho. Vuelve a estar abierto.', celebra: false };
}

// Borrar es corregir un error recien hecho. Queda quien lo borro y cuando.
export async function borrarImprevisto(id: string): Promise<Aviso> {
  const supabase = await clienteDelServidor();
  const { error } = await supabase.rpc('borrar_imprevisto', { el_imprevisto: id });
  if (error) throw error;
  revalidatePath('/', 'layout');
  return { mensaje: 'Borrado.', celebra: false };
}

export async function salir() {
  const supabase = await clienteDelServidor();
  await supabase.auth.signOut();
  redirect('/entrar');
}
