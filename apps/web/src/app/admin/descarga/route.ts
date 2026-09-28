import {
  atrasosDelFlujo,
  bonoDelMes,
  Calendario,
  diasHabilesDelMes,
  hechosDeEntregable,
  hechosDeHolgura,
  ocurrenciasEntre,
  type Periodicidad,
  type Resultado,
} from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { esAdministrador } from '@/lib/administrador';
import { comoCambios, hoyISO } from '@/lib/datos';
import { NextResponse, type NextRequest } from 'next/server';

// La salida hacia la hoja de sueldos. Es una funcion de la pantalla, no una
// integracion: cero credenciales que custodiar y sigue siendo el administrador
// quien decide que entra a su documento (ADR 0007).
//
// El hecho suelto: una fila por cada vez que algo debia hacerse (ADR 0011). Una
// ocurrencia vencida de un entregable, un imprevisto de la holgura, o un
// episodio de atraso de un flujo. Cualquier resumen sale con una tabla
// dinamica; resumir aqui obligaria a elegir por quien lee, y las versiones que
// resumian terminaron confundiendo ("cerradas" contaba los "no pude" como
// cumplidos). El area no sale: no se mide.
const CABECERA = [
  'MES', // A
  'PERSONA', // B
  'FUNCION', // C
  'TIPO', // D
  'PERIODICIDAD', // E
  'QUE', // F: el periodo de la ocurrencia, o el texto del imprevisto
  'VENCE', // G: en un flujo, desde cuando esta atrasado
  'RESULTADO', // H
  'CUMPLIO', // I: 1 o 0; vacio en "no lo tome" y en los atrasos
  'DIAS ATRASADOS', // J: solo flujos
  'PONDERACION', // K
  'VECES EN EL MES', // L: ocurrencias, imprevistos esperados o dias habiles
  'PESO NO CUMPLIDO', // M
  'BONO', // N: el del mes de la fila, no el de hoy (ADR 0010)
  'MONTO NO CUMPLIDO', // O
];

