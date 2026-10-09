import { Calendario, ocurrenciasEntre, unaPorFuncion, type Periodicidad, type PorVencer } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { claveDeImprevisto, claveDeOcurrencia } from '@/lib/comentarios';
import { sumarDias } from '@/lib/datos';

type FilaFuncion = {
  id: string;
  periodicidad: Periodicidad;
  fecha_alta: string;
  dia_tope_generado: number | null;
  dia_tope_corregido: number | null;
  tipo_generado: string;
  tipo_corregido: string | null;
};

// Las tareas sin marcar de quien entra que todavia no vencen (CEB-271): la
// proxima ocurrencia de cada entregable y sus imprevistos abiertos. La
// seguridad por fila decide que es suyo; el administrador no tiene funciones.
export async function tareasPorVencer(hoy: string): Promise<{ tareas: PorVencer[]; calendario: Calendario }> {
  const supabase = await clienteDelServidor();
  const [{ data: funciones }, { data: noHabiles }, { data: marcas }, { data: imprevistos }] = await Promise.all([
    supabase
      .from('funcion')
      .select('id, periodicidad, fecha_alta, dia_tope_generado, dia_tope_corregido, tipo_generado, tipo_corregido, titularidad!inner(id)')
      .eq('activa', true),
    supabase.from('dia_no_habil').select('desde, hasta'),
    supabase.from('marca').select('funcion_id, periodo'),
    supabase.from('imprevisto').select('id, vence').is('resultado', null).is('borrado_en', null).gte('vence', hoy),
  ]);

  const calendario = Calendario.con(noHabiles ?? []);
  const marcadas = new Set((marcas ?? []).map((m) => `${m.funcion_id}|${m.periodo}`));

  const abiertas = ((funciones ?? []) as FilaFuncion[])
    .filter((f) => (f.tipo_corregido ?? f.tipo_generado) === 'entregable')
    .flatMap((f) =>
      ocurrenciasEntre(
        { periodicidad: f.periodicidad, diaTope: f.dia_tope_corregido ?? f.dia_tope_generado ?? undefined, fechaAlta: f.fecha_alta },
        calendario,
        hoy,
        sumarDias(hoy, 14),
      )
        .filter((o) => !marcadas.has(`${f.id}|${o.periodo}`))
        .map((o) => ({ ...o, funcionId: f.id, periodicidad: f.periodicidad })),
    );

  const tareas: PorVencer[] = [
    ...unaPorFuncion(abiertas).map((o) => ({ clave: claveDeOcurrencia(o.funcionId, o.periodo), vence: o.vence, periodicidad: o.periodicidad })),
    ...(imprevistos ?? []).map((i) => ({ clave: claveDeImprevisto(i.id as string), vence: i.vence as string })),
  ];
  return { tareas, calendario };
}
