import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-41 · Los segmentos de una persona suman exactamente su ponderacion
// arrastrada, y nunca mas de 100 (CEB-215). Se prueba sobre el cableado real:
// lo que leen el administrador (lib/equipo.ts) y la supervisora
// (lib/supervisor.ts) con sus sesiones, y la cuenta de la barra encima. Solo se
// sustituyen las cookies de Next.
const next = await vi.hoisted(async () => ({ sesion: null as SupabaseClient | null }));
vi.mock('@/lib/supabase/servidor', () => ({ clienteDelServidor: async () => next.sesion }));

const { datosDelEquipo } = await import('../../apps/web/src/lib/equipo');
const { loDeMiGente } = await import('../../apps/web/src/lib/supervisor');
const { barrasDe } = await import('../../apps/web/src/lib/tablero');
const { Calendario } = await import('@matriz/dominio');

const hoy = new Date().toISOString().slice(0, 10);
const mesPasado = new Date(Date.UTC(+hoy.slice(0, 4), +hoy.slice(5, 7) - 2, 1)).toISOString().slice(0, 7);
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
let bruno: string;
let jefa: SupabaseClient;
let sesionSara: SupabaseClient;

beforeAll(async () => {
  await vaciar();
  const servicio = comoServicio();
  const sara = await sembrarEmpleado('SARA', 'sara@prueba.test');
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  bruno = await sembrarEmpleado('BRUNO', 'bruno@prueba.test');
  await servicio.from('empleado').update({ supervisor_id: sara }).in('id', [ana, bruno]);

  // Ana: dos funciones con arrastre, una sin arrastre, y cotidianidad 40.
  const cierre = await sembrarFuncion(ana, { ...funcion('Cierre'), ponderacion: 30 });
  const conciliacion = await sembrarFuncion(ana, { ...funcion('Conciliacion', { periodicidad: 'semanal' }), ponderacion: 20 });
  await sembrarFuncion(ana, { ...funcion('Informe', { fecha_alta: hoy }), ponderacion: 10 });
  // Bruno: todo sin cumplir. Noventa en una funcion que arrastra y su cotidianidad en el piso.
  const todo = await sembrarFuncion(bruno, { ...funcion('Todo'), ponderacion: 90 });
  await servicio.from('titularidad').update({ desde: haceTresMeses }).in('funcion_id', [cierre, conciliacion, todo]);

  jefa = await comoAdministrador('jefa@prueba.test');
  const quien = (await jefa.auth.getUser()).data.user!.id;
  const imprevisto = (empleado: string, texto: string, dia: string, resultado: string, razon: string | null = 'no hubo tiempo') => ({
    empleado_id: empleado,
    texto,
    vence: dia,
    pedido_en: `${dia}T08:00:00Z`,
    pedido_por_otro: 'el banco',
    registrado_por: quien,
    resultado,
    razon: resultado === 'hecho' ? null : razon,
    marcada_en: `${dia}T09:00:00Z`,
  });

  // El "no pude" del cierre del mes pasado se vinculo a un imprevisto: intromision.
  const { data: causa, error: sinCausa } = await servicio
    .from('imprevisto')
    .insert(imprevisto(ana, 'La auditoria', `${mesPasado}-10`, 'hecho'))
    .select('id')
    .single();
  if (sinCausa) throw sinCausa;
  const { data: noPude } = await servicio
    .from('marca')
    .insert({ funcion_id: cierre, periodo: mesPasado, resultado: 'no_pude', razon: 'la auditoria', marcada_en: `${mesPasado}-20T10:00:00Z` })
    .select('id')
    .single();
  await servicio.from('intromision').insert({ imprevisto_id: causa!.id, marca_id: noPude!.id });

  // Este mes: ana cumplio uno de dos imprevistos; bruno, ninguno.
  const { error } = await servicio.from('imprevisto').insert([
    imprevisto(ana, 'Hecho', hoy, 'hecho'),
    imprevisto(ana, 'No pudo', hoy, 'no_pude'),
    imprevisto(bruno, 'Tampoco', hoy, 'no_pude'),
  ]);
  if (error) throw error;

  sesionSara = await comoEmpleado('sara@prueba.test');
});

async function lasBarras(como: 'administrador' | 'supervisora') {
  const { data: dias } = await comoServicio().from('dia_no_habil').select('desde, hasta');
  if (como === 'administrador') {
    next.sesion = jefa;
    return barrasDe(await datosDelEquipo(), hoy, Calendario.con(dias ?? []));
  }
  next.sesion = sesionSara;
  const { datos, calendario } = await loDeMiGente();
  return barrasDe(datos, hoy, calendario);
}

describe('INV-41: los segmentos suman la ponderacion arrastrada, y nunca mas de cien', () => {
  for (const como of ['administrador', 'supervisora'] as const) {
    it(`${como}: dos funciones con arrastre y la cotidianidad sin cumplir; lo rayado dentro de su segmento`, async () => {
      const barra = (await lasBarras(como)).find((b) => b.persona.id === ana)!;

      // Cierre 30, conciliacion 20, y la mitad de su cotidianidad (40): 20.
      expect(barra.segmentos.map((s) => [s.tipo === 'funcion' ? s.texto : s.tipo, s.peso])).toEqual([
        ['Cierre', 30],
        ['Conciliacion', 20],
        ['cotidianidad', 20],
      ]);
      expect(barra.segmentos.reduce((t, s) => t + s.peso, 0)).toBe(barra.total);
      expect(barra.total).toBe(70);

      const delCierre = barra.segmentos[0]!;
      expect(delCierre.desplazado).toBeGreaterThan(0);
      for (const s of barra.segmentos) expect(s.desplazado).toBeLessThanOrEqual(s.peso);
      expect(barra.desplazado).toBe(delCierre.desplazado);
    });

    it(`${como}: aunque todo este sin cumplir, la barra llega a cien y no pasa`, async () => {
      const barra = (await lasBarras(como)).find((b) => b.persona.id === bruno)!;
      expect(barra.segmentos.reduce((t, s) => t + s.peso, 0)).toBe(barra.total);
      expect(barra.total).toBe(100);
    });
  }
});
