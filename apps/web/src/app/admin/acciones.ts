'use server';

import { ADMITE_DIA_TOPE, leerPertenencia, PISO_DE_COTIDIANIDAD, proponerReparto, SE_AGENDA, sePuedePublicar, sumaDe, tipoSegun } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { esAdministrador, gente } from '@/lib/administrador';
import { nominaDelMes } from '@/lib/nomina';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const PERIODICIDADES = ['diaria', 'semanal', 'quincenal', 'mensual', 'trimestral'];

// Ninguna funcion puede pesar tanto que deje la cotidianidad bajo el piso.
const TOPE = 100 - PISO_DE_COTIDIANIDAD;

// Todo lo que mueve un peso pasa por la misma propuesta del dominio (ADR 0014),
// y la base recibe lo que la propuesta calculo.
const vigentesDe = (filas: { funcion_id: unknown; ponderacion: unknown }[] | null) =>
  (filas ?? []).map((t) => ({ funcionId: t.funcion_id as string, ponderacion: t.ponderacion as number }));

const enFilas = (pesos: readonly { funcionId: string; ponderacion: number }[]) =>
  pesos.map((p) => ({ funcion_id: p.funcionId, ponderacion: p.ponderacion }));

// Una sola respuesta: las preguntas son excluyentes y se eligen como tal.
const si = (f: FormData, campo: string) => f.get('tipo') === campo;

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
  const diaTope = tipo && SE_AGENDA[tipo] && ADMITE_DIA_TOPE(periodicidad) && topeEscrito >= 1 && topeEscrito <= 31
    ? topeEscrito
    : null;

  return { texto, periodicidad, importancia, tipo, diaTope };
}

function noSirve(datos: ReturnType<typeof loQueSeEscribio>): string | null {
  if (!datos.texto) return 'Sin nombre no se puede crear.';
  if (!datos.tipo) return 'Elige qué tipo de trabajo es.';
  if (!PERIODICIDADES.includes(datos.periodicidad)) return 'Esa periodicidad no existe.';
  if (!Number.isInteger(datos.importancia) || datos.importancia < 0 || datos.importancia > 9)
    return 'La importancia va de cero a nueve.';
  return null;
}

// Una funcion nueva nace con el peso que se le da, pero en el borrador: las
// demas se reacomodan para que el cargo siga sumando cien, y eso se ve en el
// reparto antes de publicarlo. Crear no cambia lo que ve nadie (CEB-132).
export async function crearFuncion(empleadoId: string, formulario: FormData) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const datos = loQueSeEscribio(formulario);
  const mal = noSirve(datos);
  if (mal) return { mensaje: mal, celebra: false };

  const peso = Number(formulario.get('ponderacion') ?? 0);
  if (!Number.isInteger(peso) || peso < 0 || peso > TOPE)
    return { mensaje: `Un peso va de cero a ${TOPE}, y es un entero.`, celebra: false };

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

  // Lo que tiene hoy: lo publicado, y encima lo que el administrador ya haya
  // dejado en el borrador, para no perderlo.
  const { data: vigentes } = await supabase
    .from('titularidad')
    .select('funcion_id, ponderacion, publicado_en, funcion!inner(activa)')
    .eq('empleado_id', empleadoId)
    .is('hasta', null)
    .eq('funcion.activa', true);
  const actual = new Map<string, number>();
  for (const t of [...(vigentes ?? [])].sort((a, b) => Number(a.publicado_en === null) - Number(b.publicado_en === null))) {
    actual.set(t.funcion_id as string, t.ponderacion as number);
  }

  const { despues: propuestos } = proponerReparto(
    [...actual].map(([funcionId, ponderacion]) => ({ funcionId, ponderacion })),
    { entra: { funcionId: funcion.id as string, ponderacion: peso } },
  );

  await supabase.from('titularidad').delete().eq('empleado_id', empleadoId).is('publicado_en', null);
  const { error: sinBorrador } = await supabase.from('titularidad').insert(
    propuestos.map((p) => ({ funcion_id: p.funcionId, empleado_id: empleadoId, ponderacion: p.ponderacion, publicado_en: null })),
  );
  if (sinBorrador) {
    // Son dos escrituras: sin su borrador, la funcion quedaria huerfana, sin
    // titular. Nace sin historia, asi que se puede eliminar.
    await supabase.rpc('eliminar_funcion', { la_funcion: funcion.id, quien: empleadoId, pesos: [] });
    return { mensaje: sinBorrador.message, celebra: false };
  }

  revalidatePath(`/admin/${empleadoId}`);
  redirect(`/admin/${empleadoId}?editar=reparto&entra=${funcion.id}`);
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

  // El peso no se aplica aqui. Cambiarlo mueve los numeros de las demas
  // funciones, que el administrador no escribio: eso se propone y se aprueba
  // viendo el antes y el despues, no se hace al vuelo.
  const pedida = Number(formulario.get('ponderacion') ?? -1);
  const { data: actual } = await supabase
    .from('titularidad')
    .select('ponderacion')
    .eq('funcion_id', funcionId)
    .eq('empleado_id', empleadoId)
    .is('hasta', null)
    .maybeSingle();

  if (Number.isInteger(pedida) && pedida >= 0 && pedida <= TOPE && actual && actual.ponderacion !== pedida) {
    revalidatePath(`/admin/${empleadoId}`);
    redirect(`/admin/${empleadoId}?editar=${funcionId}&peso=${pedida}`);
  }

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

  const { error } = await supabase.rpc('archivar_funcion', {
    la_funcion: funcionId,
    quien: empleadoId,
    pesos: enFilas(proponerReparto(vigentesDe(vigentes), { sale: funcionId }).despues),
  });
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath(`/admin/${empleadoId}`);
  redirect(`/admin/${empleadoId}`);
}

