import {
  bonoDelMes,
  Calendario,
  cotidianidadDe,
  estadoDelMes,
  fotoDelCierre,
  nominaDe,
  nominaDeLaFoto,
  partesDelMes,
  tareasDelMes,
  merecenFuegos,
  reaperturasDeLaNomina,
  type EstadoDelMes,
  type FotoDelCierre,
  type Nomina,
  type ParteDelCargo,
  type Periodicidad,
  type ReaperturaDeLaNomina,
  type Resultado,
} from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { comoCambios, hoyISO, sumarDias } from '@/lib/datos';
import { ahoraEnLaBase, lasReaperturas } from '@/lib/cierre-del-mes';
import { esAdministrador } from '@/lib/administrador';

// Con sus reaperturas, si las hubo (CEB-232).
export type NominaDelMes = {
  mes: string;
  nomina: Nomina | null;
  estado: EstadoDelMes;
  reaperturas: ReaperturaDeLaNomina[];
  // Cuantas tareas se cumplieron, haya bono o no: de ahi salen los fuegos.
  tareas: { hechas: number; total: number };
};

// La nomina de una persona en un mes (ADR 0016). Lee lo mismo que la descarga
// (admin/descarga/route.ts) --las titularidades vigentes, sus marcas y sus
// eventos, los imprevistos que vencen en el mes y el bono-- y lo cuenta con el
// mismo dominio, asi que nunca se contradicen. Se lee con la sesion de quien
// mira: la seguridad por fila decide (INV-3). El empleado lee lo suyo y el
// administrador lo de todos; el supervisor no lee bonos, asi que no le sale
// ninguna nomina.
export async function nominaDelMes(empleadoId: string, mes: string): Promise<NominaDelMes> {
  const supabase = await clienteDelServidor();

  const [{ data: dias }, reaperturas, { data: totales }, ahora] = await Promise.all([
    supabase.from('dia_no_habil').select('desde, hasta'),
    lasReaperturas(),
    supabase.from('total_al_reabrir').select('reapertura_id, total').eq('empleado_id', empleadoId),
    ahoraEnLaBase(),
  ]);

  const calendario = Calendario.con(dias ?? []);
  const estado = estadoDelMes(mes, calendario, ahora, reaperturas);

  // Un mes cerrado se lee de su foto (ADR 0017). Si todavia no la tiene, nada
  // de ese mes se movio desde el cierre -- la base no lo deja --, y en vivo
  // sale lo mismo.
  const { nomina, partes } =
    (estado.estado === 'cerrado' ? await laFoto(empleadoId, mes) : null) ?? (await enVivo(empleadoId, mes, calendario));

  const tareas = tareasDelMes(partes);
  if (!nomina) return { mes, nomina: null, estado, reaperturas: [], tareas };
  const totalAntes = (id: string) => {
    const t = (totales ?? []).find((x) => x.reapertura_id === id);
    return t ? Number(t.total) : null;
  };
  const suyas = reaperturas.filter((r) => r.mes === mes).map((r) => ({ ...r, totalAntes: totalAntes(r.id) }));

  return { mes, nomina, estado, reaperturas: reaperturasDeLaNomina(suyas, nomina.total, ahora), tareas };
}

type Cuenta = { bono: number | null; nomina: Nomina | null; partes: readonly ParteDelCargo[] };

// La cuenta en vivo, con el reparto y el bono de hoy.
async function enVivo(empleadoId: string, mes: string, calendario: Calendario): Promise<Cuenta> {
  const supabase = await clienteDelServidor();
  const hoy = hoyISO();

  const [{ data: titularidades }, { data: imprevistos }, { data: bonos }] = await Promise.all([
    supabase
      .from('titularidad')
      .select(
        'ponderacion, funcion!inner(id, texto, periodicidad, fecha_alta, tipo_generado, tipo_corregido, dia_tope_generado, dia_tope_corregido, activa)',
      )
      .eq('empleado_id', empleadoId)
      .is('hasta', null)
      .not('publicado_en', 'is', null),
    supabase
      .from('imprevisto')
      .select('vence, texto, resultado, borrado_en, devuelto_en')
      .eq('empleado_id', empleadoId)
      .gte('vence', `${mes}-01`),
    supabase.from('bono').select('monto, rige_desde').eq('empleado_id', empleadoId),
  ]);

  const bono = bonoDelMes(comoCambios(bonos), mes);
  const activas = ((titularidades ?? []) as Record<string, unknown>[])
    .map((t) => ({ ponderacion: t.ponderacion as number, f: t.funcion as Record<string, unknown> }))
    .filter((t) => t.f.activa);
  const ids = activas.map((t) => t.f.id as string);

  const [{ data: marcas }, { data: eventos }] = await Promise.all([
    supabase.from('marca').select('funcion_id, periodo, resultado').in('funcion_id', ids),
    supabase.from('evento_flujo').select('funcion_id, estado, en').in('funcion_id', ids).order('en'),
  ]);

  const funciones = activas.flatMap(({ ponderacion, f }) => {
    const tipo = (f.tipo_corregido ?? f.tipo_generado) as string | null;
    if (tipo !== 'entregable' && tipo !== 'flujo') return [];
    const id = f.id as string;
    return [
      {
        funcionId: id,
        nombre: f.texto as string,
        tipo: tipo as 'entregable' | 'flujo',
        ponderacion,
        periodicidad: f.periodicidad as Periodicidad,
        diaTope: (f.dia_tope_corregido ?? f.dia_tope_generado ?? undefined) as number | undefined,
        fechaAlta: f.fecha_alta as string,
        marcas: (marcas ?? []).filter((m) => m.funcion_id === id).map((m) => ({ periodo: m.periodo as string, resultado: m.resultado as string })),
        eventos: (eventos ?? [])
          .filter((e) => e.funcion_id === id)
          .map((e) => ({ estado: e.estado as 'al_dia' | 'atrasado', en: e.en as string })),
      },
    ];
  });

  const partes = partesDelMes({
    mes,
    hoy,
    calendario,
    funciones,
    // Todas las activas, areas incluidas: lo que no pesan es la cotidianidad.
    cotidianidad: cotidianidadDe(activas.map((t) => ({ funcionId: t.f.id as string, ponderacion: t.ponderacion }))),
    imprevistos: (imprevistos ?? []).map((i) => ({
      texto: i.texto as string,
      vence: i.vence as string,
      resultado: i.resultado as Resultado | null,
      borradoEn: i.borrado_en as string | null,
      devueltoEn: i.devuelto_en as string | null,
    })),
  });

  return { bono, nomina: nominaDe(bono, partes), partes };
}

