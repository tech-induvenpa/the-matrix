import {
  arrastreDe,
  Calendario,
  cifrasPor,
  ponderacionDesplazada,
  type Cifras,
  ocurrenciasEntre,
  ponderacionArrastrada,
  type Arrastre,
  type Periodicidad,
} from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { COLUMNAS_DE_IMPREVISTO, hoyISO, quienPidio, type FilaImprevisto, type QuienPide } from '@/lib/datos';

export type FuncionDelReporte = {
  funcionId: string;
  texto: string;
  periodicidad: string;
  ponderacion: number;
  // Lo que arrastra quien la tiene hoy: se reinicia en el traspaso, porque
  // nadie hereda la mora de otro.
  delTitular: Arrastre;
  // Lo que arrastra la funcion, cruzando a todos sus titulares. Una funcion
  // que dos personas seguidas no pudieron sostener no es un problema de
  // ninguna de las dos.
  deLaFuncion: Arrastre;
  manos: number;
};

export type PersonaDelReporte = {
  id: string;
  nombre: string;
  arrastrado: number;
  // Cuantas funciones suyas arrastran, pesen lo que pesen. Una funcion de cero
  // por ciento existe para verse, no para pesar: si solo miraramos el peso,
  // seria invisible justo cuando hay algo que mirar.
  arrastrando: number;
  funciones: FuncionDelReporte[];
};

// Cuanto para atras se mira. Un año basta para ver un patron y no tanto como
// para que el calculo se note.
const DESDE_HACE = 365;

export async function reporte(): Promise<PersonaDelReporte[]> {
  const supabase = await clienteDelServidor();
  const hoy = hoyISO();
  const desde = new Date(Date.parse(`${hoy}T00:00:00Z`) - DESDE_HACE * 864e5).toISOString().slice(0, 10);

  const [{ data: dias }, { data: titularidades }, { data: marcas }] = await Promise.all([
    supabase.from('dia_no_habil').select('desde, hasta'),
    supabase
      .from('titularidad')
      .select(
        'funcion_id, empleado_id, ponderacion, desde, hasta, publicado_en, empleado(nombre_bloque), funcion!inner(texto, periodicidad, fecha_alta, tipo_generado, tipo_corregido, activa)',
      ),
    supabase.from('marca').select('funcion_id, periodo'),
  ]);

  const calendario = Calendario.con(dias ?? []);
  const cerradasPor = new Map<string, { periodo: string }[]>();
  for (const m of marcas ?? []) {
    const clave = m.funcion_id as string;
    cerradasPor.set(clave, [...(cerradasPor.get(clave) ?? []), { periodo: m.periodo as string }]);
  }

  const todas = (titularidades ?? []) as Record<string, unknown>[];
  const manosPor = new Map<string, number>();
  for (const t of todas) {
    const clave = t.funcion_id as string;
    manosPor.set(clave, (manosPor.get(clave) ?? 0) + 1);
  }

  const ocurrenciasDe = (f: Record<string, unknown>, desdeCuando: string, hastaCuando: string) =>
    ocurrenciasEntre(
      {
        periodicidad: f.periodicidad as Periodicidad,
        fechaAlta: f.fecha_alta as string,
        diaTope: undefined,
      },
      calendario,
      desdeCuando,
      hastaCuando,
    );

  const gente = new Map<string, PersonaDelReporte>();

  for (const t of todas) {
    const funcion = t.funcion as Record<string, unknown>;
    const tipo = (funcion.tipo_corregido ?? funcion.tipo_generado) as string | null;

    // Solo los entregables vencen: un flujo o un area no arrastran nada.
    if (!funcion.activa || tipo !== 'entregable') continue;
    if (t.hasta !== null || t.publicado_en === null) continue;

    const funcionId = t.funcion_id as string;
    const empleadoId = t.empleado_id as string;
    const cerradas = cerradasPor.get(funcionId) ?? [];

    // El arrastre del titular empieza cuando empezo su tenencia.
    const suyas = ocurrenciasDe(funcion, (t.desde as string) > desde ? (t.desde as string) : desde, hoy);
    const todasLas = ocurrenciasDe(funcion, desde, hoy);

    const fila: FuncionDelReporte = {
      funcionId,
      texto: funcion.texto as string,
      periodicidad: funcion.periodicidad as string,
      ponderacion: t.ponderacion as number,
      delTitular: arrastreDe(suyas, cerradas, hoy),
      deLaFuncion: arrastreDe(todasLas, cerradas, hoy),
      manos: manosPor.get(funcionId) ?? 1,
    };

    const nombre = ((t.empleado as { nombre_bloque?: string } | null)?.nombre_bloque ?? '') as string;
    const persona = gente.get(empleadoId) ?? { id: empleadoId, nombre, arrastrado: 0, arrastrando: 0, funciones: [] };
    persona.funciones.push(fila);
    gente.set(empleadoId, persona);
  }

  // El orden primero es por ponderacion arrastrada: cuanto del cargo de alguien
  // esta sin cumplirse es lo unico comparable entre personas y entre cadencias
  // (ADR 0007). Pero a igual peso manda cuantas arrastran, y eso saca a flote a
  // quien solo arrastra funciones de cero por ciento: saber que paso con una
  // funcion importa aunque no mueva sueldo.
  return [...gente.values()]
    .map((p) => ({
      ...p,
      arrastrado: ponderacionArrastrada(p.funciones.map((f) => ({ ...f, arrastre: f.delTitular }))),
      arrastrando: p.funciones.filter((f) => f.delTitular.periodos > 0).length,
      funciones: p.funciones.sort(
        (a, b) => b.deLaFuncion.periodos - a.deLaFuncion.periodos || b.ponderacion - a.ponderacion,
      ),
    }))
    .sort(
      (a, b) => b.arrastrado - a.arrastrado || b.arrastrando - a.arrastrando || a.nombre.localeCompare(b.nombre),
    );
}

