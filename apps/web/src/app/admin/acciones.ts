'use server';

import { ADMITE_DIA_TOPE, SE_AGENDA, tipoSegun } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { esAdministrador } from '@/lib/administrador';
import { revalidatePath } from 'next/cache';

const PERIODICIDADES = ['diaria', 'semanal', 'quincenal', 'mensual', 'trimestral'];

const si = (f: FormData, campo: string) => f.get(campo) === 'si';

// El tipo no se elige: sale de lo que se responda sobre el trabajo. Lo decide
// el dominio, que es donde vive el criterio (ADR 0006).
function loQueSeEscribio(formulario: FormData) {
  const texto = String(formulario.get('texto') ?? '').trim();
  const periodicidad = String(formulario.get('periodicidad') ?? '');
  const importancia = Number(formulario.get('importancia') ?? 0);

  const tipo = tipoSegun({
    quedaTerminado: si(formulario, 'quedaTerminado'),
    seAtiendeMientrasHaya: si(formulario, 'seAtiendeMientrasHaya'),
    nombraUnAmbito: si(formulario, 'nombraUnAmbito'),
  });

  const topeEscrito = Number(formulario.get('diaTope') ?? 0);
  const diaTope = SE_AGENDA[tipo] && ADMITE_DIA_TOPE(periodicidad) && topeEscrito >= 1 && topeEscrito <= 31
    ? topeEscrito
    : null;

  return { texto, periodicidad, importancia, tipo, diaTope };
}

function noSirve(datos: ReturnType<typeof loQueSeEscribio>): string | null {
  if (!datos.texto) return 'Sin nombre no se puede crear.';
  if (!PERIODICIDADES.includes(datos.periodicidad)) return 'Esa periodicidad no existe.';
  if (!Number.isInteger(datos.importancia) || datos.importancia < 0 || datos.importancia > 9)
    return 'La importancia va de cero a nueve.';
  return null;
}

// Una funcion nueva nace pesando cero: el reparto de su titular sigue sumando
// cien y nadie se queda con un cargo roto por crear trabajo. Darle su peso es
// redistribuir el reparto, que es otra pantalla (CEB-132).
export async function crearFuncion(empleadoId: string, formulario: FormData) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const datos = loQueSeEscribio(formulario);
  const mal = noSirve(datos);
  if (mal) return { mensaje: mal, celebra: false };

  const supabase = await clienteDelServidor();

  const { data: funcion, error } = await supabase
    .from('funcion')
    .insert({
      texto: datos.texto,
      periodicidad: datos.periodicidad,
      importancia: datos.importancia,
      tipo_corregido: datos.tipo,
      dia_tope_corregido: datos.diaTope,
    })
    .select('id')
    .single();
  if (error) return { mensaje: error.message, celebra: false };

  const { error: sinVinculo } = await supabase
    .from('titularidad')
    .insert({ funcion_id: funcion.id, empleado_id: empleadoId, ponderacion: 0 });
  if (sinVinculo) return { mensaje: sinVinculo.message, celebra: false };

  revalidatePath(`/admin/${empleadoId}`);
  return { mensaje: 'Creada. Le falta su peso en el reparto.', celebra: true };
}

// Editar el nombre no toca la identidad: la funcion es la misma y su historial
// se queda con ella. Lo que hay que cuidar es lo contrario -- que nadie
// convierta una funcion en otra distinta editando el texto (ADR 0008).
export async function editarFuncion(funcionId: string, empleadoId: string, formulario: FormData) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const datos = loQueSeEscribio(formulario);
  const mal = noSirve(datos);
  if (mal) return { mensaje: mal, celebra: false };

  const supabase = await clienteDelServidor();

  const { error } = await supabase
    .from('funcion')
    .update({
      texto: datos.texto,
      periodicidad: datos.periodicidad,
      importancia: datos.importancia,
      tipo_corregido: datos.tipo,
      dia_tope_corregido: datos.diaTope,
    })
    .eq('id', funcionId);
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath(`/admin/${empleadoId}`);
  return { mensaje: 'Guardada.', celebra: false };
}

// Archivar no borra: las marcas siguen siendo ciertas (INV-16).
export async function archivarFuncion(funcionId: string, empleadoId: string) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const supabase = await clienteDelServidor();
  const { error } = await supabase.from('funcion').update({ activa: false }).eq('id', funcionId);
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath(`/admin/${empleadoId}`);
  return { mensaje: 'Archivada. Su historial sigue ahí.', celebra: false };
}
