import { Calendario } from '@matriz/dominio';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, fijarReloj, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// Los avisos de vencimiento (CEB-267, CEB-271). La campanita los calcula al
// cargar: pasa por la accion del servidor de verdad y solo se sustituye Next
// alrededor (como en INV-32). El dia se fija a un miercoles para que el fin de
// semana en que corra la prueba no cambie el resultado.
const next = await vi.hoisted(async () => {
  const { createRequire } = await import('node:module');
  const web = createRequire(new URL('../../apps/web/package.json', import.meta.url));
  return { sesion: null as SupabaseClient | null, cache: web.resolve('next/cache') };
});
vi.mock('@/lib/supabase/servidor', () => ({ clienteDelServidor: async () => next.sesion }));
vi.mock('@/lib/razones', () => ({ proyectarRazones: async () => {} }));
vi.mock(next.cache, () => ({ revalidatePath: () => {} }));

const { misNotificaciones } = await import('../../apps/web/src/app/acciones');

const HOY = '2026-10-07';

let ana: string, sara: string;
let sAna: SupabaseClient, sSara: SupabaseClient, jefa: SupabaseClient;
let calendario: Calendario;

const vencimientos = async (s: SupabaseClient) => {
  next.sesion = s;
  return (await misNotificaciones()).filter((a) => a.tipo === 'vencimiento');
};

const imprevisto = async (vence: string, texto: string) => {
  const { data, error } = await comoServicio()
    .from('imprevisto')
    .insert({ empleado_id: ana, texto, vence, pedido_en: `${HOY}T12:00:00Z`, pedido_por_otro: 'un cliente', registrado_por: (await sAna.auth.getUser()).data.user!.id })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
};

beforeAll(async () => {
  await vaciar();
  // El reloj de la base, al mismo dia: valida que un imprevisto no venza antes de hoy.
  await fijarReloj(`${HOY}T12:00:00-04:00`);
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  sara = await sembrarEmpleado('SARA', 'sara@prueba.test');
  jefa = await comoAdministrador('jefa@prueba.test');
  sAna = await comoEmpleado('ana@prueba.test');
  sSara = await comoEmpleado('sara@prueba.test');
  await jefa.rpc('asignar_supervisor', { el_empleado: ana, el_supervisor: sara });

  const { data } = await comoServicio().from('dia_no_habil').select('desde, hasta');
  calendario = Calendario.con(data ?? []);

  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${HOY}T15:00:00Z`));
});

afterAll(() => {
  vi.useRealTimers();
});

describe('INV-66: el vencimiento avisa al titular, a 2 y a 1 dia habil, una vez', () => {
  const a2 = () => calendario.sumarHabiles(HOY, 2);
  const a1 = () => calendario.sumarHabiles(HOY, 1);
  let marcable: string;

  beforeAll(async () => {
    await imprevisto(a2(), 'Vence en dos A');
    marcable = await imprevisto(a2(), 'Vence en dos B');
    await imprevisto(a2(), 'Vence en dos C');
    await imprevisto(a1(), 'Vence en uno');
    await imprevisto(calendario.sumarHabiles(HOY, 6), 'Lejos');
    // Una diaria no avisa, ni la de manana (ya marcada hoy).
    const diaria = await sembrarFuncion(ana, {
      hash_identidad: 'h-diaria',
      texto: 'Una diaria',
      importancia: 5,
      periodicidad: 'diaria',
      tipo_generado: 'entregable',
      fecha_alta: '2026-01-01',
    });
    await comoServicio().from('marca').insert({ funcion_id: diaria, periodo: HOY, resultado: 'hecho' });
  });

  it('un aviso por dia de aviso, con la cuenta de sus tareas', async () => {
    const avisos = await vencimientos(sAna);
    expect(avisos.map((a) => [a.texto, a.cantidad]).sort()).toEqual([['en 2 días', 3], ['mañana', 1]].sort());
  });

  it('recargar no duplica nada', async () => {
    await vencimientos(sAna);
    await vencimientos(sAna);
    const { data } = await comoServicio().from('notificacion').select('id').eq('tipo', 'vencimiento');
    expect(data).toHaveLength(2);
  });

  it('solo al titular: ni la supervisora ni la administradora', async () => {
    expect(await vencimientos(sSara)).toEqual([]);
    expect(await vencimientos(jefa)).toEqual([]);
  });

  it('marcar una tarea baja la cuenta; marcarlas todas hace desaparecer el aviso', async () => {
    const marcar = (id: string) => sAna.rpc('marcar_imprevisto', { el_imprevisto: id, el_resultado: 'hecho', la_razon: null });
    expect((await marcar(marcable)).error).toBeNull();
    expect((await vencimientos(sAna)).find((a) => a.texto === 'en 2 días')?.cantidad).toBe(2);

    const { data: restantes } = await comoServicio().from('imprevisto').select('id').in('texto', ['Vence en dos A', 'Vence en dos C']);
    for (const r of restantes ?? []) expect((await marcar(r.id)).error).toBeNull();
    expect((await vencimientos(sAna)).map((a) => a.texto)).toEqual(['mañana']);
  });

  it('el aviso de un dia que ya paso no aparece', async () => {
    vi.setSystemTime(new Date('2026-10-08T15:00:00Z'));
    const avisos = await vencimientos(sAna);
    expect(avisos.every((a) => a.texto !== 'en 2 días')).toBe(true);
    vi.setSystemTime(new Date(`${HOY}T15:00:00Z`));
  });

  it('nadie registra un vencimiento que no es de 2 ni de 1', async () => {
    expect((await sAna.rpc('registrar_vencimiento', { el_dia: HOY, los_faltan: 3 })).error).not.toBeNull();
  });
});
