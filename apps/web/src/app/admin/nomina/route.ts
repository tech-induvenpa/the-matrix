import { Calendario, conceptoDe, estadoDelMes, nominaDeLaFoto } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { esAdministrador } from '@/lib/administrador';
import { escapar } from '@/lib/datos';
import { ahoraEnLaBase, lasReaperturas } from '@/lib/cierre-del-mes';
import { comoFoto, nombreDelMes, tomarLasFotos } from '@/lib/nomina';
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
// Solo de meses cerrados: el mes en curso es provisional. Sale de la foto del
// cierre (ADR 0017), asi que no cambia aunque despues cambie un peso, un bono
// o una empresa. Quien no tiene bono ese mes no aparece. La empresa es la de
// la foto: quien cambio de empresa en el mes aparece entero en la de su
// empresa al cierre (la nomina, como el bono, nunca parte un mes).
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
  const [{ data: dias }, { data: empresa }, reaperturas, ahora] = await Promise.all([
    supabase.from('dia_no_habil').select('desde, hasta'),
    todas || ninguna ? Promise.resolve({ data: null }) : supabase.from('empresa').select('nombre').eq('id', empresaId).maybeSingle(),
    lasReaperturas(),
    ahoraEnLaBase(),
  ]);
  if (!todas && !ninguna && !empresa) return new NextResponse(null, { status: 404 });

  const estado = estadoDelMes(mes, Calendario.con(dias ?? []), ahora, reaperturas);
  if (estado.estado !== 'cerrado') return new NextResponse('Ese mes todavía no cerró: su nómina es provisional.', { status: 409 });

  // La primera vez que hace falta, la foto se toma aqui.
  const sinFoto = await tomarLasFotos();
  if (sinFoto) return new NextResponse(sinFoto, { status: 409 });
  const deLaFoto = supabase.from('foto_del_cierre').select('empresa_id, bono, total, partes, empleado(nombre_bloque), empresa(nombre)').eq('mes', mes);
  const { data: fotos } = await (todas ? deLaFoto : ninguna ? deLaFoto.is('empresa_id', null) : deLaFoto.eq('empresa_id', empresaId));

  const nombreDeEmpresa = (f: Record<string, unknown>) => ((f.empresa as { nombre?: string } | null)?.nombre ?? 'Sin empresa');
  const persona = (f: Record<string, unknown>) => (f.empleado as { nombre_bloque?: string } | null)?.nombre_bloque ?? '';
  // En el de todas, agrupado por empresa y, dentro, por nombre.
  const ordenada = [...((fotos ?? []) as Record<string, unknown>[])].sort(
    (a, b) => (todas ? nombreDeEmpresa(a).localeCompare(nombreDeEmpresa(b)) : 0) || persona(a).localeCompare(persona(b)),
  );

  const filas: string[][] = [];
  for (const f of ordenada) {
    const nomina = nominaDeLaFoto(comoFoto(f));
    if (!nomina) continue;
    const al = (fila: string[]) => filas.push(todas ? [nombreDeEmpresa(f), ...fila] : fila);
    al([persona(f), `Bono de ${nombreDelMes(mes)}`, monto(nomina.bono)]);
    for (const l of nomina.lineas) al([persona(f), conceptoDe(l), monto(-l.descuento)]);
    al([persona(f), 'Total a pagar', monto(nomina.total)]);
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
