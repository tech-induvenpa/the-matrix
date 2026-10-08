import { VENTANA_DE_DELEGACION, type Periodicidad } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { COLUMNAS_DE_IMPREVISTO, sumarDias, type FilaImprevisto } from '@/lib/datos';

// Lo que el administrador y el supervisor leen de la gente, en una sola forma
// (CEB-215). Al supervisor se lo da lo_de_mi_gente (ADR 0015); al
// administrador, las tablas, que la seguridad por fila le abre enteras. Lo que
// se calcula encima es igual para los dos: cambia solo lo que cada uno recibe.

export type FuncionDelEquipo = {
  id: string;
  empleado_id: string;
  texto: string;
  importancia: number;
  periodicidad: Periodicidad;
  tipo: string | null;
  dia_tope: number | null;
  fecha_alta: string;
  // Desde cuando la tiene quien la tiene hoy: su arrastre empieza ahi.
  desde: string;
  ponderacion: number;
};

export type MarcaDelEquipo = { id: string; funcion_id: string; periodo: string; resultado: 'hecho' | 'no_pude'; razon: string | null; marcada_en: string };
export type EventoDelEquipo = { id: string; funcion_id: string; estado: 'al_dia' | 'atrasado'; razon: string | null; en: string };
export type IntromisionDelEquipo = { imprevisto_id: string; marca_id: string | null; evento_flujo_id: string | null };

export type DatosDelEquipo = {
  gente: { id: string; nombre: string; empresa: string | null; sede: string | null; cotidianidad: number }[];
  funciones: FuncionDelEquipo[];
  marcas: MarcaDelEquipo[];
  eventos: EventoDelEquipo[];
  imprevistos: FilaImprevisto[];
  intromisiones: IntromisionDelEquipo[];
};

// Lo mismo que lo_de_mi_gente, leido de las tablas con la sesion del
// administrador. `soloDe`: una persona, para su perfil.
export async function datosDelEquipo(soloDe?: string): Promise<DatosDelEquipo> {
  const supabase = await clienteDelServidor();
  let empleados = supabase.from('empleado').select('id, nombre_bloque, empresa_id, sede_id');
  let titularidades = supabase
    .from('titularidad')
    .select(
      'funcion_id, empleado_id, desde, ponderacion, funcion!inner(texto, importancia, periodicidad, tipo_generado, tipo_corregido, dia_tope_generado, dia_tope_corregido, fecha_alta)',
    )
    .is('hasta', null)
    .not('publicado_en', 'is', null)
    .eq('funcion.activa', true);
  // Dos meses, y lo que siga abierto: lo mismo que ve el supervisor.
  let abiertos = supabase
    .from('imprevisto')
    .select(COLUMNAS_DE_IMPREVISTO)
    .is('borrado_en', null)
    .or(`pedido_en.gte.${sumarDias(new Date().toISOString().slice(0, 10), -62)},resultado.is.null`);
  // Una persona sola, para su perfil.
  if (soloDe) {
    empleados = empleados.eq('id', soloDe);
    titularidades = titularidades.eq('empleado_id', soloDe);
    abiertos = abiertos.eq('empleado_id', soloDe);
  }

  const [{ data: gente }, { data: tenencias }, { data: imprevistos }] = await Promise.all([
    empleados.order('nombre_bloque'),
    titularidades,
    abiertos.order('pedido_en'),
  ]);

  const funciones: FuncionDelEquipo[] = ((tenencias ?? []) as Record<string, unknown>[]).map((t) => {
    const f = t.funcion as Record<string, unknown>;
    return {
      id: t.funcion_id as string,
      empleado_id: t.empleado_id as string,
      texto: f.texto as string,
      importancia: f.importancia as number,
      periodicidad: f.periodicidad as Periodicidad,
      tipo: (f.tipo_corregido ?? f.tipo_generado ?? null) as string | null,
      dia_tope: (f.dia_tope_corregido ?? f.dia_tope_generado ?? null) as number | null,
      fecha_alta: f.fecha_alta as string,
      desde: t.desde as string,
      ponderacion: t.ponderacion as number,
    };
  });
  const ids = funciones.map((f) => f.id);
  const desdeDe = new Map(funciones.map((f) => [f.id, f.desde]));

  const [{ data: marcas }, { data: eventos }, { data: intromisiones }] = await Promise.all([
    supabase.from('marca').select('id, funcion_id, periodo, resultado, razon, marcada_en').in('funcion_id', ids),
    supabase.from('evento_flujo').select('id, funcion_id, estado, razon, en').in('funcion_id', ids).order('en'),
    // Un imprevisto borrado no cuenta en ninguna cifra (INV-42), tampoco en lo desplazado.
    supabase.from('intromision').select('imprevisto_id, marca_id, evento_flujo_id, imprevisto!inner(borrado_en)').is('imprevisto.borrado_en', null),
  ]);

  // Lo de quien la tiene hoy, desde que la tiene: como lo_de_mi_gente.
  const suyo = (funcionId: string, cuando: string) => cuando.slice(0, 10) >= (desdeDe.get(funcionId) ?? '9999-12-31');

  return {
    gente: (gente ?? []).map((e) => ({
      id: e.id as string,
      nombre: e.nombre_bloque as string,
      empresa: (e.empresa_id as string | null) ?? null,
      sede: (e.sede_id as string | null) ?? null,
      cotidianidad: 100 - funciones.filter((f) => f.empleado_id === e.id).reduce((t, f) => t + f.ponderacion, 0),
    })),
    funciones,
    marcas: ((marcas ?? []) as MarcaDelEquipo[]).filter((m) => suyo(m.funcion_id, m.marcada_en)),
    eventos: ((eventos ?? []) as EventoDelEquipo[]).filter((e) => suyo(e.funcion_id, e.en)),
    imprevistos: (imprevistos ?? []) as FilaImprevisto[],
    intromisiones: ((intromisiones ?? []) as Record<string, unknown>[]).map((x) => ({
      imprevisto_id: x.imprevisto_id as string,
      marca_id: (x.marca_id as string | null) ?? null,
      evento_flujo_id: (x.evento_flujo_id as string | null) ?? null,
    })),
  };
}

