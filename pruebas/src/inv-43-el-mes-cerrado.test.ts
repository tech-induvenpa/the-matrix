import type { SupabaseClient } from '@supabase/supabase-js';
import { Calendario, cierreDelMes } from '@matriz/dominio';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { comoEmpleado, comoServicio, fijarReloj, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-43 · Nada de un mes cerrado se marca, se deshace, se devuelve ni se
// declara atrasado (CEB-228, ADR 0016). El mes se cierra a las 23:59 de
// Caracas de su ultimo dia habil. Todo pasa por la base real con sesiones
// reales; el reloj de la base se fija un minuto antes y un minuto despues del
// cierre de agosto de 2026 (ver fijarReloj).
const MES = '2026-08';

const funcion = (texto: string, extra: Record<string, unknown> = {}) => ({
  hash_identidad: `h-${texto}`,
  texto,
  importancia: 5,
  periodicidad: 'mensual',
  tipo_generado: 'entregable',
  fecha_alta: '2026-01-01',
  ...extra,
});

let cierre: string;
let pagos: string;
let conciliacion: string;
let caja: string;
let imprevisto: string;
let delegacion: string;
let sesionAna: SupabaseClient;
let sesionSara: SupabaseClient;
let elCierre: string;

const unMinuto = (instante: string, minutos: number) => new Date(new Date(instante).getTime() + minutos * 60_000).toISOString();

beforeAll(async () => {
  await vaciar();
  const servicio = comoServicio();
  const { data: dias } = await servicio.from('dia_no_habil').select('desde, hasta');
  elCierre = cierreDelMes(MES, Calendario.con(dias ?? []));

  const sara = await sembrarEmpleado('SARA', 'sara@prueba.test');
  const ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  await servicio.from('empleado').update({ supervisor_id: sara }).eq('id', ana);
  sesionAna = await comoEmpleado('ana@prueba.test');
  sesionSara = await comoEmpleado('sara@prueba.test');
  const deSara = (await servicio.from('empleado').select('auth_user_id').eq('id', sara).single()).data!.auth_user_id as string;

  cierre = await sembrarFuncion(ana, { ...funcion('Cierre'), ponderacion: 30 });
  pagos = await sembrarFuncion(ana, { ...funcion('Pagos'), ponderacion: 20 });
  conciliacion = await sembrarFuncion(ana, { ...funcion('Conciliacion', { periodicidad: 'diaria', tipo_generado: 'flujo' }), ponderacion: 10 });
  caja = await sembrarFuncion(sara, { ...funcion('Caja'), ponderacion: 20 });

  // Lo que ya estaba hecho en agosto, sembrado antes del cierre.
  const { error: sinMarca } = await servicio.from('marca').insert({ funcion_id: pagos, periodo: MES, resultado: 'hecho' });
  if (sinMarca) throw sinMarca;
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
});

afterAll(async () => {
  await fijarReloj(null);
});

describe('INV-43: el cierre del mes', () => {
  it('la base cierra en el mismo instante que el dominio: 23:59 de Caracas del ultimo dia habil', async () => {
    const { data } = await comoServicio().rpc('cierre_del_mes', { el_mes: MES });
    expect(new Date(data as string).toISOString()).toBe(elCierre);
  });

  describe('un minuto despues del cierre, la base rechaza', () => {
    beforeAll(async () => {
      await fijarReloj(unMinuto(elCierre, 1));
    });

    it('marcar una ocurrencia que vence en ese mes, y dice que mes cerro', async () => {
      const { error } = await sesionAna.from('marca').insert({ funcion_id: cierre, periodo: MES, resultado: 'hecho' });
      expect(error?.hint).toBe('mes_cerrado');
      expect(error?.message).toBe('agosto ya cerró');
    });

    it('deshacer una marca', async () => {
      const { error } = await sesionAna.from('marca').delete().eq('funcion_id', pagos).eq('periodo', MES);
      expect(error?.hint).toBe('mes_cerrado');
      const { data } = await comoServicio().from('marca').select('id').eq('funcion_id', pagos);
      expect(data).toHaveLength(1);
    });

    it('marcar un imprevisto que vence en ese mes', async () => {
      const { error } = await sesionAna.rpc('marcar_imprevisto', { el_imprevisto: imprevisto, el_resultado: 'hecho', la_razon: null });
      expect(error?.hint).toBe('mes_cerrado');
    });

    it('devolver una delegacion de ese mes', async () => {
      const { error } = await sesionSara.rpc('devolver', { la_delegacion: delegacion, la_razon: 'faltan los anexos' });
      expect(error?.hint).toBe('mes_cerrado');
    });

    it('declarar el estado de un flujo con fecha en ese mes', async () => {
      const { error } = await sesionAna
        .from('evento_flujo')
        .insert({ funcion_id: conciliacion, estado: 'atrasado', razon: 'sin extracto', en: '2026-08-25T12:00:00Z' });
      expect(error?.hint).toBe('mes_cerrado');
    });

    it('y lo del mes siguiente no se ve afectado', async () => {
      const { error } = await sesionAna.from('marca').insert({ funcion_id: cierre, periodo: '2026-09', resultado: 'hecho' });
      expect(error).toBeNull();
      await comoServicio().from('marca').delete().eq('funcion_id', cierre).eq('periodo', '2026-09');
    });
  });

  describe('un minuto antes del cierre, lo acepta', () => {
    beforeAll(async () => {
      await fijarReloj(unMinuto(elCierre, -1));
    });

    it('marcar y deshacer', async () => {
      expect((await sesionAna.from('marca').insert({ funcion_id: cierre, periodo: MES, resultado: 'hecho' })).error).toBeNull();
      expect((await sesionAna.from('marca').delete().eq('funcion_id', pagos).eq('periodo', MES)).error).toBeNull();
      const { data } = await comoServicio().from('marca').select('funcion_id').eq('periodo', MES);
      expect(data).toEqual([{ funcion_id: cierre }]);
    });

    it('marcar un imprevisto', async () => {
      const { error } = await sesionAna.rpc('marcar_imprevisto', { el_imprevisto: imprevisto, el_resultado: 'hecho', la_razon: null });
      expect(error).toBeNull();
    });

    it('devolver una delegacion', async () => {
      const { error } = await sesionSara.rpc('devolver', { la_delegacion: delegacion, la_razon: 'faltan los anexos' });
      expect(error).toBeNull();
    });

    it('declarar el estado de un flujo', async () => {
      const { error } = await sesionAna
        .from('evento_flujo')
        .insert({ funcion_id: conciliacion, estado: 'atrasado', razon: 'sin extracto', en: '2026-08-25T12:00:00Z' });
      expect(error).toBeNull();
    });
  });
});
