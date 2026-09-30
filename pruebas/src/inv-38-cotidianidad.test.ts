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