// Eliminar por completo: para la funcion creada por error. La base la rechaza
// si ya tiene historia, y entonces lo que corresponde es archivarla (0022).
export async function eliminarFuncion(funcionId: string, empleadoId: string) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const supabase = await clienteDelServidor();

  const { data: vigentes } = await supabase
    .from('titularidad')
    .select('funcion_id, ponderacion')
    .eq('empleado_id', empleadoId)
    .is('hasta', null)
    .not('publicado_en', 'is', null);

  const { error } = await supabase.rpc('eliminar_funcion', {
    la_funcion: funcionId,
    quien: empleadoId,
    pesos: enFilas(proponerReparto(vigentesDe(vigentes), { sale: funcionId }).despues),
  });
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath(`/admin/${empleadoId}`);
  redirect(`/admin/${empleadoId}`);
}

// --- El reparto (CEB-132) ---------------------------------------------------

// Guardar no publica. Quien reparte diecisiete funciones necesita poder dejarlo
// a medias e irse: si la pantalla exigiera cuadrar cien para guardar, la
// aritmetica se haria antes de entrar, y ese otro sitio seria Excel (ADR 0008).
// Lo que el administrador aprueba despues de ver el antes y el despues. Los
// pesos los vuelve a calcular el servidor con la misma funcion del dominio: lo
// que se aplica es exactamente lo que se enseño, no lo que viaje en el formulario.
export async function aplicarPonderacion(funcionId: string, empleadoId: string, nueva: number) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };
  if (!Number.isInteger(nueva) || nueva < 0 || nueva > TOPE)
    return { mensaje: `Un peso va de cero a ${TOPE}, y es un entero.`, celebra: false };

  const supabase = await clienteDelServidor();

  const { data: vigentes } = await supabase
    .from('titularidad')
    .select('funcion_id, ponderacion')
    .eq('empleado_id', empleadoId)
    .is('hasta', null)
    .not('publicado_en', 'is', null);

  const { despues } = proponerReparto(vigentesDe(vigentes), { cambia: { funcionId, ponderacion: nueva } });

  const { error } = await supabase.rpc('ajustar_ponderacion', {
    la_funcion: funcionId,
    quien: empleadoId,
    nueva,
    pesos_del_resto: enFilas(despues.filter((p) => p.funcionId !== funcionId)),
  });
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath(`/admin/${empleadoId}`);
  redirect(`/admin/${empleadoId}`);
}

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

  // "Publicar" viaja en el mismo formulario: primero se guarda lo que esta en
  // pantalla, y eso es lo que se publica.
  if (formulario.get('publicar') === 'si') return publicarReparto(empleadoId);

  revalidatePath(`/admin/${empleadoId}`);
  const suma = sumaDe(propuestos);
  return {
    mensaje: sePuedePublicar(propuestos).publicable
      ? `Guardado. Su cotidianidad queda en ${100 - suma}: puedes publicarlo.`
      : `Guardado. Las funciones suman ${suma}: la cotidianidad quedaría bajo ${PISO_DE_COTIDIANIDAD}.`,
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
      veredicto.motivo === 'bajo_el_piso'
        ? `Las funciones suman ${veredicto.suma}: la cotidianidad quedaría en ${100 - veredicto.suma}, y nunca baja de ${PISO_DE_COTIDIANIDAD}. Sobran ${veredicto.sobra}.`
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
  if (!Number.isInteger(pesoNuevo) || pesoNuevo < 0 || pesoNuevo > TOPE)
    return { mensaje: `Un peso va de cero a ${TOPE}, y es un entero.`, celebra: false };

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

  // La misma regla de los dos lados (ADR 0014): a quien entrega le sale, a
  // quien recibe le entra.
  const entrega = proponerReparto(await cargoDe(deQuien), { sale: funcionId }).despues;
  const recibe = proponerReparto(await cargoDe(aQuien), { entra: { funcionId, ponderacion: pesoNuevo } }).despues;

  const { error } = await supabase.rpc('traspasar', {
    la_funcion: funcionId,
    de_quien: deQuien,
    a_quien: aQuien,
    peso_nuevo: pesoNuevo,
    pesos_de_quien_entrega: enFilas(entrega),
    pesos_de_quien_recibe: enFilas(recibe.filter((p) => p.funcionId !== funcionId)),
  });
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath(`/admin/${deQuien}`);
  revalidatePath(`/admin/${aQuien}`);
  revalidatePath('/admin');
  redirect(`/admin/${deQuien}`);
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

  const { empresa, sede } = leerPertenencia(String(formulario.get('pertenencia') ?? ''));

  if (!nombre) return { mensaje: 'Sin nombre no puedo darla de alta.', celebra: false };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return { mensaje: 'Ese correo no parece un correo.', celebra: false };
  if (!empresa) return { mensaje: '¿De qué empresa es?', celebra: false };

  const supabase = await clienteDelServidor();
  const { error } = await supabase.rpc('dar_de_alta', {
    el_nombre: nombre,
    el_correo: correo,
    la_empresa: empresa,
    la_sede: sede ?? null,
  });
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

  const { empresa, sede } = leerPertenencia(String(formulario.get('pertenencia') ?? ''));

  if (!nombre) return { mensaje: 'Sin nombre no se puede.', celebra: false };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return { mensaje: 'Ese correo no parece un correo.', celebra: false };
  if (!empresa) return { mensaje: '¿De qué empresa es?', celebra: false };

  // Empresa y sede van juntas: cambiar de empresa manda la sede nueva, o
  // ninguna, en el mismo acto (INV-30).
  const supabase = await clienteDelServidor();
  const { error } = await supabase.rpc('editar_empleado', {
    el_empleado: empleadoId,
    el_nombre: nombre,
    el_correo: correo,
    la_empresa: empresa,
    la_sede: sede ?? null,
  });
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath(`/admin/${empleadoId}`);
  revalidatePath('/admin');
  // Guardado, el formulario se cierra: el nombre nuevo ya se ve arriba.
  redirect(`/admin/${empleadoId}`);
}