const RESULTADO: Record<string, string> = {
  hecho: 'hecho',
  no_pude: 'no pude',
  no_lo_tome: 'no lo tome',
  sin_marcar: 'vencio sin marcar',
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
  // Un mes a la vez, el que se elige en el menu. Sin mes, o con uno que no es
  // AAAA-MM, el mes en curso. Un mes futuro no tiene nada que cumplir todavia.
  const pedido = request.nextUrl.searchParams.get('mes') ?? '';
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) && pedido <= hoy.slice(0, 7) ? pedido : hoy.slice(0, 7);
  const meses = [mes];
  const desde = `${mes}-01`;

  const supabase = await clienteDelServidor();

  const [{ data: dias }, { data: titularidades }, { data: marcas }, { data: eventos }, { data: imprevistos }, { data: bonos }] =
    await Promise.all([
      supabase.from('dia_no_habil').select('desde, hasta'),
      supabase
        .from('titularidad')
        .select(
          'ponderacion, empleado_id, empleado(nombre_bloque), funcion!inner(id, texto, periodicidad, fecha_alta, tipo_generado, tipo_corregido, dia_tope_generado, dia_tope_corregido, activa)',
        )
        .is('hasta', null)
        .not('publicado_en', 'is', null),
      supabase.from('marca').select('funcion_id, periodo, resultado'),
      supabase.from('evento_flujo').select('funcion_id, estado, en').order('en'),
      supabase.from('imprevisto').select('empleado_id, texto, vence, resultado, borrado_en').gte('vence', desde),
      supabase.from('bono').select('empleado_id, monto, rige_desde'),
    ]);

  const calendario = Calendario.con(dias ?? []);
  const bonosDe = (empleadoId: string) => comoCambios((bonos ?? []).filter((b) => b.empleado_id === empleadoId));
  const marcasDe = (funcionId: string) =>
    (marcas ?? []).filter((m) => m.funcion_id === funcionId).map((m) => ({ periodo: m.periodo as string, resultado: m.resultado as string }));
  const eventosDe = (funcionId: string) =>
    (eventos ?? [])
      .filter((e) => e.funcion_id === funcionId)
      .map((e) => ({ estado: e.estado as 'al_dia' | 'atrasado', en: e.en as string }));
  const imprevistosDe = (empleadoId: string) =>
    (imprevistos ?? [])
      .filter((i) => i.empleado_id === empleadoId)
      .map((i) => ({
        texto: i.texto as string,
        vence: i.vence as string,
        resultado: i.resultado as Resultado | null,
        borradoEn: i.borrado_en as string | null,
      }));

  const filas: string[] = [];

  for (const t of (titularidades ?? []) as Record<string, unknown>[]) {
    const f = t.funcion as Record<string, unknown>;
    const tipo = (f.tipo_corregido ?? f.tipo_generado) as string | null;
    if (!f.activa || (tipo !== 'entregable' && tipo !== 'holgura' && tipo !== 'flujo')) continue;

    const funcionId = f.id as string;
    const empleadoId = t.empleado_id as string;
    const persona = (t.empleado as { nombre_bloque?: string } | null)?.nombre_bloque ?? '';
    const ponderacion = t.ponderacion as number;
    const diaTope = (f.dia_tope_corregido ?? f.dia_tope_generado ?? undefined) as number | undefined;

    for (const mes of meses) {
      // En el mes en curso solo cuenta lo que ya vencio: lo demas aun se puede
      // cumplir.
      const tramo = { desde: `${mes}-01`, hasta: mes === hoy.slice(0, 7) ? hoy : finDe(mes) };
      const bono = bonoDelMes(bonosDe(empleadoId), mes);

      // Cada fila sabe su numero, porque las cuentas van como formulas: si el
      // administrador corrige una celda, lo que depende de ella se recalcula.
      // Solo aritmetica, sin funciones (SI/IF) que cambian de nombre segun el
      // idioma del Excel. Sin bono, el monto queda vacio y no en cero: no es lo
      // mismo no saberlo que no cobrar bono.
      const escribir = (celdas: {
        que: string;
        vence: string;
        resultado: string;
        cumplio: 0 | 1 | null;
        dias: number | '';
        veces: number;
        peso: (n: number) => string | number;
      }) => {
        const n = filas.length + 2; // la fila 1 es la cabecera
        filas.push(
          [
            mes,
            persona,
            f.texto as string,
            tipo,
            f.periodicidad as string,
            celdas.que,
            celdas.vence,
            celdas.resultado,
            celdas.cumplio ?? '',
            celdas.dias,
            ponderacion,
            celdas.veces,
            celdas.peso(n),
            bono ?? '',
            bono === null ? '' : `=M${n}*N${n}/100`,
          ]
            .map(escapar)
            .join(';'),
        );
      };

      if (tipo === 'entregable') {
        const ocurrencias = ocurrenciasEntre(
          { periodicidad: f.periodicidad as Periodicidad, diaTope, fechaAlta: f.fecha_alta as string },
          calendario,
          tramo.desde,
          tramo.hasta,
        ).filter((o) => o.vence <= tramo.hasta);

        for (const h of hechosDeEntregable(ocurrencias, marcasDe(funcionId))) {
          escribir({
            ...h,
            resultado: RESULTADO[h.resultado]!,
            dias: '',
            veces: ocurrencias.length,
            peso: (n) => `=K${n}/L${n}*(1-I${n})`,
          });
        }
      }

      if (tipo === 'holgura') {
        const { filas: hechos, veces } = hechosDeHolgura(imprevistosDe(empleadoId), tramo, hoy);
        for (const h of hechos) {
          escribir({
            ...h,
            resultado: RESULTADO[h.resultado]!,
            dias: '',
            veces,
            // "No lo tome" es neutro: peso cero, como valor.
            peso: (n) => (h.cumplio === null ? 0 : `=K${n}/L${n}*(1-I${n})`),
          });
        }
      }

      if (tipo === 'flujo') {
        // Se da por cumplido salvo lo que se declare: solo salen los atrasos.
        // Las veces son los dias habiles del mes entero, asi que cada dia
        // atrasado vale lo mismo en cualquier momento del mes.
        const veces = diasHabilesDelMes({ desde: tramo.desde, hasta: finDe(mes) }, calendario);
        for (const a of atrasosDelFlujo(eventosDe(funcionId), tramo, calendario)) {
          escribir({
            que: '',
            vence: a.desde,
            resultado: 'atrasado',
            cumplio: null,
            dias: a.dias,
            veces,
            peso: (n) => `=K${n}/L${n}*J${n}`,
          });
        }
      }
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
      'content-disposition': `attachment; filename="cumplimiento-${mes}.csv"`,
      // Sin esto el navegador se guarda la descarga y la vuelve a servir: tras
      // cambiar el reporte seguia bajando el de antes, con su nombre viejo.
      // Un archivo que cambia con los datos no se cachea nunca.
      'cache-control': 'no-store, max-age=0',
    },
  });
}
