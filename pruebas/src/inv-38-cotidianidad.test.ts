import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { comoAdministrador, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// La cotidianidad es el resto del cargo (CEB-206, ADR 0014): cien menos las
// funciones, nunca menos de diez, y nunca una funcion.

let ana: string;
let jefa: SupabaseClient;

const funcion = (texto: string, tipo: string) => ({
  hash_identidad: `h-${texto}`,
  texto,
  importancia: 5,
  periodicidad: 'mensual',
  tipo_generado: tipo,
  fecha_alta: '2026-01-01',
});

beforeAll(async () => {
  await vaciar();
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  jefa = await comoAdministrador('jefa@prueba.test');
});

describe('INV-38: la cotidianidad nunca es una funcion', () => {
  it('el administrador no da de alta una funcion de holgura', async () => {
    const { error } = await jefa.from('funcion').insert({ ...funcion('Urgentes', 'entregable'), tipo_corregido: 'holgura' });
    expect(error).not.toBeNull();
  });

  it('ni convierte una funcion que ya existe en holgura', async () => {
    const cierre = await sembrarFuncion(ana, { ...funcion('Cierre', 'entregable'), ponderacion: 40 });
    await jefa.from('funcion').update({ tipo_corregido: 'holgura' }).eq('id', cierre);
    const { data } = await comoServicio().from('funcion').select('tipo_corregido').eq('id', cierre).single();
    expect(data?.tipo_corregido).toBeNull();
  });

  it('ni siquiera la llave de servicio, que es por donde entra el agente', async () => {
    const { error } = await comoServicio().from('funcion').insert(funcion('Imprevistos', 'holgura'));
    expect(error).not.toBeNull();
  });

  it('una archivada conserva su historia aunque fuera de holgura', async () => {
    const { error } = await comoServicio().from('funcion').insert({ ...funcion('Holgura vieja', 'holgura'), activa: false });
    expect(error).toBeNull();
  });
});

describe('INV-14 (reescrito): ningun reparto publicado deja la cotidianidad bajo el diez', () => {
  let bruno: string;
  let carla: string;

  beforeAll(async () => {
    bruno = await sembrarEmpleado('BRUNO', 'bruno@prueba.test');
    carla = await sembrarEmpleado('CARLA', 'carla@prueba.test');
  });

  const borrador = async (quien: string, pesos: [string, number][]) => {
    await jefa.from('titularidad').delete().eq('empleado_id', quien).is('publicado_en', null);
    await jefa.from('titularidad').insert(pesos.map(([funcion_id, ponderacion]) => ({ funcion_id, empleado_id: quien, ponderacion, publicado_en: null })));
    return jefa.rpc('publicar_reparto', { quien });
  };

  it('funciones en noventa se publican; en noventa y cinco, no', async () => {
    const a = await sembrarFuncion(bruno, { ...funcion('A de Bruno', 'entregable'), ponderacion: 30 });
    const b = await sembrarFuncion(bruno, { ...funcion('B de Bruno', 'entregable'), ponderacion: 30 });
    expect((await borrador(bruno, [[a, 50], [b, 45]])).error).not.toBeNull();
    expect((await borrador(bruno, [[a, 50], [b, 40]])).error).toBeNull();
  });

  it('un traspaso que dejaria a quien recibe con noventa y dos se rechaza', async () => {
    const deCarla = await sembrarFuncion(carla, { ...funcion('De Carla', 'entregable'), ponderacion: 20 });
    const { data } = await comoServicio().from('titularidad').select('funcion_id, ponderacion').eq('empleado_id', bruno).is('hasta', null).not('publicado_en', 'is', null);
    const { error } = await jefa.rpc('traspasar', {
      la_funcion: deCarla,
      de_quien: carla,
      a_quien: bruno,
      peso_nuevo: 2,
      pesos_de_quien_entrega: [],
      pesos_de_quien_recibe: data ?? [],
    });
    expect(error).not.toBeNull();
  });

  it('archivar devuelve el peso con la propuesta y nadie queda bajo el piso', async () => {
    const { proponerReparto } = await import('@matriz/dominio');
    const { data } = await comoServicio().from('titularidad').select('funcion_id, ponderacion').eq('empleado_id', bruno).is('hasta', null).not('publicado_en', 'is', null);
    const vigentes = (data ?? []).map((t) => ({ funcionId: t.funcion_id as string, ponderacion: t.ponderacion as number }));
    const sale = vigentes[0]!.funcionId;
    const pesos = proponerReparto(vigentes, { sale }).despues.map((p) => ({ funcion_id: p.funcionId, ponderacion: p.ponderacion }));
    expect((await jefa.rpc('archivar_funcion', { la_funcion: sale, quien: bruno, pesos })).error).toBeNull();

    const { data: quedan } = await comoServicio().from('titularidad').select('ponderacion').eq('empleado_id', bruno).is('hasta', null).not('publicado_en', 'is', null);
    expect(100 - (quedan ?? []).reduce((t, q) => t + (q.ponderacion as number), 0)).toBeGreaterThanOrEqual(10);
  });

  it('una persona sin funciones es toda cotidianidad, y es valida', async () => {
    const nadie = await sembrarEmpleado('DANI', 'dani@prueba.test');
    expect((await jefa.rpc('publicar_reparto', { quien: nadie })).error).toBeNull();
  });
});

describe('INV-39: todo imprevisto pesa por la cotidianidad de su empleado', () => {
  it('sin funciones pesa el cien por ciento del bono; con noventa, el diez; y se cumple con sus imprevistos', async () => {
    const { cotidianidadDe, enDolares, hechosDeHolgura, repartoDelMes } = await import('@matriz/dominio');
    const hoy = new Date().toISOString().slice(0, 10);
    const eva = await sembrarEmpleado('EVA', 'eva@prueba.test');
    const fede = await sembrarEmpleado('FEDE', 'fede@prueba.test');
    await sembrarFuncion(fede, { ...funcion('La de Fede', 'entregable'), ponderacion: 90 });

    const sesionEva = await (await import('./entorno')).comoEmpleado('eva@prueba.test');
    const sesionFede = await (await import('./entorno')).comoEmpleado('fede@prueba.test');
    for (const [s, quien, resultado] of [[sesionEva, eva, 'hecho'], [sesionFede, fede, 'no_pude']] as const) {
      const { data } = await s.from('imprevisto').insert({ empleado_id: quien, texto: 'Algo', vence: hoy, pedido_por_otro: 'un cliente' }).select('id').single();
      await s.rpc('marcar_imprevisto', { el_imprevisto: data!.id, el_resultado: resultado, la_razon: resultado === 'hecho' ? null : 'sin sistema' });
    }

    const cotidianidadDeQuien = async (quien: string) => {
      const { data } = await jefa.from('titularidad').select('funcion_id, ponderacion').eq('empleado_id', quien).is('hasta', null).not('publicado_en', 'is', null);
      return cotidianidadDe((data ?? []).map((t) => ({ funcionId: t.funcion_id as string, ponderacion: t.ponderacion as number })));
    };
    expect(await cotidianidadDeQuien(eva)).toBe(100);
    expect(await cotidianidadDeQuien(fede)).toBe(10);

    // Su porcion del bono, como en el mes del empleado y en la descarga.
    const dolares = (cotidianidad: number) =>
      enDolares(repartoDelMes([{ funcionId: 'f', nombre: 'f', tipo: 'entregable', ponderacion: 100 - cotidianidad }].filter((f) => f.ponderacion > 0)), 1000)
        .find((t) => t.tipo === 'cotidianidad')!.dolares;
    expect(dolares(100)).toBe(1000);
    expect(dolares(10)).toBe(100);

    const hechos = async (quien: string) => {
      const { data } = await jefa.from('imprevisto').select('texto, vence, resultado, borrado_en, devuelto_en').eq('empleado_id', quien);
      const filas = (data ?? []).map((i) => ({ texto: i.texto, vence: i.vence, resultado: i.resultado, borradoEn: i.borrado_en, devueltoEn: i.devuelto_en }));
      return hechosDeHolgura(filas, { desde: hoy, hasta: hoy }, hoy).filas.map((f) => f.cumplio);
    };
    expect(await hechos(eva)).toEqual([1]);
    expect(await hechos(fede)).toEqual([0]);
  });
});
