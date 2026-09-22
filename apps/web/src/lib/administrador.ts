import { Calendario, coberturaDe } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { hoyISO } from '@/lib/datos';
import { notFound } from 'next/navigation';

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

export type EmpleadoDelPanel = { id: string; nombre: string; correo: string; funciones: number };

// La seguridad por fila es la que decide que esto traiga a los nueve y no a
// uno: la consulta es la misma que haria un empleado.
export async function gente(): Promise<EmpleadoDelPanel[]> {
  const supabase = await clienteDelServidor();

  const { data } = await supabase
    .from('empleado')
    .select('id, nombre_bloque, correo, titularidad(count)')
    .is('titularidad.hasta', null)
    .order('nombre_bloque');

  return (data ?? []).map((e) => ({
    id: e.id as string,
    nombre: e.nombre_bloque as string,
    correo: e.correo as string,
    funciones: (e.titularidad as { count: number }[] | null)?.[0]?.count ?? 0,
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
};

export type Companero = { id: string; nombre: string };

export type Cargo = {
  id: string;
  nombre: string;
  correo: string;
  funciones: FuncionDelCargo[];
  // Lo que el administrador dejo a medias. Vacio si no hay nada pendiente.
  borrador: { funcionId: string; ponderacion: number }[];
  // A quien se le puede traspasar: todos menos quien ya la tiene.
  companeros: Companero[];
};

// El cargo de una persona: lo que tiene a su nombre ahora. La ponderacion sale
// del vinculo, que es donde vive desde CEB-130.
export async function cargoDe(empleadoId: string): Promise<Cargo | null> {
  const supabase = await clienteDelServidor();

  const { data: empleado } = await supabase
    .from('empleado')
    .select('id, nombre_bloque, correo')
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
    .select('id, nombre_bloque')
    .neq('id', empleadoId)
    .order('nombre_bloque');

  const { data: pendiente } = await supabase
    .from('titularidad')
    .select('funcion_id, ponderacion')
    .eq('empleado_id', empleadoId)
    .is('publicado_en', null);

  const funciones = ((data ?? []) as Record<string, unknown>[])
    .map((t) => {
      const f = t.funcion as Record<string, unknown>;
      return {
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
    funciones,
    borrador: (pendiente ?? []).map((t) => ({
      funcionId: t.funcion_id as string,
      ponderacion: t.ponderacion as number,
    })),
    companeros: (otros ?? []).map((e) => ({ id: e.id as string, nombre: e.nombre_bloque as string })),
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