// Lo que hace falta para las funciones mas delegadas (CEB-224): las funciones
// de quien delega, con su titular, y sus delegaciones de la ventana.
export type FuncionQueSeDelega = Pick<FuncionDelEquipo, 'id' | 'texto' | 'periodicidad' | 'dia_tope' | 'fecha_alta' | 'desde' | 'empleado_id'> & {
  titular: string;
};
export type DelegacionDelEquipo = { funcion_id: string; periodo: string; pedido_en: string; devuelto_en: string | null; borrado_en: string | null };

// El administrador ve todas; el supervisor, las que el delega: sus funciones
// (la seguridad por fila le da solo las suyas) y mis_delegaciones.
export async function lasDelegaciones(comoSupervisor: boolean): Promise<{ funciones: FuncionQueSeDelega[]; delegaciones: DelegacionDelEquipo[] }> {
  const supabase = await clienteDelServidor();
  const desde = sumarDias(new Date().toISOString().slice(0, 10), -VENTANA_DE_DELEGACION);

  const [{ data: tenencias }, { data: delegaciones }] = await Promise.all([
    supabase
      .from('titularidad')
      .select('funcion_id, empleado_id, desde, empleado(nombre_bloque), funcion!inner(texto, periodicidad, dia_tope_generado, dia_tope_corregido, fecha_alta)')
      .is('hasta', null)
      .not('publicado_en', 'is', null)
      .eq('funcion.activa', true),
    comoSupervisor
      ? supabase.rpc('mis_delegaciones')
      : supabase
          .from('imprevisto')
          .select('delega_funcion, delega_periodo, pedido_en, devuelto_en, borrado_en')
          .not('delega_funcion', 'is', null)
          .gte('pedido_en', desde),
  ]);

  return {
    funciones: ((tenencias ?? []) as Record<string, unknown>[]).map((t) => {
      const f = t.funcion as Record<string, unknown>;
      return {
        id: t.funcion_id as string,
        empleado_id: t.empleado_id as string,
        texto: f.texto as string,
        periodicidad: f.periodicidad as Periodicidad,
        dia_tope: (f.dia_tope_corregido ?? f.dia_tope_generado ?? null) as number | null,
        fecha_alta: f.fecha_alta as string,
        desde: t.desde as string,
        titular: ((t.empleado as { nombre_bloque?: string } | null)?.nombre_bloque ?? '') as string,
      };
    }),
    // Las de ocurrencias: las de imprevistos no tienen funcion que repetir.
    delegaciones: ((delegaciones ?? []) as Record<string, unknown>[]).filter((d) => d.delega_funcion != null).map((d) => ({
      funcion_id: d.delega_funcion as string,
      periodo: d.delega_periodo as string,
      pedido_en: d.pedido_en as string,
      devuelto_en: (d.devuelto_en as string | null) ?? null,
      // mis_delegaciones ya deja fuera las borradas.
      borrado_en: (d.borrado_en as string | null | undefined) ?? null,
    })),
  };
}
