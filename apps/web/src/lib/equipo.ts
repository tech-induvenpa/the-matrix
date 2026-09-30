import { arrastreDe, estadosVigentes, ocurrenciasEntre, type Arrastre, type Calendario, type Periodicidad } from '@matriz/dominio';
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

export type ComoVaUnaFuncion = {
  id: string;
  texto: string;
  periodicidad: string;
  tipo: string | null;
  ponderacion: number;
  // Un entregable arrastra; un flujo esta al dia o atrasado desde una fecha,
  // con su razon vigente. Un area no se mide: ninguna de las dos.
  arrastre: Arrastre | null;
  atraso: { desde: string; razon: string | null } | null;
};

// Como va cada funcion de una persona, ahora mismo.
export function comoVanSusFunciones(datos: DatosDelEquipo, empleadoId: string, hoy: string, calendario: Calendario): ComoVaUnaFuncion[] {
  const vigentes = new Map(
    estadosVigentes(
      datos.eventos.map((e) => ({ funcionId: e.funcion_id, estado: e.estado, razon: e.razon ?? undefined, en: e.en })),
    ).map((e) => [e.funcionId, e]),
  );

  return datos.funciones
    .filter((f) => f.empleado_id === empleadoId)
    .map((f): ComoVaUnaFuncion => {
      const base = { id: f.id, texto: f.texto, periodicidad: f.periodicidad, tipo: f.tipo, ponderacion: f.ponderacion, arrastre: null, atraso: null };
      if (f.tipo === 'flujo') {
        const v = vigentes.get(f.id);
        // El atraso empieza con el primer "atrasado" despues del ultimo "al dia";
        // la razon es la del ultimo que se declaro.
        if (v?.estado !== 'atrasado') return base;
        const ultimoAlDia = datos.eventos.filter((e) => e.funcion_id === f.id && e.estado === 'al_dia').at(-1)?.en ?? '';
        const primero = datos.eventos.find((e) => e.funcion_id === f.id && e.estado === 'atrasado' && e.en > ultimoAlDia);
        return { ...base, atraso: { desde: (primero ?? v).en.slice(0, 10), razon: v.razon ?? null } };
      }
      if (f.tipo !== 'entregable') return base;
      // El arrastre de quien la tiene hoy empieza cuando empezo a tenerla. Solo
      // "hecho" cumple: un "no pude" no corta el arrastre.
      const ocurrencias = ocurrenciasEntre(
        { periodicidad: f.periodicidad, diaTope: f.dia_tope ?? undefined, fechaAlta: f.fecha_alta },
        calendario,
        f.desde,
        hoy,
      );
      const cerradas = datos.marcas.filter((m) => m.funcion_id === f.id && m.resultado === 'hecho');
      return { ...base, arrastre: arrastreDe(ocurrencias, cerradas, hoy) };
    });
}
