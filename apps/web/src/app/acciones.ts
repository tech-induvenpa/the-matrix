'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { proyectarRazones } from '@/lib/razones';

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

export async function marcarNoPude(
  funcionId: string,
  periodo: string,
  formulario: FormData,
): Promise<Aviso | undefined> {
  const razon = String(formulario.get('razon') ?? '').trim();
  if (!razon) return; // No se puede decir "no pude" sin decir por que.
  await marcar(funcionId, periodo, 'no_pude', razon);
  llevarRazonesAlDocumento();
  return { mensaje: 'Anotado. ¡Solo si sabemos qué pasó, podemos mejorar!', celebra: false };
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
  await supabase
    .from('evento_flujo')
    .insert({ funcion_id: funcionId, estado, razon: estado === 'atrasado' ? razon : null });
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

export async function salir() {
  const supabase = await clienteDelServidor();
  await supabase.auth.signOut();
  redirect('/entrar');
}
