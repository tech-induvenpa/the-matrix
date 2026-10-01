import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-42 · Un imprevisto borrado no aparece en ninguna grafica, en ninguna
// lista de cerradas ni en ninguna fila de la descarga (CEB-215). Se borran un
// imprevisto abierto y otro marcado "no pude" -- vinculado a un "no pude" de lo
// previsto --, y una de dos delegaciones. Todo pasa por el cableado real: las
// lecturas del administrador y de la supervisora, y la ruta de la descarga.
// Solo se sustituyen las cookies de Next.
const next = await vi.hoisted(async () => {
  const { createRequire } = await import('node:module');
  const web = createRequire(new URL('../../apps/web/package.json', import.meta.url));
  return { sesion: null as SupabaseClient | null, servidor: web.resolve('next/server') };
});
vi.mock('@/lib/supabase/servidor', () => ({ clienteDelServidor: async () => next.sesion }));

const { datosDelEquipo, lasDelegaciones } = await import('../../apps/web/src/lib/equipo');
const { loDeMiGente } = await import('../../apps/web/src/lib/supervisor');
const { barrasDe, cargasDe, masDelegadas } = await import('../../apps/web/src/lib/tablero');
const { GET: descargar } = await import('../../apps/web/src/app/admin/descarga/route');
const { NextRequest } = (await import(next.servidor)) as typeof import('next/server');
const { Calendario, cerradasDelMes, ocurrenciasEntre } = await import('@matriz/dominio');

const hoy = new Date().toISOString().slice(0, 10);
// El mes del reloj de las pruebas, que se cuenta en Caracas: de 20:00 a 24:00
// del ultimo dia, en UTC ya es el mes siguiente.
const mes = RELOJ_DE_LAS_PRUEBAS.slice(0, 7);
const haceTresMeses = new Date(Date.UTC(+hoy.slice(0, 4), +hoy.slice(5, 7) - 4, 1)).toISOString().slice(0, 10);

const funcion = (texto: string, extra: Record<string, unknown> = {}) => ({
  hash_identidad: `h-${texto}`,
  texto,
  importancia: 5,
  periodicidad: 'mensual',
  tipo_generado: 'entregable',
  fecha_alta: '2026-01-01',
  ...extra,
});

let ana: string;
let caja: string;
let jefa: SupabaseClient;
let sesionSara: SupabaseClient;
let calendario: InstanceType<typeof Calendario>;

beforeAll(async () => {
  await vaciar();
  const servicio = comoServicio();
  const { data: dias } = await servicio.from('dia_no_habil').select('desde, hasta');
  calendario = Calendario.con(dias ?? []);

  const sara = await sembrarEmpleado('SARA', 'sara@prueba.test');
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  await servicio.from('empleado').update({ supervisor_id: sara }).eq('id', ana);
  const cierre = await sembrarFuncion(ana, { ...funcion('Cierre'), ponderacion: 30 });
  await servicio.from('titularidad').update({ desde: haceTresMeses }).eq('funcion_id', cierre);
  caja = await sembrarFuncion(sara, { ...funcion('Caja', { periodicidad: 'diaria' }), ponderacion: 20 });

  jefa = await comoAdministrador('jefa@prueba.test');
  const quien = (await jefa.auth.getUser()).data.user!.id;
  const imprevisto = (texto: string, extra: Record<string, unknown> = {}) => ({
    empleado_id: ana,
    texto,
    vence: hoy,
    pedido_en: `${hoy}T08:00:00Z`,
    pedido_por_otro: 'el banco',
    registrado_por: quien,
    ...extra,
  });
  const { data: borrados, error } = await servicio
    .from('imprevisto')
    .insert([
      imprevisto('BORRADO-ABIERTO'),
      imprevisto('BORRADO-NO-PUDE', { resultado: 'no_pude', razon: 'RAZON-BORRADA', marcada_en: `${hoy}T09:00:00Z` }),
    ])
    .select('id, texto');
  if (error) throw error;

  // El "no pude" del cierre de este mes se lo llevo el imprevisto que se borra.
  const { data: noPude } = await servicio
    .from('marca')
    .insert({ funcion_id: cierre, periodo: mes, resultado: 'no_pude', razon: 'la auditoria', marcada_en: `${hoy}T10:00:00Z` })
    .select('id')
    .single();
  const causa = borrados!.find((i) => i.texto === 'BORRADO-NO-PUDE')!;
  await servicio.from('intromision').insert({ imprevisto_id: causa.id, marca_id: noPude!.id });

  // Sara le delega a ana dos ocurrencias de su caja que aun no vencen.
  sesionSara = await comoEmpleado('sara@prueba.test');
  await comoEmpleado('ana@prueba.test');
  const proximas = ocurrenciasEntre({ periodicidad: 'diaria', fechaAlta: '2026-01-01' }, calendario, hoy, `${+hoy.slice(0, 4) + 1}${hoy.slice(4)}`)
    .filter((o) => o.vence >= hoy)
    .slice(0, 2);
  const delegadas: string[] = [];
  for (const o of proximas) {
    const { data, error: sinDelegar } = await sesionSara.rpc('delegar', { la_funcion: caja, el_periodo: o.periodo, a_quien: ana, el_vence: o.vence });
    if (sinDelegar) throw sinDelegar;
    delegadas.push(data as string);
  }

  // Se borran los dos imprevistos y una de las dos delegaciones.
  const { error: sinBorrar } = await servicio
    .from('imprevisto')
    .update({ borrado_en: new Date().toISOString(), borrado_por: quien })
    .in('id', [...borrados!.map((i) => i.id), delegadas[0]!]);
  if (sinBorrar) throw sinBorrar;
});

