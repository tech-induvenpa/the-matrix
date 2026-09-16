'use server';

import { revalidatePath } from 'next/cache';
import { clienteDelServidor } from '@/lib/supabase/servidor';

// Marcar cierra la ocurrencia (funcion, periodo). La seguridad por fila decide
// si esa funcion es de quien marca: aqui no se filtra a mano.
async function marcar(funcionId: string, periodo: string, resultado: 'hecho' | 'no_pude', razon?: string) {
  const supabase = await clienteDelServidor();
  await supabase.from('marca').insert({ funcion_id: funcionId, periodo, resultado, razon: razon ?? null });
  revalidatePath('/');
}

export async function marcarHecho(funcionId: string, periodo: string) {
  await marcar(funcionId, periodo, 'hecho');
}

export async function marcarNoPude(funcionId: string, periodo: string, formulario: FormData) {
  const razon = String(formulario.get('razon') ?? '').trim();
  if (!razon) return; // No se puede decir "no pude" sin decir por que.
  await marcar(funcionId, periodo, 'no_pude', razon);
}