// La foto de un mes cerrado, si la tiene. Si no, y quien mira es el
// administrador, la toma: es la primera vez que hace falta.
async function laFoto(empleadoId: string, mes: string): Promise<Cuenta | null> {
  const supabase = await clienteDelServidor();
  const leer = () => supabase.from('foto_del_cierre').select('empresa_id, bono, total, partes').eq('mes', mes).eq('empleado_id', empleadoId).maybeSingle();

  let { data } = await leer();
  if (!data && (await esAdministrador())) {
    await tomarLasFotos();
    ({ data } = await leer());
  }
  if (!data) return null;

  const foto = comoFoto(data);
  return { bono: foto.bono, nomina: nominaDeLaFoto(foto), partes: foto.partes };
}

// Una fila de foto_del_cierre, con sus montos como numeros.
export const comoFoto = (f: Record<string, unknown>): FotoDelCierre => ({
  empresaId: (f.empresa_id as string | null) ?? null,
  bono: f.bono === null ? null : Number(f.bono),
  total: f.total === null ? null : Number(f.total),
  partes: f.partes as FotoDelCierre['partes'],
});

// Las fotos que faltan (ADR 0017): la de cada mes cerrado que todavia no la
// tiene, con la nomina de cada persona en vivo, que es la del cierre porque
// desde entonces nada de ese mes se movio. Solo el administrador: la base
// rechaza a cualquier otro. Se llama al leer un mes cerrado y antes de todo
// lo que la base no deja hacer sin foto -- publicar pesos, fijar un bono,
// cambiar una empresa, reabrir --.
// Devuelve por que no se pudo, si no se pudo.
// ponytail: una nomina por persona y por mes, una tras otra; son decenas, y
// casi siempre falta un solo mes.
export async function tomarLasFotos(): Promise<string | null> {
  const supabase = await clienteDelServidor();
  const { data: meses } = await supabase.rpc('meses_sin_foto');
  if (!meses?.length) return null;

  const [{ data: dias }, { data: personas }] = await Promise.all([
    supabase.from('dia_no_habil').select('desde, hasta'),
    supabase.from('empleado').select('id, empresa_id'),
  ]);
  const calendario = Calendario.con(dias ?? []);

  for (const mes of meses as string[]) {
    const fotos = [];
    for (const p of personas ?? []) {
      const { bono, partes } = await enVivo(p.id as string, mes, calendario);
      const foto = fotoDelCierre({ empresaId: (p.empresa_id as string | null) ?? null, bono, partes });
      fotos.push({ empleado_id: p.id, empresa_id: foto.empresaId, bono: foto.bono, total: foto.total, partes: foto.partes });
    }
    const { error } = await supabase.rpc('tomar_foto_del_cierre', { el_mes: mes, fotos });
    if (error) return `No se pudo tomar la foto del cierre de ${nombreDelMes(mes)}: ${error.message}`;
  }
  return null;
}

export const nombreDelMes = (mes: string) =>
  new Intl.DateTimeFormat('es', { month: 'long', timeZone: 'UTC' }).format(new Date(`${mes}-01T00:00:00Z`));

// Los fuegos de fin de mes: el ultimo mes cerrado de la persona -- el de hoy si
// ya cerro, que pasa la noche de su ultimo habil; si no, el anterior -- y si
// cumplio mas del 90% de sus tareas.
export async function fuegosDe(empleadoId: string): Promise<{ mes: string; merece: boolean }> {
  const esteMes = hoyISO().slice(0, 7);
  const actual = await nominaDelMes(empleadoId, esteMes);
  const cerrado = actual.estado.estado === 'cerrado' ? actual : await nominaDelMes(empleadoId, sumarDias(`${esteMes}-01`, -1).slice(0, 7));
  return { mes: cerrado.mes, merece: cerrado.estado.estado === 'cerrado' && merecenFuegos(cerrado.tareas) };
}