export type RazonDelPanel = {
  en: string;
  persona: string;
  personaId: string;
  funcion: string;
  funcionId: string;
  quePaso: string;
  razon: string;
};

// Lo que reemplaza a la pestaña de razones. Filtrable por persona y por
// funcion, que es algo que la pestaña nunca pudo hacer y es la mitad del
// motivo para traerlas aqui (ADR 0006).
//
// Sin llave de servicio: la seguridad por fila es la que hace que esto traiga
// las de todos, porque quien pregunta es el administrador.
export async function razonesDelEquipo(): Promise<RazonDelPanel[]> {
  const supabase = await clienteDelServidor();

  const [{ data: marcas }, { data: eventos }, { data: titularidades }] = await Promise.all([
    supabase.from('marca').select('funcion_id, periodo, resultado, razon, marcada_en').not('razon', 'is', null),
    supabase.from('evento_flujo').select('funcion_id, estado, razon, en').not('razon', 'is', null),
    supabase
      .from('titularidad')
      .select('funcion_id, desde, hasta, empleado_id, empleado(nombre_bloque), funcion(texto)'),
  ]);

  // Quien tenia la funcion cuando se escribio: atribuir al titular de hoy le
  // colgaria a alguien las palabras de otro.
  const tenencias = ((titularidades ?? []) as Record<string, unknown>[]).map((t) => ({
    funcionId: t.funcion_id as string,
    empleadoId: t.empleado_id as string,
    persona: ((t.empleado as { nombre_bloque?: string } | null)?.nombre_bloque ?? '') as string,
    funcion: ((t.funcion as { texto?: string } | null)?.texto ?? '') as string,
    desde: t.desde as string,
    hasta: (t.hasta as string | null) ?? '9999-12-31',
  }));

  const quienLaTenia = (funcionId: string, cuando: string) =>
    tenencias.find((t) => t.funcionId === funcionId && t.desde <= cuando && cuando <= t.hasta) ??
    tenencias.find((t) => t.funcionId === funcionId);

  const deMarcas = (marcas ?? []).map((m) => {
    const en = (m.marcada_en as string).slice(0, 10);
    const t = quienLaTenia(m.funcion_id as string, en);
    return {
      en,
      persona: t?.persona ?? '',
      personaId: t?.empleadoId ?? '',
      funcion: t?.funcion ?? '',
      funcionId: m.funcion_id as string,
      quePaso: m.resultado === 'no_pude' ? 'no pude' : 'hecho',
      razon: m.razon as string,
    };
  });

  const deFlujos = (eventos ?? []).map((e) => {
    const en = (e.en as string).slice(0, 10);
    const t = quienLaTenia(e.funcion_id as string, en);
    return {
      en,
      persona: t?.persona ?? '',
      personaId: t?.empleadoId ?? '',
      funcion: t?.funcion ?? '',
      funcionId: e.funcion_id as string,
      quePaso: e.estado === 'atrasado' ? 'me atrasé' : 'me puse al día',
      razon: e.razon as string,
    };
  });

  return [...deMarcas, ...deFlujos].sort((a, b) => b.en.localeCompare(a.en));
}

export type ImprevistosDeUnaPersona = {
  id: string;
  nombre: string;
  cifras: Cifras | undefined;
  // Cuanto de su cargo dejo de cumplirse por intromision. Peso salarial en
  // porcentaje: existe solo aqui, del lado del administrador (INV-22).
  desplazada: number;
  vinculos: { imprevisto: string; previsto: string }[];
  imprevistos: FilaImprevisto[];
};

