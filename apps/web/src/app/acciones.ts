'use server';

import { revalidatePath } from 'next/cache';
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
  llevarRazonesAlDocumento();
}

// Un flujo no se marca: cambia de estado cuando el empleado dice que cambio.
export async function cambiarEstadoFlujo(
  funcionId: string,
  estado: 'al_dia' | 'atrasado',
  formulario: FormData,
) {
  const razon = String(formulario.get('razon') ?? '').trim();
  if (estado === 'atrasado' && !razon) return; // nadie se atrasa sin decir por que

  const supabase = await clienteDelServidor();
  await supabase
    .from('evento_flujo')
    .insert({ funcion_id: funcionId, estado, razon: estado === 'atrasado' ? razon : null });
  revalidatePath('/');

  // Ponerse al dia tambien cuenta: JFS ve que el atraso se cerro.
  llevarRazonesAlDocumento();
}
