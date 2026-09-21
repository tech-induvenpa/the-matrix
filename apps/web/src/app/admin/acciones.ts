'use server';

import { ADMITE_DIA_TOPE, reescalarACien, SE_AGENDA, sePuedePublicar, sumaDe, tipoSegun } from '@matriz/dominio';
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
//
// Y saca la funcion del cargo, reescalando el resto. Si no, el reparto se
// quedaria corto en silencio: la persona seguiria "vigente" con noventa. Es la
// misma aritmetica del lado que entrega en un traspaso -- nada cambia de
// valor, cambia el total (ADR 0007).
export async function archivarFuncion(funcionId: string, empleadoId: string) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const supabase = await clienteDelServidor();

  const { data: vigentes } = await supabase
    .from('titularidad')
    .select('funcion_id, ponderacion')
    .eq('empleado_id', empleadoId)
    .is('hasta', null)
    .not('publicado_en', 'is', null);

  const quedan = (vigentes ?? [])
    .filter((t) => t.funcion_id !== funcionId)
    .map((t) => ({ funcionId: t.funcion_id as string, ponderacion: t.ponderacion as number }));

  const { error } = await supabase.rpc('archivar_funcion', {
    la_funcion: funcionId,
    quien: empleadoId,
    pesos: reescalarACien(quedan).map((p) => ({ funcion_id: p.funcionId, ponderacion: p.ponderacion })),
  });
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath(`/admin/${empleadoId}`);
  return { mensaje: 'Archivada. Su historial sigue ahí y el reparto se reacomodó.', celebra: false };
}

// --- El reparto (CEB-132) ---------------------------------------------------

// Guardar no publica. Quien reparte diecisiete funciones necesita poder dejarlo
// a medias e irse: si la pantalla exigiera cuadrar cien para guardar, la
// aritmetica se haria antes de entrar, y ese otro sitio seria Excel (ADR 0008).
export async function guardarBorrador(empleadoId: string, formulario: FormData) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const supabase = await clienteDelServidor();

  const propuestos = [...formulario.entries()]
    .filter(([clave]) => clave.startsWith('peso:'))
    .map(([clave, valor]) => ({ funcionId: clave.slice(5), ponderacion: Number(valor) }));

  if (propuestos.some((p) => !Number.isInteger(p.ponderacion) || p.ponderacion < 0 || p.ponderacion > 100))
    return { mensaje: 'Un peso va de cero a cien, y es un entero.', celebra: false };

  // Un borrador por funcion: dos propuestas a la vez no significan nada.
  await supabase.from('titularidad').delete().eq('empleado_id', empleadoId).is('publicado_en', null);

  const { error } = await supabase.from('titularidad').insert(
    propuestos.map((p) => ({
      funcion_id: p.funcionId,
      empleado_id: empleadoId,
      ponderacion: p.ponderacion,
      publicado_en: null,
    })),
  );
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath(`/admin/${empleadoId}`);
  const suma = sumaDe(propuestos);
  return {
    mensaje: suma === 100 ? 'Guardado. Ya cuadra: puedes publicarlo.' : `Guardado. Va por ${suma} de 100.`,
    celebra: false,
  };
}

// Publicar es lo que hace vigente un reparto. Lo que ve el empleado es siempre
// el ultimo publicado (INV-13), y uno que no suma cien no se publica (INV-14),
// cosa que ademas defiende la base por si esto se saltara.
export async function publicarReparto(empleadoId: string) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const supabase = await clienteDelServidor();

  const { data: borrador } = await supabase
    .from('titularidad')
    .select('funcion_id, ponderacion')
    .eq('empleado_id', empleadoId)
    .is('publicado_en', null);

  const pesos = (borrador ?? []).map((t) => ({
    funcionId: t.funcion_id as string,
    ponderacion: t.ponderacion as number,
  }));

  const veredicto = sePuedePublicar(pesos);
  if (!veredicto.publicable) {
    const mensaje =
      veredicto.motivo === 'no_suma_cien'
        ? `Suma ${veredicto.suma}. ${veredicto.falta > 0 ? `Faltan ${veredicto.falta}` : `Sobran ${-veredicto.falta}`}.`
        : veredicto.motivo === 'cargo_vacio'
          ? 'No hay nada que publicar.'
          : 'Algún peso no es posible.';
    return { mensaje, celebra: false };
  }

  const { error } = await supabase.rpc('publicar_reparto', { quien: empleadoId });
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath(`/admin/${empleadoId}`);
  revalidatePath('/admin');
  return { mensaje: '¡Publicado! Ya lo ven en sus pantallas.', celebra: true };
}

export async function descartarBorrador(empleadoId: string) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const supabase = await clienteDelServidor();
  await supabase.from('titularidad').delete().eq('empleado_id', empleadoId).is('publicado_en', null);

  revalidatePath(`/admin/${empleadoId}`);
  return { mensaje: 'Borrador descartado.', celebra: false };
}
