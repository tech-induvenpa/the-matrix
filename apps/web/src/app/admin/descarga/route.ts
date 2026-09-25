import { arrastreDe, Calendario, cumplimientoDeLaHolgura, ocurrenciasEntre, type Periodicidad, type Resultado } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { esAdministrador } from '@/lib/administrador';
import { hoyISO } from '@/lib/datos';
import { NextResponse, type NextRequest } from 'next/server';

// La salida hacia la hoja de sueldos. Es una funcion de la pantalla, no una
// integracion: cero credenciales que custodiar y sigue siendo el administrador
// quien decide que entra a su documento (ADR 0007).
//
// Una fila por persona x mes x funcion, que es el hecho suelto. No un resumen:
// resumir obliga a elegir por quien lee, y desde el hecho cualquier resumen
// sale con una tabla dinamica.
//
// La version anterior era una sola cifra por persona y resulto ilegible: dos
// personas en la misma situacion -- un entregable, ninguna marca -- salian con
// 100 y con 0, segun si su ocurrencia ya habia vencido. Un cien podia
// significar "lo hizo todo" o "no le tocaba nada", y el archivo no distinguia.
//
// Lleva porcentajes y ningun monto: el impacto salarial ES el porcentaje, y el
// monto aparece cuando el administrador multiplica en su hoja (INV-1).
const MESES = 3;

const CABECERA = [
  'MES',
  'CERRADO',
  'PERSONA',
  'FUNCION',
  'TIPO',
  'PERIODICIDAD',
  'PONDERACION',
  'ASIGNADAS',
  'CERRADAS',
  'SIN CUMPLIR',
  'ATRASOS',
  'ESTADO AL CIERRE',
  'PESO NO CUMPLIDO',
  'ARRASTRE',
  'ARRASTRA DESDE',
];

const mesesHaciaAtras = (hoy: string, cuantos: number) => {
  const anio = +hoy.slice(0, 4);
  const mes = +hoy.slice(5, 7);
  return Array.from({ length: cuantos }, (_, i) =>
    new Date(Date.UTC(anio, mes - 1 - (cuantos - 1 - i), 1)).toISOString().slice(0, 7),
  );
};

const finDe = (mes: string) =>
  new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).toISOString().slice(0, 10);

