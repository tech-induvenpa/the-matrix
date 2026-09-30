import { Calendario, conceptoDe, estadoDelMes } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { esAdministrador } from '@/lib/administrador';
import { escapar } from '@/lib/datos';
import { lasReaperturas } from '@/lib/cierre-del-mes';
import { nombreDelMes, nominaDelMes } from '@/lib/nomina';
import { SIN_EMPRESA, TODAS } from '@/lib/nomina-por-empresa';
import { NextResponse, type NextRequest } from 'next/server';

// "Nomina del mes" (CEB-233): lo que hay que pagarle del bono a cada persona,
// para finanzas. Un archivo por mes y por empresa, con un bloque por persona:
// su bono, un descuento por cada parte no cumplida y el total a pagar. Sale
// del mismo modulo que "El mes" y "Su nomina", asi que las cifras son las
// mismas. La descarga de siempre no cambia: sigue siendo el detalle.
//
// La empresa puede ser una, todas (un solo archivo, con la columna EMPRESA
// al frente) o ninguna: quien no tiene empresa asignada tambien cobra.
//
// Solo de meses cerrados: el mes en curso es provisional. Quien no tiene bono
// ese mes no aparece. La empresa es la de hoy: quien cambio de empresa en el
// mes aparece entero en la de su empresa al cierre (la nomina, como el bono,
// nunca parte un mes).
const CABECERA = ['PERSONA', 'CONCEPTO', 'MONTO'];


// Con coma decimal, como la lee Excel en español: el separador ya es el punto
// y coma por lo mismo. Siempre con sus dos centavos.
const monto = (n: number) => n.toFixed(2).replace('.', ',');

export async function GET(request: NextRequest) {
  if (!(await esAdministrador())) return new NextResponse(null, { status: 404 });

  const mes = request.nextUrl.searchParams.get('mes') ?? '';
  const empresaId = request.nextUrl.searchParams.get('empresa') ?? '';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return new NextResponse(null, { status: 404 });

  const supabase = await clienteDelServidor();
  const todas = empresaId === TODAS;
  const ninguna = empresaId === SIN_EMPRESA;
  const deLaEmpresa = supabase.from('empleado').select('id, nombre_bloque, empresa(nombre)').order('nombre_bloque');
  const [{ data: dias }, { data: empresa }, { data: gente }, reaperturas] = await Promise.all([
    supabase.from('dia_no_habil').select('desde, hasta'),
    todas || ninguna ? Promise.resolve({ data: null }) : supabase.from('empresa').select('nombre').eq('id', empresaId).maybeSingle(),
    todas ? deLaEmpresa : ninguna ? deLaEmpresa.is('empresa_id', null) : deLaEmpresa.eq('empresa_id', empresaId),
    lasReaperturas(),
  ]);
  if (!todas && !ninguna && !empresa) return new NextResponse(null, { status: 404 });
  const nombreDeEmpresa = (e: Record<string, unknown>) => ((e.empresa as { nombre?: string } | null)?.nombre ?? 'Sin empresa');
  // En el de todas, agrupado por empresa y, dentro, por nombre.
  const ordenada = todas
    ? [...(gente ?? [])].sort((a, b) => nombreDeEmpresa(a).localeCompare(nombreDeEmpresa(b)) || String(a.nombre_bloque).localeCompare(String(b.nombre_bloque)))
    : (gente ?? []);

  const estado = estadoDelMes(mes, Calendario.con(dias ?? []), new Date().toISOString(), reaperturas);
  if (estado.estado !== 'cerrado') return new NextResponse('Ese mes todavía no cerró: su nómina es provisional.', { status: 409 });

  const filas: string[][] = [];
  for (const e of ordenada) {
    const { nomina } = await nominaDelMes(e.id as string, mes);
    if (!nomina) continue;
    const persona = e.nombre_bloque as string;
    const al = (fila: string[]) => filas.push(todas ? [nombreDeEmpresa(e), ...fila] : fila);
    al([persona, `Bono de ${nombreDelMes(mes)}`, monto(nomina.bono)]);
    for (const l of nomina.lineas) al([persona, conceptoDe(l), monto(-l.descuento)]);
    al([persona, 'Total a pagar', monto(nomina.total)]);
  }

  const csv = [todas ? ['EMPRESA', ...CABECERA] : CABECERA, ...filas].map((f) => f.map(escapar).join(';')).join('\n');
  // El BOM le dice a Excel que viene en UTF-8, como en la descarga de siempre.
  const BOM = String.fromCharCode(0xfeff);
  const nombre = (todas ? 'todas' : ninguna ? 'sin empresa' : (empresa!.nombre as string)).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');

  return new NextResponse(`${BOM}${csv}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="nomina-${mes}-${nombre}.csv"`,
      'cache-control': 'no-store, max-age=0',
    },
  });
}
