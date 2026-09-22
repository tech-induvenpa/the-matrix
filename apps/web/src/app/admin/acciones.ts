'use server';

import { ADMITE_DIA_TOPE, reescalarA, reescalarACien, SE_AGENDA, sePuedePublicar, sumaDe, tipoSegun } from '@matriz/dominio';
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

// --- El traspaso (CEB-133) --------------------------------------------------

// Mover trabajo de una persona a otra sin partirle la historia. Asimetrico a
// proposito: quien entrega se reacomoda solo, quien recibe necesita que alguien
// escriba cuanto pesa en su cargo, porque eso el sistema no lo puede calcular
// sin saber lo que gana (ADR 0007).
export async function traspasar(funcionId: string, deQuien: string, formulario: FormData) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const aQuien = String(formulario.get('aQuien') ?? '');
  const pesoNuevo = Number(formulario.get('pesoNuevo') ?? 0);

  if (!aQuien) return { mensaje: '¿A quién se la pasas?', celebra: false };
  if (aQuien === deQuien) return { mensaje: 'Esa función ya es suya.', celebra: false };
  if (!Number.isInteger(pesoNuevo) || pesoNuevo < 0 || pesoNuevo > 100)
    return { mensaje: 'Un peso va de cero a cien, y es un entero.', celebra: false };

  const supabase = await clienteDelServidor();

  const cargoDe = async (quien: string) => {
    const { data } = await supabase
      .from('titularidad')
      .select('funcion_id, ponderacion')
      .eq('empleado_id', quien)
      .is('hasta', null)
      .not('publicado_en', 'is', null);

    return (data ?? []).map((t) => ({
      funcionId: t.funcion_id as string,
      ponderacion: t.ponderacion as number,
    }));
  };

  const quedan = (await cargoDe(deQuien)).filter((t) => t.funcionId !== funcionId);
  const reciben = await cargoDe(aQuien);

  const enFilas = (pesos: { funcionId: string; ponderacion: number }[]) =>
    pesos.map((p) => ({ funcion_id: p.funcionId, ponderacion: p.ponderacion }));

  const { error } = await supabase.rpc('traspasar', {
    la_funcion: funcionId,
    de_quien: deQuien,
    a_quien: aQuien,
    peso_nuevo: pesoNuevo,
    pesos_de_quien_entrega: enFilas(reescalarACien(quedan)),
    pesos_de_quien_recibe: enFilas(reescalarA(reciben, 100 - pesoNuevo)),
  });
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath(`/admin/${deQuien}`);
  revalidatePath(`/admin/${aQuien}`);
  revalidatePath('/admin');
  return { mensaje: '¡Traspasada! Su historial se fue con ella.', celebra: true };
}

// --- La gente y el calendario (CEB-134, CEB-135) ----------------------------

// Dar de alta es lo que hoy hace `pnpm acceso` por terminal. Sin esto, el
// administrador depende de alguien tecnico para la operacion mas basica.
//
// Un empleado sin vinculo con su usuario de autenticacion existe en la base
// pero no ve nada, porque la seguridad por fila cuelga de ese vinculo: el alta
// no esta completa hasta que el vinculo existe (ADR 0004).
export async function darDeAlta(formulario: FormData) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const nombre = String(formulario.get('nombre') ?? '').trim();
  const correo = String(formulario.get('correo') ?? '').trim().toLowerCase();

  if (!nombre) return { mensaje: 'Sin nombre no puedo darla de alta.', celebra: false };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return { mensaje: 'Ese correo no parece un correo.', celebra: false };

  const supabase = await clienteDelServidor();
  const { error } = await supabase.rpc('dar_de_alta', { el_nombre: nombre, el_correo: correo });
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath('/admin');
  return { mensaje: `${nombre} ya puede entrar con su correo.`, celebra: true };
}

// Los dias no habiles son rangos: un feriado es un rango de un dia, las
// colectivas son un bloque. Las vacaciones individuales no existen aqui.
export async function cargarDiasNoHabiles(formulario: FormData) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const desde = String(formulario.get('desde') ?? '');
  const hasta = String(formulario.get('hasta') ?? '') || desde;
  const descripcion = String(formulario.get('descripcion') ?? '').trim();

  if (!desde) return { mensaje: '¿Desde cuándo?', celebra: false };
  if (hasta < desde) return { mensaje: 'El final va después del principio.', celebra: false };

  const supabase = await clienteDelServidor();
  const { error } = await supabase.from('dia_no_habil').insert({ desde, hasta, descripcion });
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath('/admin/calendario');
  return { mensaje: 'Cargado.', celebra: false };
}

export async function borrarDiaNoHabil(id: string) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const supabase = await clienteDelServidor();
  const { error } = await supabase.from('dia_no_habil').delete().eq('id', id);
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath('/admin/calendario');
  return { mensaje: 'Quitado.', celebra: false };
}

// Hasta donde se reviso el calendario. Que no haya feriados cargados hacia
// adelante no significa que el calendario cubra: significa que nadie sabe.
export async function declararCobertura(formulario: FormData) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const hasta = String(formulario.get('cargadoHasta') ?? '');
  if (!hasta) return { mensaje: '¿Hasta qué fecha lo revisaste?', celebra: false };

  const supabase = await clienteDelServidor();
  const { error } = await supabase.from('calendario').update({ cargado_hasta: hasta }).eq('id', true);
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath('/admin/calendario');
  revalidatePath('/admin');
  return { mensaje: `Calendario revisado hasta el ${hasta}.`, celebra: true };
}

// El nombre que hay viene del Excel, donde era el titulo de un bloque; los
// correos son inventados. Los dos hay que poder arreglarlos, y el correo ademas
// es como entra esa persona: se cambia donde se comprueba al entrar, o se queda
// fuera sin que nadie se entere hasta que lo intente.
export async function editarEmpleado(empleadoId: string, formulario: FormData) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const nombre = String(formulario.get('nombre') ?? '').trim();
  const correo = String(formulario.get('correo') ?? '').trim().toLowerCase();

  if (!nombre) return { mensaje: 'Sin nombre no se puede.', celebra: false };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return { mensaje: 'Ese correo no parece un correo.', celebra: false };

  const supabase = await clienteDelServidor();
  const { error } = await supabase.rpc('editar_empleado', {
    el_empleado: empleadoId,
    el_nombre: nombre,
    el_correo: correo,
  });
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath(`/admin/${empleadoId}`);
  revalidatePath('/admin');
  return { mensaje: 'Guardado. Entrará con ese correo.', celebra: false };
}