// El bono (ADR 0010): rige siempre desde el mes siguiente. Lo decide la base,
// no esta accion, asi que aqui solo se valida el monto.
export async function fijarBono(empleadoId: string, formulario: FormData) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const monto = Number(String(formulario.get('monto') ?? '').replace(',', '.'));
  if (!Number.isFinite(monto) || monto < 0) return { mensaje: 'Ese monto no parece un monto.', celebra: false };

  const supabase = await clienteDelServidor();
  // El primero rige desde este mes; un cambio, desde el que viene (0023).
  const { data: yaRige } = await supabase
    .from('bono')
    .select('id')
    .eq('empleado_id', empleadoId)
    .lte('rige_desde', `${new Date().toISOString().slice(0, 7)}-01`)
    .limit(1);
  const { error } = await supabase.rpc('fijar_bono', { el_empleado: empleadoId, el_monto: Math.round(monto * 100) / 100 });
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath(`/admin/${empleadoId}`);
  return {
    mensaje: yaRige?.length ? 'Anotado. Rige desde el mes que viene.' : 'Anotado. Es su primer bono: rige desde este mes.',
    celebra: false,
  };
}

// Quien supervisa a quien (CEB-177). La base comprueba que haya un solo nivel
// (INV-28); aqui solo se traduce el formulario. Vacio es "sin supervisor".
export async function asignarSupervisor(empleadoId: string, formulario: FormData) {
  if (!(await esAdministrador())) return { mensaje: 'No.', celebra: false };

  const supervisor = String(formulario.get('supervisor') ?? '') || null;
  const supabase = await clienteDelServidor();
  const { error } = await supabase.rpc('asignar_supervisor', { el_empleado: empleadoId, el_supervisor: supervisor });
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath(`/admin/${empleadoId}`);
  return { mensaje: supervisor ? 'Anotado. Ya responde por esta persona.' : 'Anotado. Sin responsable.', celebra: false };
}

// Reabrir un mes cerrado, para todos y con razon (CEB-229). La base comprueba
// que quien reabre sea el administrador, que haya razon y que el mes este
// cerrado; aqui solo se traduce el formulario.
export async function reabrirMes(formulario: FormData) {
  const mes = String(formulario.get('mes') ?? '');
  const razon = String(formulario.get('razon') ?? '').trim();
  if (!razon) return { mensaje: 'Reabrir un mes pide una razón.', celebra: false };

  // Lo que cada quien tenia a pagar antes de reabrir, para que su nomina diga
  // que cambio (CEB-232). Quien no tiene bono ese mes no tiene total.
  // ponytail: una nomina por persona, una tras otra; son decenas, no miles.
  const totales = [];
  for (const { id } of await gente()) {
    const { nomina } = await nominaDelMes(id, mes);
    if (nomina) totales.push({ empleado_id: id, total: nomina.total });
  }

  const supabase = await clienteDelServidor();
  const { error } = await supabase.rpc('reabrir_mes', { el_mes: mes, la_razon: razon, totales });
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath('/', 'layout');
  return { mensaje: 'Reabierto para todos. Se vuelve a cerrar solo en veinticuatro horas.', celebra: false };
}

export async function cerrarMes(mes: string) {
  const supabase = await clienteDelServidor();
  const { error } = await supabase.rpc('cerrar_mes', { el_mes: mes });
  if (error) return { mensaje: error.message, celebra: false };

  revalidatePath('/', 'layout');
  return { mensaje: 'Cerrado otra vez.', celebra: false };
}
