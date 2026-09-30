import {
  bonoDelMes,
  Calendario,
  cotidianidadDe,
  estadoDelMes,
  nominaDe,
  partesDelMes,
  reaperturasDeLaNomina,
  type EstadoDelMes,
  type Nomina,
  type Periodicidad,
  type ReaperturaDeLaNomina,
  type Resultado,
} from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { comoCambios, hoyISO } from '@/lib/datos';
import { lasReaperturas } from '@/lib/cierre-del-mes';

// Con sus reaperturas, si las hubo (CEB-232).
export type NominaDelMes = { mes: string; nomina: Nomina | null; estado: EstadoDelMes; reaperturas: ReaperturaDeLaNomina[] };

// La nomina de una persona en un mes (ADR 0016). Lee lo mismo que la descarga
// (admin/descarga/route.ts) --las titularidades vigentes, sus marcas y sus
// eventos, los imprevistos que vencen en el mes y el bono-- y lo cuenta con el
// mismo dominio, asi que nunca se contradicen. Se lee con la sesion de quien
// mira: la seguridad por fila decide (INV-3). El empleado lee lo suyo y el
// administrador lo de todos; el supervisor no lee bonos, asi que no le sale
// ninguna nomina.
export async function nominaDelMes(empleadoId: string, mes: string): Promise<NominaDelMes> {
  const supabase = await clienteDelServidor();
  const hoy = hoyISO();

  const [{ data: dias }, { data: titularidades }, { data: imprevistos }, { data: bonos }, reaperturas, { data: totales }] = await Promise.all([
    supabase.from('dia_no_habil').select('desde, hasta'),
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
    lasReaperturas(),
    supabase.from('total_al_reabrir').select('reapertura_id, total').eq('empleado_id', empleadoId),
  ]);

  const calendario = Calendario.con(dias ?? []);
  const ahora = new Date().toISOString();
  const estado = estadoDelMes(mes, calendario, ahora, reaperturas);
  const bono = bonoDelMes(comoCambios(bonos), mes);
  if (bono === null) return { mes, nomina: null, estado, reaperturas: [] };

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

  const nomina = nominaDe(bono, partes)!;
  const totalAntes = (id: string) => {
    const t = (totales ?? []).find((x) => x.reapertura_id === id);
    return t ? Number(t.total) : null;
  };
  const suyas = reaperturas.filter((r) => r.mes === mes).map((r) => ({ ...r, totalAntes: totalAntes(r.id) }));

  return { mes, nomina, estado, reaperturas: reaperturasDeLaNomina(suyas, nomina.total, ahora) };
}

export const nombreDelMes = (mes: string) =>
  new Intl.DateTimeFormat('es', { month: 'long', timeZone: 'UTC' }).format(new Date(`${mes}-01T00:00:00Z`));
