import { Calendario, cumplimientoPonderado, ocurrenciasEntre, type Periodicidad } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { esAdministrador } from '@/lib/administrador';
import { hoyISO } from '@/lib/datos';
import { NextResponse, type NextRequest } from 'next/server';

// La salida hacia la hoja de sueldos. Es una funcion de la pantalla, no una
// integracion: cero credenciales que custodiar, cero posibilidad de escribir
// mal en la hoja de nadie, y sigue siendo el administrador quien decide que
// entra a su documento (ADR 0007).
//
// Lleva porcentajes y ningun monto. El impacto salarial ES el porcentaje; el
// monto aparece cuando el administrador multiplica en su hoja (INV-1).
export async function GET(request: NextRequest) {
  if (!(await esAdministrador())) return new NextResponse(null, { status: 404 });

  const hoy = hoyISO();
  const mes = request.nextUrl.searchParams.get('mes') ?? hoy.slice(0, 7);
  const primero = `${mes}-01`;
  const finDeMes = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).toISOString().slice(0, 10);

  // En el mes en curso solo cuenta lo que ya vencio. Contar todo el mes desde
  // el dia uno diria que todo el mundo esta en cero hasta fin de mes, que es
  // un numero que nadie puede leer.
  const ultimo = finDeMes > hoy ? hoy : finDeMes;

  const supabase = await clienteDelServidor();

  const [{ data: dias }, { data: titularidades }, { data: marcas }] = await Promise.all([
    supabase.from('dia_no_habil').select('desde, hasta'),
    supabase
      .from('titularidad')
      .select(
        'ponderacion, empleado_id, empleado(nombre_bloque), funcion!inner(id, periodicidad, fecha_alta, tipo_generado, tipo_corregido, activa)',
      )
      .is('hasta', null)
      .not('publicado_en', 'is', null),
    supabase.from('marca').select('funcion_id, periodo').gte('periodo', mes).lte('periodo', `${mes}-￿`),
  ]);

  const calendario = Calendario.con(dias ?? []);
  const cerradas = new Set((marcas ?? []).map((m) => `${m.funcion_id}|${m.periodo}`));

  const porPersona = new Map<string, { nombre: string; cargo: { ponderacion: number; asignadas: number; cerradas: number }[] }>();

  for (const t of (titularidades ?? []) as Record<string, unknown>[]) {
    const funcion = t.funcion as Record<string, unknown>;
    const tipo = (funcion.tipo_corregido ?? funcion.tipo_generado) as string | null;
    if (!funcion.activa || tipo !== 'entregable') continue;

    const ocurrencias = ocurrenciasEntre(
      { periodicidad: funcion.periodicidad as Periodicidad, fechaAlta: funcion.fecha_alta as string },
      calendario,
      primero,
      ultimo,
    );

    const persona = porPersona.get(t.empleado_id as string) ?? {
      nombre: ((t.empleado as { nombre_bloque?: string } | null)?.nombre_bloque ?? '') as string,
      cargo: [],
    };

    persona.cargo.push({
      ponderacion: t.ponderacion as number,
      asignadas: ocurrencias.length,
      cerradas: ocurrencias.filter((o) => cerradas.has(`${funcion.id}|${o.periodo}`)).length,
    });

    porPersona.set(t.empleado_id as string, persona);
  }

  // Punto y coma, que es lo que Excel en español espera; con coma, todo cae en
  // una sola columna y hay que pelearse con el asistente de importacion.
  const filas = [...porPersona.values()]
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map((p) => [p.nombre, cumplimientoPonderado(p.cargo)].join(';'));

  const csv = ['PERSONA;CUMPLIMIENTO', ...filas].join('\n');

  // El BOM es lo que le dice a Excel que esto viene en UTF-8; sin el, los
  // acentos de los nombres salen rotos.
  const BOM = String.fromCharCode(0xfeff);

  return new NextResponse(`${BOM}${csv}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="cumplimiento-${mes}.csv"`,
    },
  });
}
