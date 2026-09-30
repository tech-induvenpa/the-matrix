import type { SupabaseClient } from '@supabase/supabase-js';
import { Calendario, cierreDelMes } from '@matriz/dominio';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, fijarReloj, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-44 · Solo el administrador reabre un mes, siempre con razon, y el mes
// vuelve a cerrarse a las veinticuatro horas (CEB-229, ADR 0016). Con
// sesiones reales de empleado, supervisora y administradora, y el reloj de la
// base fijado despues del cierre de agosto de 2026 (ver fijarReloj).
const MES = '2026-08';

const funcion = (texto: string) => ({
  hash_identidad: `h-${texto}`,
  texto,
  importancia: 5,
  periodicidad: 'mensual',
  tipo_generado: 'entregable',
  fecha_alta: '2026-01-01',
});

let cierre: string;
let caja: string;
let imprevisto: string;
let delegacion: string;
let sesionAna: SupabaseClient;
let sesionSara: SupabaseClient;
let jefa: SupabaseClient;
let reabierto: string;

const mas = (instante: string, horas: number) => new Date(new Date(instante).getTime() + horas * 3_600_000).toISOString();

beforeAll(async () => {
  await vaciar();
  const servicio = comoServicio();
  const { data: dias } = await servicio.from('dia_no_habil').select('desde, hasta');
  // Una semana despues del cierre de agosto: agosto esta cerrado.
  reabierto = mas(cierreDelMes(MES, Calendario.con(dias ?? [])), 24 * 7);

  const sara = await sembrarEmpleado('SARA', 'sara@prueba.test');
  const ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  await servicio.from('empleado').update({ supervisor_id: sara }).eq('id', ana);
  sesionAna = await comoEmpleado('ana@prueba.test');
  sesionSara = await comoEmpleado('sara@prueba.test');
  jefa = await comoAdministrador('jefa@prueba.test');
  const deSara = (await servicio.from('empleado').select('auth_user_id').eq('id', sara).single()).data!.auth_user_id as string;

  cierre = await sembrarFuncion(ana, { ...funcion('Cierre'), ponderacion: 30 });
  caja = await sembrarFuncion(sara, { ...funcion('Caja'), ponderacion: 20 });
  const { data: filas, error } = await servicio
    .from('imprevisto')
    .insert([
      {
        empleado_id: ana,
        texto: 'Conciliar el banco',
        vence: '2026-08-20',
        pedido_en: '2026-08-10T12:00:00Z',
        pedido_por_otro: 'el banco',
        registrado_por: deSara,
      },
      {
        empleado_id: ana,
        texto: 'Caja',
        vence: '2026-08-28',
        pedido_en: '2026-08-10T12:00:00Z',
        pedido_por: deSara,
        registrado_por: deSara,
        delega_funcion: caja,
        delega_periodo: MES,
        resultado: 'hecho',
        marcada_en: '2026-08-20T12:00:00Z',
      },
    ])
    .select('id, texto');
  if (error) throw error;
  imprevisto = filas!.find((f) => f.texto === 'Conciliar el banco')!.id as string;
  delegacion = filas!.find((f) => f.texto === 'Caja')!.id as string;

  await fijarReloj(reabierto);
});

afterAll(async () => {
  await fijarReloj(null);
});

describe('INV-44: solo el administrador reabre, con razon, y el mes vuelve a cerrarse solo', () => {
  it('un empleado o una supervisora no pueden reabrir ni cerrar', async () => {
    for (const sesion of [sesionAna, sesionSara]) {
      expect((await sesion.rpc('reabrir_mes', { el_mes: MES, la_razon: 'Se cayo el sistema' })).error).not.toBeNull();
      expect((await sesion.rpc('cerrar_mes', { el_mes: MES })).error).not.toBeNull();
      expect((await sesion.from('reapertura').insert({ mes: MES, razon: 'directo' })).error).not.toBeNull();
    }
    expect((await comoServicio().from('reapertura').select('id')).data).toEqual([]);
  });

  it('el administrador sin razon no puede', async () => {
    expect((await jefa.rpc('reabrir_mes', { el_mes: MES, la_razon: '   ' })).error).not.toBeNull();
    expect((await comoServicio().from('reapertura').select('id')).data).toEqual([]);
  });

  it('con razon si, y queda registrado quien, cuando y por que', async () => {
    const { error } = await jefa.rpc('reabrir_mes', { el_mes: MES, la_razon: 'Se cayo el sistema el 31' });
    expect(error).toBeNull();

    const laJefa = (await jefa.auth.getUser()).data.user!.id;
    const { data } = await comoServicio().from('reapertura').select('mes, razon, quien, en, cerrada_en');
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ mes: MES, razon: 'Se cayo el sistema el 31', quien: laJefa, cerrada_en: null });
    expect(new Date(data![0]!.en as string).toISOString()).toBe(reabierto);
  });

  it('reabierto, todos vuelven a marcar, deshacer y devolver lo de ese mes', async () => {
    expect((await sesionAna.from('marca').insert({ funcion_id: cierre, periodo: MES, resultado: 'hecho' })).error).toBeNull();
    expect((await sesionAna.from('marca').delete().eq('funcion_id', cierre).eq('periodo', MES)).error).toBeNull();
    expect((await sesionAna.rpc('marcar_imprevisto', { el_imprevisto: imprevisto, el_resultado: 'hecho', la_razon: null })).error).toBeNull();
    expect((await sesionAna.rpc('desmarcar_imprevisto', { el_imprevisto: imprevisto })).error).toBeNull();
    expect((await sesionSara.rpc('devolver', { la_delegacion: delegacion, la_razon: 'faltan los anexos' })).error).toBeNull();
  });

  it('veinticuatro horas despues, sin cerrarlo a mano, vuelve a estar cerrado', async () => {
    await fijarReloj(mas(reabierto, 24));

    const { error } = await sesionAna.from('marca').insert({ funcion_id: cierre, periodo: MES, resultado: 'hecho' });
    expect(error?.hint).toBe('mes_cerrado');
    const { data } = await comoServicio().from('reapertura').select('cerrada_en');
    expect(data).toEqual([{ cerrada_en: null }]);
  });

  it('una segunda reapertura se cierra a mano, y solo el administrador la cierra', async () => {
    const segunda = mas(reabierto, 48);
    await fijarReloj(segunda);
    expect((await jefa.rpc('reabrir_mes', { el_mes: MES, la_razon: 'Faltaba una devolucion' })).error).toBeNull();
    expect((await sesionAna.from('marca').insert({ funcion_id: cierre, periodo: MES, resultado: 'hecho' })).error).toBeNull();

    await fijarReloj(mas(segunda, 2));
    expect((await sesionSara.rpc('cerrar_mes', { el_mes: MES })).error).not.toBeNull();
    expect((await jefa.rpc('cerrar_mes', { el_mes: MES })).error).toBeNull();

    const { error } = await sesionAna.from('marca').delete().eq('funcion_id', cierre).eq('periodo', MES);
    expect(error?.hint).toBe('mes_cerrado');
    const { data } = await comoServicio().from('reapertura').select('razon, cerrada_en').order('en');
    expect(data!.map((r) => [r.razon, r.cerrada_en === null ? null : new Date(r.cerrada_en as string).toISOString()])).toEqual([
      ['Se cayo el sistema el 31', null],
      ['Faltaba una devolucion', mas(segunda, 2)],
    ]);
  });
});
