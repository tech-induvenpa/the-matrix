import { bonoDelMes, Calendario, coberturaDe } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { comoCambios, hoyISO, type QuienPide } from '@/lib/datos';
import { notFound } from 'next/navigation';
import { valorDe } from '@/lib/pertenencia';

// Quien asigna. Lo pregunta la base, no la aplicacion: la sesion no lleva el
// rol encima, asi que no hay nada que falsificar desde el navegador.
export async function esAdministrador(): Promise<boolean> {
  const supabase = await clienteDelServidor();
  const { data } = await supabase.rpc('es_administrador');
  return data === true;
}

// Un empleado que llega a una ruta de administracion recibe un 404, no un 403:
// decirle "no tienes permiso" seria contarle que la pantalla existe.
export async function soloAdministrador(): Promise<void> {
  if (!(await esAdministrador())) notFound();
}

export type EmpleadoDelPanel = {
  id: string;
  nombre: string;
  correo: string;
  empresaId: string | null;
  sedeId: string | null;
  // Quien responde por esta persona, si alguien (CEB-145).
  supervisorId: string | null;
  // Los textos de lo que tiene hoy: por ellos tambien se le encuentra (CEB-184).
  funciones: string[];
};

// La seguridad por fila es la que decide que esto traiga a los nueve y no a
// uno: la consulta es la misma que haria un empleado.
export async function gente(): Promise<EmpleadoDelPanel[]> {
  const supabase = await clienteDelServidor();

  const { data } = await supabase
    .from('empleado')
    .select('id, nombre_bloque, correo, empresa_id, sede_id, supervisor_id, titularidad(funcion(texto))')
    .is('titularidad.hasta', null)
    .order('nombre_bloque');

  return (data ?? []).map((e) => ({
    id: e.id as string,
    nombre: e.nombre_bloque as string,
    correo: e.correo as string,
    empresaId: (e.empresa_id as string | null) ?? null,
    sedeId: (e.sede_id as string | null) ?? null,
    supervisorId: (e.supervisor_id as string | null) ?? null,
    funciones: ((e.titularidad ?? []) as unknown as { funcion: { texto: string } | null }[]).flatMap((t) => (t.funcion ? [t.funcion.texto] : [])),
  }));
}

export type Tenencia = { nombre: string; ponderacion: number; desde: string; hasta: string | null };
export type FuncionDelPanel = { id: string; texto: string; periodicidad: string; historial: Tenencia[] };

// Por cuantas manos paso una funcion. Es lo que distingue una funcion imposible
// de una persona que no la esta haciendo, y hoy el sistema no podia verlo.
export async function funcionesConSuHistorial(): Promise<FuncionDelPanel[]> {
  const supabase = await clienteDelServidor();

  const { data } = await supabase
    .from('funcion')
    .select('id, texto, periodicidad, titularidad(ponderacion, desde, hasta, empleado(nombre_bloque))')
    .eq('activa', true)
    .order('texto');

  return (data ?? []).map((f) => ({
    id: f.id as string,
    texto: f.texto as string,
    periodicidad: f.periodicidad as string,
    historial: ((f.titularidad ?? []) as Record<string, unknown>[])
      .map((t) => ({
        nombre: ((t.empleado as { nombre_bloque?: string } | null)?.nombre_bloque ?? '') as string,
        ponderacion: t.ponderacion as number,
        desde: t.desde as string,
        hasta: (t.hasta as string | null) ?? null,
      }))
      .sort((a, b) => a.desde.localeCompare(b.desde)),
  }));
}

export type FuncionDelCargo = {
  id: string;
  texto: string;
  periodicidad: string;
  importancia: number;
  ponderacion: number;
  tipo: string | null;
  diaTope: number | null;
  // Solo esta en el borrador: todavia no la ve nadie, y publicada pesa cero.
  sinPublicar?: boolean;
};

export type Companero = { id: string; nombre: string };

export type Cargo = {
  id: string;
  nombre: string;
  correo: string;
  // Empresa, o empresa/sede: el valor del desplegable (CEB-184).
  pertenencia: string;
  funciones: FuncionDelCargo[];
  // Lo que el administrador dejo a medias. Vacio si no hay nada pendiente.
  borrador: { funcionId: string; ponderacion: number }[];
  // A quien se le puede traspasar: todos menos quien ya la tiene.
  companeros: Companero[];
  // CEB-145. Quien lo supervisa, y a quien supervisa el. Hay un solo nivel:
  // quien supervisa no tiene supervisor, asi que una lista vacia la otra.
  supervisorId: string | null;
  supervisa: Companero[];
  // Quienes podrian supervisarlo: nadie que ya tenga supervisor.
  puedenSupervisar: Companero[];
};

