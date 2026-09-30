import { Calendario } from '@matriz/dominio';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-40 · Un supervisor obtiene los pesos de su gente y nunca un monto
// (CEB-215, ADR 0015). Con una sesion real de supervisora: sus lecturas le
// devuelven, de cada persona a su cargo, las ponderaciones, la cotidianidad y
// su ponderacion arrastrada; ninguna devuelve bono, monto ni dolares, y
// ninguna devuelve pesos de alguien que no esta a su cargo.
//
// Las lecturas pasan por lib/supervisor.ts de verdad; lo unico que se
// sustituye es Next alrededor: las cookies son la sesion de la supervisora.
const next = await vi.hoisted(async () => ({ sesion: null as SupabaseClient | null }));
vi.mock('@/lib/supabase/servidor', () => ({ clienteDelServidor: async () => next.sesion }));

const { loDeMiGente } = await import('../../apps/web/src/lib/supervisor');
const { barrasDe } = await import('../../apps/web/src/lib/tablero');

const hoy = new Date().toISOString().slice(0, 10);
// El primer dia de hace tres meses: la tenencia viene de antes, y un mensual arrastra.
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

// Todas las claves de un JSON, a cualquier profundidad.
const claves = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.flatMap(claves)
    : v && typeof v === 'object'
      ? Object.entries(v).flatMap(([k, x]) => [k, ...claves(x)])
      : [];

let ana: string;
let carla: string;
let cierre: string;
let deCarla: string;
let sesionSara: SupabaseClient;

beforeAll(async () => {
  await vaciar();
  const sara = await sembrarEmpleado('SARA', 'sara@prueba.test');
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  carla = await sembrarEmpleado('CARLA', 'carla@prueba.test');
  const servicio = comoServicio();
  await servicio.from('empleado').update({ supervisor_id: sara }).eq('id', ana);

  // Ana: un cierre de 30 que arrastra y un informe de 20 que nacio hoy.
  cierre = await sembrarFuncion(ana, { ...funcion('Cierre'), ponderacion: 30 });
  await sembrarFuncion(ana, { ...funcion('Informe', { fecha_alta: hoy }), ponderacion: 20 });
  await servicio.from('titularidad').update({ desde: haceTresMeses }).eq('funcion_id', cierre);
  // Carla no es de sara: sus pesos no le llegan.
  deCarla = await sembrarFuncion(carla, { ...funcion('Lo de Carla'), ponderacion: 45 });

  await servicio.from('bono').insert([
    { empleado_id: ana, monto: 4321, rige_desde: '2026-01-01' },
    { empleado_id: carla, monto: 8765, rige_desde: '2026-01-01' },
  ]);

  // La cotidianidad de ana (50) tuvo dos imprevistos este mes: uno hecho y uno
  // que no pudo. La mitad sin cumplir: 25.
  const jefa = await comoAdministrador('jefa@prueba.test');
  const quien = (await jefa.auth.getUser()).data.user!.id;
  const imprevisto = (texto: string, resultado: string, razon: string | null) => ({
    empleado_id: ana,
    texto,
    vence: hoy,
    pedido_en: `${hoy}T08:00:00Z`,
    pedido_por_otro: 'el banco',
    registrado_por: quien,
    resultado,
    razon,
    marcada_en: `${hoy}T09:00:00Z`,
  });
  const { error } = await servicio.from('imprevisto').insert([imprevisto('Hecho', 'hecho', null), imprevisto('No pudo', 'no_pude', 'sin sistema')]);
  if (error) throw error;

  sesionSara = await comoEmpleado('sara@prueba.test');
  await comoEmpleado('ana@prueba.test');
  await comoEmpleado('carla@prueba.test');
});

describe('INV-40: un supervisor obtiene los pesos de su gente y nunca un monto', () => {
  it('obtiene las ponderaciones de ana, su cotidianidad y su ponderacion arrastrada', async () => {
    next.sesion = sesionSara;
    const { gente, datos, hoy: dia, calendario } = await loDeMiGente();

    expect(gente.map((p) => p.nombre)).toEqual(['ANA']);
    expect(gente[0]!.funciones.map((f) => [f.texto, f.ponderacion])).toEqual([
      ['Cierre', 30],
      ['Informe', 20],
    ]);
    expect(gente[0]!.cotidianidad).toBe(50);

    // El cierre arrastra (30) y la mitad de su cotidianidad no se cumplio (25).
    const [barra] = barrasDe(datos, dia, calendario as Calendario);
    expect(barra!.total).toBe(55);
    expect(barra!.segmentos.map((s) => [s.tipo, s.peso])).toEqual([
      ['funcion', 30],
      ['cotidianidad', 25],
    ]);
  });

  it('ninguna de sus lecturas trae bono, monto ni dolares', async () => {
    for (const lectura of ['lo_de_mi_gente', 'mis_delegaciones', 'mi_gente', 'lo_que_pedi'] as const) {
      const { data, error } = await sesionSara.rpc(lectura);
      expect(error).toBeNull();
      expect(claves(data).filter((k) => /bono|monto|dolar/i.test(k))).toEqual([]);
      expect(JSON.stringify(data)).not.toMatch(/4321|8765/);
    }
    const { data } = await sesionSara.rpc('tareas_de', { el_empleado: ana });
    expect(claves(data).filter((k) => /bono|monto|dolar/i.test(k))).toEqual([]);
  });

  it('nada de quien no esta a su cargo: ni sus funciones, ni sus pesos, ni sus tareas', async () => {
    const { data } = await sesionSara.rpc('lo_de_mi_gente');
    expect(JSON.stringify(data)).not.toContain(carla);
    expect(JSON.stringify(data)).not.toContain(deCarla);
    expect((await sesionSara.rpc('tareas_de', { el_empleado: carla })).data).toBeNull();
    expect((await sesionSara.from('titularidad').select('ponderacion').in('empleado_id', [ana, carla])).data).toEqual([]);
  });

  it('por consulta directa a la tabla de bonos, nada', async () => {
    expect((await sesionSara.from('bono').select('empleado_id, monto')).data).toEqual([]);
  });
});