// Los nombres de las funciones llevan barras, parentesis y comas. El punto y
// coma no aparece hoy, pero basta con que alguien lo escriba una vez.
const escapar = (v: string | number) => {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(request: NextRequest) {
  if (!(await esAdministrador())) return new NextResponse(null, { status: 404 });

  const hoy = hoyISO();
  const cuantos = Number(request.nextUrl.searchParams.get('meses') ?? MESES);
  const meses = mesesHaciaAtras(hoy, Number.isInteger(cuantos) && cuantos > 0 ? cuantos : MESES);
  const desde = `${meses[0]}-01`;

  const supabase = await clienteDelServidor();

  const [{ data: dias }, { data: titularidades }, { data: marcas }, { data: eventos }, { data: imprevistos }] = await Promise.all([
    supabase.from('dia_no_habil').select('desde, hasta'),
    supabase
      .from('titularidad')
      .select(
        'ponderacion, empleado_id, empleado(nombre_bloque), funcion!inner(id, texto, periodicidad, fecha_alta, tipo_generado, tipo_corregido, activa)',
      )
      .is('hasta', null)
      .not('publicado_en', 'is', null),
    supabase.from('marca').select('funcion_id, periodo'),
    supabase.from('evento_flujo').select('funcion_id, estado, en').order('en'),
    // La holgura se cumple con los imprevistos de su titular (CEB-158).
    supabase.from('imprevisto').select('empleado_id, vence, resultado, borrado_en').gte('vence', desde),
  ]);

  const imprevistosDe = (empleadoId: string) =>
    (imprevistos ?? [])
      .filter((i) => i.empleado_id === empleadoId)
      .map((i) => ({ vence: i.vence as string, resultado: i.resultado as Resultado | null, borradoEn: i.borrado_en as string | null }));

  const calendario = Calendario.con(dias ?? []);
  const cerradas = new Set((marcas ?? []).map((m) => `${m.funcion_id}|${m.periodo}`));

  const marcasDe = new Map<string, { periodo: string }[]>();
  for (const m of marcas ?? []) {
    const clave = m.funcion_id as string;
    marcasDe.set(clave, [...(marcasDe.get(clave) ?? []), { periodo: m.periodo as string }]);
  }

  const filas: string[] = [];

  for (const t of (titularidades ?? []) as Record<string, unknown>[]) {
    const f = t.funcion as Record<string, unknown>;
    if (!f.activa) continue;

    const funcionId = f.id as string;
    const tipo = ((f.tipo_corregido ?? f.tipo_generado) as string | null) ?? 'sin tipo';
    const persona = ((t.empleado as { nombre_bloque?: string } | null)?.nombre_bloque ?? '') as string;
    const ponderacion = t.ponderacion as number;
    const esEntregable = tipo === 'entregable';
    const esHolgura = tipo === 'holgura';

    const ocurrenciasEn = (hasta: string, inicio: string) =>
      ocurrenciasEntre(
        { periodicidad: f.periodicidad as Periodicidad, fechaAlta: f.fecha_alta as string },
        calendario,
        inicio,
        hasta,
      );

    for (const mes of meses) {
      const enCurso = mes === hoy.slice(0, 7);
      const ultimo = enCurso ? hoy : finDe(mes);

      // Un flujo no vence: no tiene ocurrencias, tiene estado. Medirlo como un
      // entregable seria inventarle un denominador.
      const ocurrencias = esEntregable ? ocurrenciasEn(ultimo, `${mes}-01`) : [];
      const hechas = ocurrencias.filter((o) => cerradas.has(`${funcionId}|${o.periodo}`)).length;
      const sinCumplir = ocurrencias.length - hechas;

      const suyos = (eventos ?? []).filter(
        (e) => e.funcion_id === funcionId && (e.en as string).slice(0, 10) <= ultimo,
      );
      const delMes = suyos.filter((e) => (e.en as string).slice(0, 7) === mes);
      const atrasos = delMes.filter((e) => e.estado === 'atrasado').length;
      const alCierre = suyos.length ? ((suyos.at(-1)!.estado as string) === 'atrasado' ? 'atrasado' : 'al dia') : '';

      // La holgura no tiene ocurrencias: se cumple con los imprevistos que
      // vencieron ese mes. Antes salia siempre en cero, pagada sin rendir
      // cuentas.
      const holgura = esHolgura
        ? cumplimientoDeLaHolgura(imprevistosDe(t.empleado_id as string), { desde: `${mes}-01`, hasta: ultimo }, hoy)
        : null;

      // El peso que no se cumplio. En un entregable es la fraccion que quedo
      // sin cerrar, y en la holgura la fraccion de imprevistos sin cumplir; en
      // un flujo es todo su peso si termino el mes atrasado, porque un flujo no
      // se cumple a medias: o se esta atendiendo o no.
      const fraccion = (sin: number, de: number) => (de ? Math.round(((ponderacion * sin) / de) * 10) / 10 : 0);
      const noCumplido = esEntregable
        ? fraccion(sinCumplir, ocurrencias.length)
        : holgura
          ? fraccion(holgura.sinCumplir, holgura.esperados)
          : alCierre === 'atrasado'
            ? ponderacion
            : 0;

      // El arrastre al cerrar ese mes, no el de hoy: pegarle el de hoy a una
      // fila de julio seria contar lo que paso despues.
      const arrastre = esEntregable
        ? arrastreDe(ocurrenciasEn(ultimo, desde), marcasDe.get(funcionId) ?? [], ultimo)
        : { periodos: 0, desde: null };

      // Toda funcion sale todos los meses, aunque no tuviera nada que cumplir.
      // Saltarse esas filas repetiria el error de la version anterior: la
      // ausencia de fila es tan ambigua como un cien: no se sabe si es que no
      // le tocaba o que la funcion no existe.

      filas.push(
        [
          mes,
          enCurso ? 'no' : 'si',
          persona,
          f.texto as string,
          tipo,
          f.periodicidad as string,
          ponderacion,
          esEntregable ? ocurrencias.length : (holgura?.esperados ?? ''),
          esEntregable ? hechas : (holgura?.hechos ?? ''),
          esEntregable ? sinCumplir : (holgura?.sinCumplir ?? ''),
          esEntregable || holgura ? '' : atrasos,
          esEntregable || holgura ? '' : alCierre,
          noCumplido,
          arrastre.periodos || '',
          arrastre.desde ?? '',
        ]
          .map(escapar)
          .join(';'),
      );
    }
  }

  const csv = [CABECERA.join(';'), ...filas].join('\n');

  // El BOM es lo que le dice a Excel que esto viene en UTF-8; sin el, los
  // acentos de los nombres salen rotos. Y punto y coma, no coma: con coma,
  // Excel en español lo mete todo en una sola columna.
  const BOM = String.fromCharCode(0xfeff);

  return new NextResponse(`${BOM}${csv}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="cumplimiento-${meses[0]}-a-${meses.at(-1)}.csv"`,
      // Sin esto el navegador se guarda la descarga y la vuelve a servir: tras
      // cambiar el reporte seguia bajando el de antes, con su nombre viejo.
      // Un archivo que cambia con los datos no se cachea nunca.
      'cache-control': 'no-store, max-age=0',
    },
  });
}