const lecturas = async () => {
  next.sesion = jefa;
  const admin = await datosDelEquipo();
  next.sesion = sesionSara;
  const { datos: supervisora } = await loDeMiGente();
  return { admin, supervisora };
};

describe('INV-42: un imprevisto borrado no cuenta en nada', () => {
  it('ni en la carga: solo queda la delegacion que no se borro', async () => {
    for (const datos of Object.values(await lecturas())) {
      const [carga] = cargasDe(datos, hoy).filter((c) => c.persona.id === ana);
      // Cotidianidad 70: una abierta son 1/7 por cada 10%.
      expect(carga!.carga.total).toBeCloseTo(1 / 7);
    }
  });

  it('ni en el segmento de cotidianidad, ni en lo desplazado', async () => {
    for (const datos of Object.values(await lecturas())) {
      const barra = barrasDe(datos, hoy, calendario).find((b) => b.persona.id === ana)!;
      expect(barra.segmentos.map((s) => s.tipo)).toEqual(['funcion']);
      expect(barra.desplazado).toBe(0);
    }
  });

  it('ni en las delegaciones: con la borrada fuera, una sola no es repetirse', async () => {
    next.sesion = jefa;
    expect(masDelegadas(await lasDelegaciones(false), hoy, calendario)).toEqual([]);
    next.sesion = sesionSara;
    expect(masDelegadas(await lasDelegaciones(true), hoy, calendario)).toEqual([]);
  });

  it('ni entre las cerradas del mes', async () => {
    // Lo que pinta el perfil, y la regla sobre todas las filas, borradas incluidas.
    for (const datos of Object.values(await lecturas())) {
      const cerradas = cerradasDelMes(
        [],
        datos.imprevistos.filter((i) => i.empleado_id === ana).map((i) => ({ ...i, marcadaEn: i.marcada_en, borradoEn: i.borrado_en })),
        hoy,
      );
      expect(cerradas.map((c) => c.tarea.texto)).not.toContain('BORRADO-NO-PUDE');
    }
    const { data: todas } = await jefa.from('imprevisto').select('texto, marcada_en, borrado_en').eq('empleado_id', ana);
    const cerradas = cerradasDelMes([], (todas ?? []).map((i) => ({ ...i, marcadaEn: i.marcada_en, borradoEn: i.borrado_en })), hoy);
    expect(cerradas).toEqual([]);
  });

  it('ni en la descarga', async () => {
    next.sesion = jefa;
    const respuesta = await descargar(new NextRequest(`http://localhost/admin/descarga?mes=${mes}`));
    const csv = await respuesta.text();
    expect(csv).toContain('RAZON');
    expect(csv).toContain('Cierre');
    expect(csv).not.toContain('BORRADO-');
    expect(csv).not.toContain('RAZON-BORRADA');
  });
});