// El cargo de una persona: lo que tiene a su nombre ahora. La ponderacion sale
// del vinculo, que es donde vive desde CEB-130.
export async function cargoDe(empleadoId: string): Promise<Cargo | null> {
  const supabase = await clienteDelServidor();

  const { data: empleado } = await supabase
    .from('empleado')
    .select('id, nombre_bloque, correo, supervisor_id, empresa_id, sede_id')
    .eq('id', empleadoId)
    .maybeSingle();
  if (!empleado) return null;

  const { data } = await supabase
    .from('titularidad')
    .select('ponderacion, funcion!inner(id, texto, periodicidad, importancia, tipo_generado, tipo_corregido, dia_tope_generado, dia_tope_corregido)')
    .eq('empleado_id', empleadoId)
    .is('hasta', null)
    .not('publicado_en', 'is', null)
    .eq('funcion.activa', true);

  const { data: otros } = await supabase
    .from('empleado')
    .select('id, nombre_bloque, supervisor_id')
    .neq('id', empleadoId)
    .order('nombre_bloque');

  const { data: pendiente } = await supabase
    .from('titularidad')
    .select('funcion_id, ponderacion, funcion!inner(id, texto, periodicidad, importancia, tipo_generado, tipo_corregido, dia_tope_generado, dia_tope_corregido)')
    .eq('empleado_id', empleadoId)
    .is('publicado_en', null)
    .eq('funcion.activa', true);

  // Una funcion recien creada solo existe en el borrador: sin esto no aparecia
  // en el reparto, y a una persona nueva no habia a que darle peso.
  const publicadas = new Set(((data ?? []) as Record<string, unknown>[]).map((t) => (t.funcion as { id: string }).id));
  const soloEnBorrador = ((pendiente ?? []) as Record<string, unknown>[])
    .filter((t) => !publicadas.has(t.funcion_id as string))
    .map((t): Record<string, unknown> => ({ ...t, ponderacion: 0, sinPublicar: true }));

  const funciones = [...((data ?? []) as Record<string, unknown>[]), ...soloEnBorrador]
    .map((t) => {
      const f = t.funcion as Record<string, unknown>;
      return {
        sinPublicar: t.sinPublicar === true,
        id: f.id as string,
        texto: f.texto as string,
        periodicidad: f.periodicidad as string,
        importancia: f.importancia as number,
        ponderacion: t.ponderacion as number,
        tipo: (f.tipo_corregido ?? f.tipo_generado ?? null) as string | null,
        diaTope: (f.dia_tope_corregido ?? f.dia_tope_generado ?? null) as number | null,
      };
    })
    .sort((a, b) => b.ponderacion - a.ponderacion || a.texto.localeCompare(b.texto));

  return {
    id: empleado.id as string,
    nombre: empleado.nombre_bloque as string,
    correo: empleado.correo as string,
    pertenencia: valorDe(empleado.empresa_id as string | null, empleado.sede_id as string | null),
    funciones,
    borrador: (pendiente ?? []).map((t) => ({
      funcionId: t.funcion_id as string,
      ponderacion: t.ponderacion as number,
    })),
    companeros: (otros ?? []).map((e) => ({ id: e.id as string, nombre: e.nombre_bloque as string })),
    supervisorId: (empleado.supervisor_id as string | null) ?? null,
    supervisa: (otros ?? [])
      .filter((e) => e.supervisor_id === empleadoId)
      .map((e) => ({ id: e.id as string, nombre: e.nombre_bloque as string })),
    puedenSupervisar: (otros ?? [])
      .filter((e) => e.supervisor_id === null)
      .map((e) => ({ id: e.id as string, nombre: e.nombre_bloque as string })),
  };
}

export type DiaNoHabil = { id: string; desde: string; hasta: string; descripcion: string | null };

// El calendario y, sobre todo, hasta donde se reviso. Que no haya feriados
// cargados hacia adelante no significa que el calendario cubra: significa que
// nadie sabe.
export async function elCalendario() {
  const supabase = await clienteDelServidor();

  const [{ data: dias }, { data: fila }] = await Promise.all([
    supabase.from('dia_no_habil').select('id, desde, hasta, descripcion').order('desde', { ascending: false }),
    supabase.from('calendario').select('cargado_hasta').maybeSingle(),
  ]);

  const hoy = hoyISO();
  const cargadoHasta = (fila?.cargado_hasta as string | undefined) ?? hoy;

  return {
    hoy,
    cargadoHasta,
    dias: (dias ?? []) as DiaNoHabil[],
    cobertura: coberturaDe(Calendario.con(dias ?? []), hoy, cargadoHasta),
  };
}

// Lo que la ficha necesita para registrarle un imprevisto y mostrar sus
// tareas. El administrador aparece por defecto como quien lo pidio: es el caso
// en que registra el. Las tareas abiertas llegan por tareasAbiertasDe (CEB-198).
export async function imprevistosDe() {
  const supabase = await clienteDelServidor();
  const [{ data: dias }, { data: quienes }, { data: usuario }] = await Promise.all([
    supabase.from('dia_no_habil').select('desde, hasta'),
    supabase.rpc('quienes_piden'),
    supabase.auth.getUser(),
  ]);

  return {
    hoy: hoyISO(),
    calendario: Calendario.con(dias ?? []),
    quienesPiden: (quienes ?? []) as QuienPide[],
    yo: usuario.user?.id ?? '',
  };
}

// El bono de una persona para su ficha: el de este mes y, si ya se cambio, el
// que regira el que viene.
export async function bonoDe(empleadoId: string) {
  const supabase = await clienteDelServidor();
  const { data } = await supabase.from('bono').select('monto, rige_desde').eq('empleado_id', empleadoId);
  const historial = comoCambios(data);
  const mes = hoyISO().slice(0, 7);
  const siguiente = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 1)).toISOString().slice(0, 7);
  const vigente = bonoDelMes(historial, mes);
  const proximo = bonoDelMes(historial, siguiente);
  return { vigente, pendiente: proximo !== vigente ? proximo : null };
}

// El bono de este mes de cada persona, para poner dolares junto a los
// porcentajes del tablero (ADR 0010). Quien no tiene bono no aparece.
export async function bonosDelMes(): Promise<Map<string, number>> {
  const supabase = await clienteDelServidor();
  const { data } = await supabase.from('bono').select('empleado_id, monto, rige_desde');
  const mes = hoyISO().slice(0, 7);
  const bonos = new Map<string, number>();
  for (const id of new Set((data ?? []).map((b) => b.empleado_id as string))) {
    const bono = bonoDelMes(comoCambios((data ?? []).filter((b) => b.empleado_id === id)), mes);
    if (bono !== null) bonos.set(id, bono);
  }
  return bonos;
}