// Los imprevistos del mes, del equipo entero (CEB-154, CEB-155). Responde las
// tres preguntas de CEB-146: cuantos le caen a cada quien, si los termina, y
// cuanto de lo previsto desplazaron. Los textos van tal cual: reconocer a ojo
// el imprevisto que se repite es como se descubre una funcion sin dar de alta.
export async function imprevistosDelEquipo() {
  const supabase = await clienteDelServidor();
  const hoy = hoyISO();
  const primeroDelMes = `${hoy.slice(0, 7)}-01`;

  const [{ data: dias }, { data: gente }, { data: filas }, { data: vinculos }, { data: titularidades }, { data: quienes }] =
    await Promise.all([
      supabase.from('dia_no_habil').select('desde, hasta'),
      supabase.from('empleado').select('id, nombre_bloque').order('nombre_bloque'),
      // Lo del mes, y lo de antes que siga abierto: un imprevisto muerto de
      // agosto es justo lo que hay que ver en septiembre.
      supabase
        .from('imprevisto')
        .select(COLUMNAS_DE_IMPREVISTO)
        .is('borrado_en', null)
        .or(`pedido_en.gte.${primeroDelMes},resultado.is.null`)
        .order('pedido_en'),
      supabase.from('intromision').select('imprevisto_id, marca(funcion_id), evento_flujo(funcion_id)'),
      supabase.from('titularidad').select('funcion_id, empleado_id, ponderacion, hasta, funcion(texto)'),
      supabase.rpc('quienes_piden'),
    ]);

  const calendario = Calendario.con(dias ?? []);
  const imprevistos = (filas ?? []) as FilaImprevisto[];
  const quienesPiden = (quienes ?? []) as QuienPide[];
  const contables = imprevistos.map((i) => ({ ...i, marcadaEn: i.marcada_en, borradoEn: i.borrado_en }));

  const porPersona = cifrasPor(contables, (i) => i.empleado_id, hoy, calendario);
  const porQuienPidio = cifrasPor(contables, (i) => quienPidio(i, quienesPiden), hoy, calendario);

  // El peso de un previsto es el del vinculo con quien lo tenia. Si la tuvo
  // dos veces, manda la tenencia vigente.
  // ponytail: si la funcion cambio de peso este mes, cuenta el peso de hoy.
  type Tenencia = { funcion_id: string; empleado_id: string; ponderacion: number; hasta: string | null; funcion: { texto: string } | null };
  const tenencia = new Map<string, Tenencia>();
  for (const t of (titularidades ?? []) as unknown as Tenencia[]) {
    const clave = `${t.funcion_id}|${t.empleado_id}`;
    if (!tenencia.has(clave) || t.hasta === null) tenencia.set(clave, t);
  }

  const delImprevisto = new Map(imprevistos.map((i) => [i.id, i]));
  type Vinculo = { imprevisto_id: string; marca: { funcion_id: string } | null; evento_flujo: { funcion_id: string } | null };
  const desplazados = new Map<string, { funcionId: string; ponderacion: number; imprevisto: string; previsto: string }[]>();
  for (const v of (vinculos ?? []) as unknown as Vinculo[]) {
    const i = delImprevisto.get(v.imprevisto_id);
    const funcionId = v.marca?.funcion_id ?? v.evento_flujo?.funcion_id;
    if (!i || !funcionId) continue;
    const t = tenencia.get(`${funcionId}|${i.empleado_id}`);
    const lista = desplazados.get(i.empleado_id) ?? [];
    lista.push({ funcionId, ponderacion: t?.ponderacion ?? 0, imprevisto: i.texto, previsto: t?.funcion?.texto ?? '—' });
    desplazados.set(i.empleado_id, lista);
  }

  const personas: ImprevistosDeUnaPersona[] = (gente ?? [])
    .map((e) => ({
      id: e.id as string,
      nombre: e.nombre_bloque as string,
      cifras: porPersona.get(e.id as string),
      desplazada: ponderacionDesplazada(desplazados.get(e.id as string) ?? []),
      vinculos: (desplazados.get(e.id as string) ?? []).map(({ imprevisto, previsto }) => ({ imprevisto, previsto })),
      imprevistos: imprevistos.filter((i) => i.empleado_id === e.id),
    }))
    .filter((p) => p.cifras)
    // Lo que mas desplaza primero, como la ponderacion arrastrada ordena el
    // resto del reporte.
    .sort((a, b) => b.desplazada - a.desplazada || (b.cifras?.llegados ?? 0) - (a.cifras?.llegados ?? 0));

  return { hoy, calendario, quienesPiden, personas, porQuienPidio: [...porQuienPidio] };
}
