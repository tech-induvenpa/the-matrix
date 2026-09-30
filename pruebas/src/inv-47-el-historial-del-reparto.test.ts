import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-47 · Todo cambio publicado de pesos deja su version (CEB-236, ADR
// 0017). Alta, cambio, archivo, eliminacion, traspaso (las dos personas) y
// ajuste de cotidianidad, cada uno con quien, cuando, que movimiento y los
// pesos antes y despues, parte por parte. Con sesiones reales: el empleado y
// el supervisor no lo leen, y nadie lo escribe directo. La lectura del perfil
// pasa por lib/administrador.ts; solo se sustituyen las cookies de Next.
const next = await vi.hoisted(async () => ({ sesion: null as SupabaseClient | null }));
vi.mock('@/lib/supabase/servidor', () => ({ clienteDelServidor: async () => next.sesion }));

const { historialDelReparto } = await import('../../apps/web/src/lib/administrador');

let ana: string;
let bruno: string;
let caja: string;
let pagos: string;
let nueva: string;
let jefa: SupabaseClient;
let laJefa: string;

const funcion = (texto: string) => ({
  hash_identidad: `h-${texto}`,
  texto,
  importancia: 5,
  periodicidad: 'mensual',
  tipo_generado: 'entregable',
  fecha_alta: '2026-01-01',
});

type Peso = { funcionId: string | null; parte: string; ponderacion: number };
const cotidianidad = (n: number): Peso => ({ funcionId: null, parte: 'Cotidianidad', ponderacion: n });

// La ultima version de alguien, como la guarda la base.
const ultima = async (quien: string) => {
  const { data } = await comoServicio()
    .from('historial_del_reparto')
    .select('movimiento, funcion_id, quien, en, antes, despues')
    .eq('empleado_id', quien)
    .order('en', { ascending: false })
    .limit(1)
    .single();
  return data!;
};

const borrador = async (quien: string, pesos: [string, number][]) => {
  await jefa.from('titularidad').delete().eq('empleado_id', quien).is('publicado_en', null);
  const { error } = await jefa.from('titularidad').insert(pesos.map(([funcion_id, ponderacion]) => ({ funcion_id, empleado_id: quien, ponderacion, publicado_en: null })));
  if (error) throw error;
};

beforeAll(async () => {
  await vaciar();
  const sara = await sembrarEmpleado('SARA', 'sara@prueba.test');
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  bruno = await sembrarEmpleado('BRUNO', 'bruno@prueba.test');
  await comoServicio().from('empleado').update({ supervisor_id: sara }).eq('id', ana);
  jefa = await comoAdministrador('jefa@prueba.test');
  laJefa = (await jefa.auth.getUser()).data.user!.id;

  caja = await sembrarFuncion(ana, { ...funcion('Caja'), ponderacion: 40 });
  pagos = await sembrarFuncion(ana, { ...funcion('Pagos'), ponderacion: 20 });
  await sembrarFuncion(bruno, { ...funcion('Compras'), ponderacion: 50 });
});

describe('INV-47: todo cambio publicado de pesos deja su version', () => {
  it('sembrar con la llave de servicio no es publicar: el historial empieza vacio', async () => {
    expect((await comoServicio().from('historial_del_reparto').select('id')).data).toEqual([]);
  });

  it('alta: una funcion nueva entra al reparto publicado', async () => {
    const { data, error } = await jefa.from('funcion').insert({ texto: 'Nueva', periodicidad: 'mensual', importancia: 5, tipo_corregido: 'entregable' }).select('id').single();
    if (error) throw error;
    nueva = data.id as string;
    await borrador(ana, [[caja, 30], [pagos, 20], [nueva, 20]]);
    const antesDePublicar = Date.now();
    expect((await jefa.rpc('publicar_reparto', { quien: ana })).error).toBeNull();

    const v = await ultima(ana);
    expect(v).toMatchObject({ movimiento: 'alta', funcion_id: nueva, quien: laJefa });
    expect(new Date(v.en as string).getTime()).toBeGreaterThanOrEqual(antesDePublicar - 60_000);
    expect(v.antes).toEqual([{ funcionId: caja, parte: 'Caja', ponderacion: 40 }, { funcionId: pagos, parte: 'Pagos', ponderacion: 20 }, cotidianidad(40)]);
    expect(v.despues).toEqual([
      { funcionId: caja, parte: 'Caja', ponderacion: 30 },
      { funcionId: nueva, parte: 'Nueva', ponderacion: 20 },
      { funcionId: pagos, parte: 'Pagos', ponderacion: 20 },
      cotidianidad(30),
    ]);
  });

  it('cambio: el peso de una funcion, y lo que se reacomoda con el', async () => {
    const { error } = await jefa.rpc('ajustar_ponderacion', {
      la_funcion: caja,
      quien: ana,
      nueva: 10,
      pesos_del_resto: [
        { funcion_id: pagos, ponderacion: 25 },
        { funcion_id: nueva, ponderacion: 25 },
      ],
    });
    expect(error).toBeNull();
    const v = await ultima(ana);
    expect(v).toMatchObject({ movimiento: 'cambio', funcion_id: caja, quien: laJefa });
    expect((v.despues as Peso[]).map((p) => [p.parte, p.ponderacion])).toEqual([['Nueva', 25], ['Pagos', 25], ['Caja', 10], ['Cotidianidad', 40]]);
  });

  it('ajuste de la cotidianidad: publicado desde el reparto, dice que fue eso', async () => {
    await borrador(ana, [[caja, 20], [pagos, 30], [nueva, 30]]);
    expect((await jefa.rpc('publicar_reparto', { quien: ana, el_movimiento: 'cotidianidad' })).error).toBeNull();
    const v = await ultima(ana);
    expect(v).toMatchObject({ movimiento: 'cotidianidad', funcion_id: null });
    expect((v.antes as Peso[]).at(-1)).toEqual(cotidianidad(40));
    expect((v.despues as Peso[]).at(-1)).toEqual(cotidianidad(20));
  });

  it('archivo: la funcion sale del reparto y el resto se reacomoda', async () => {
    const { error } = await jefa.rpc('archivar_funcion', {
      la_funcion: pagos,
      quien: ana,
      pesos: [
        { funcion_id: caja, ponderacion: 30 },
        { funcion_id: nueva, ponderacion: 40 },
      ],
    });
    expect(error).toBeNull();
    const v = await ultima(ana);
    expect(v).toMatchObject({ movimiento: 'archivo', funcion_id: pagos });
    expect((v.antes as Peso[]).some((p) => p.funcionId === pagos)).toBe(true);
    expect((v.despues as Peso[]).some((p) => p.funcionId === pagos)).toBe(false);
  });

  it('eliminacion: la funcion desaparece, pero sigue nombrada en su version', async () => {
    const { error } = await jefa.rpc('eliminar_funcion', { la_funcion: nueva, quien: ana, pesos: [{ funcion_id: caja, ponderacion: 70 }] });
    expect(error).toBeNull();
    const v = await ultima(ana);
    expect(v).toMatchObject({ movimiento: 'eliminacion', funcion_id: nueva });
    expect((v.antes as Peso[]).find((p) => p.funcionId === nueva)).toMatchObject({ parte: 'Nueva', ponderacion: 40 });
    expect(v.despues).toEqual([{ funcionId: caja, parte: 'Caja', ponderacion: 70 }, cotidianidad(30)]);
  });

  it('traspaso: deja una version en el reparto de cada una de las dos personas', async () => {
    const { data: compras } = await comoServicio().from('titularidad').select('funcion_id').eq('empleado_id', bruno).is('hasta', null).single();
    const { error } = await jefa.rpc('traspasar', {
      la_funcion: caja,
      de_quien: ana,
      a_quien: bruno,
      peso_nuevo: 30,
      pesos_de_quien_entrega: [],
      pesos_de_quien_recibe: [{ funcion_id: compras!.funcion_id, ponderacion: 40 }],
    });
    expect(error).toBeNull();

    const deAna = await ultima(ana);
    expect(deAna).toMatchObject({ movimiento: 'traspaso', funcion_id: caja, quien: laJefa, despues: [cotidianidad(100)] });
    const deBruno = await ultima(bruno);
    expect(deBruno).toMatchObject({ movimiento: 'traspaso', funcion_id: caja, quien: laJefa });
    expect((deBruno.antes as Peso[]).map((p) => [p.parte, p.ponderacion])).toEqual([['Compras', 50], ['Cotidianidad', 50]]);
    expect((deBruno.despues as Peso[]).map((p) => [p.parte, p.ponderacion])).toEqual([['Compras', 40], ['Caja', 30], ['Cotidianidad', 30]]);
  });

  it('el perfil del administrador lo lee del mas reciente al mas viejo', async () => {
    next.sesion = jefa;
    const versiones = await historialDelReparto(ana);
    expect(versiones.map((v) => v.movimiento)).toEqual(['traspaso', 'eliminacion', 'archivo', 'cotidianidad', 'cambio', 'alta']);
    expect(versiones[0]).toMatchObject({ funcion: 'Caja', quien: 'jefa' });
    expect(versiones[0]!.partes.find((p) => p.parte === 'Caja')).toMatchObject({ antes: 70, despues: null, cambio: true });
  });

  it('el empleado y el supervisor no lo leen', async () => {
    for (const correo of ['ana@prueba.test', 'sara@prueba.test']) {
      const sesion = await comoEmpleado(correo);
      expect((await sesion.from('historial_del_reparto').select('id')).data).toEqual([]);
      next.sesion = sesion;
      expect(await historialDelReparto(ana)).toEqual([]);
    }
  });

  it('nadie lo escribe directo, ni el administrador, ni mueve pesos por fuera del historial', async () => {
    const total = (await comoServicio().from('historial_del_reparto').select('id')).data!.length;
    for (const sesion of [jefa, await comoEmpleado('ana@prueba.test')]) {
      const fila = { empleado_id: ana, movimiento: 'cambio', antes: [], despues: [] };
      expect((await sesion.from('historial_del_reparto').insert(fila)).error).not.toBeNull();
      expect((await sesion.from('historial_del_reparto').update({ movimiento: 'alta' }).eq('empleado_id', ana).select()).data ?? []).toEqual([]);
      expect((await sesion.from('historial_del_reparto').delete().eq('empleado_id', ana).select()).data ?? []).toEqual([]);
    }
    // Las de siempre, sin historial, no se llaman con una sesion.
    const { data: compras } = await comoServicio().from('titularidad').select('funcion_id').eq('empleado_id', bruno).eq('ponderacion', 40).single();
    expect((await jefa.rpc('ajustar_ponderacion_sin_historial', { la_funcion: compras!.funcion_id, quien: bruno, nueva: 10, pesos_del_resto: [] })).error).not.toBeNull();
    expect((await jefa.rpc('publicar_reparto_sin_historial', { quien: bruno })).error).not.toBeNull();
    expect((await comoServicio().from('historial_del_reparto').select('id')).data).toHaveLength(total);
  });
});
