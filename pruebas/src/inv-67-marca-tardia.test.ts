import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-67 · Una marca tardia no mueve el mes (CEB-273, ADR 0020). Agosto de 2026
// ya cerro. Ana y Benito tienen lo mismo: Pagos, mensual, vencida sin marcar.
// Ana la marca en septiembre, fuera de mes. Su nomina de agosto sale igual a la
// de Benito, que no marco nada: la tarea sigue como no cumplida.
const next = await vi.hoisted(async () => {
  const { createRequire } = await import('node:module');
  const web = createRequire(new URL('../../apps/web/package.json', import.meta.url));
  return { sesion: null as SupabaseClient | null, servidor: web.resolve('next/server') };
});
vi.mock('@/lib/supabase/servidor', () => ({ clienteDelServidor: async () => next.sesion }));

const { nominaDelMes } = await import('../../apps/web/src/lib/nomina');

const MES = '2026-08';

let ana: string;
let benito: string;
let pagosDeAna: string;
let jefa: SupabaseClient;

const pagos = (hash: string) => ({
  hash_identidad: hash,
  texto: 'Pagos',
  importancia: 5,
  periodicidad: 'mensual',
  tipo_generado: 'entregable',
  fecha_alta: '2026-01-01',
  ponderacion: 100,
});

beforeAll(async () => {
  await vaciar();
  const servicio = comoServicio();
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  benito = await sembrarEmpleado('BENITO', 'benito@prueba.test');
  jefa = await comoAdministrador('jefa@prueba.test');
  await servicio.from('bono').insert([
    { empleado_id: ana, monto: 500, rige_desde: '2026-01-01' },
    { empleado_id: benito, monto: 500, rige_desde: '2026-01-01' },
  ]);
  pagosDeAna = await sembrarFuncion(ana, pagos('h-ana'));
  await sembrarFuncion(benito, pagos('h-benito'));

  const { error } = await servicio
    .from('marca_tardia')
    .insert({ funcion_id: pagosDeAna, periodo: '2026-08', resultado: 'hecho', marcada_en: '2026-09-02T12:00:00Z' });
  if (error) throw error;
});

describe('INV-67: una marca tardia no mueve el mes', () => {
  it('la nomina de agosto de quien marco tarde es la de quien no marco', async () => {
    next.sesion = jefa;
    const deAna = (await nominaDelMes(ana, MES)).nomina;
    const deBenito = (await nominaDelMes(benito, MES)).nomina;
    expect(deAna).not.toBeNull();
    expect(deAna!.total).toBe(deBenito!.total);
    expect(deAna!.total).toBeLessThan(500);
  });

  it('la foto del cierre, tomada despues de la marca tardia, no la cuenta', async () => {
    const { data } = await comoServicio().from('foto_del_cierre').select('empleado_id, total').eq('mes', MES);
    const total = (id: string) => data!.find((f) => f.empleado_id === id)?.total;
    expect(total(ana)).toBeDefined();
    expect(total(ana)).toBe(total(benito));
  });

  it('la marca tardia no es una marca: la tabla de marcas sigue vacia', async () => {
    const { data } = await comoServicio().from('marca').select('id').eq('funcion_id', pagosDeAna);
    expect(data).toEqual([]);
  });

  it('nadie escribe una marca tardia directamente, ni siquiera su titular', async () => {
    const sesion = await comoEmpleado('ana@prueba.test');
    const { error } = await sesion
      .from('marca_tardia')
      .insert({ funcion_id: pagosDeAna, periodo: '2026-08', resultado: 'hecho' });
    expect(error).not.toBeNull();
  });

  it('cada quien lee la suya y los demas no', async () => {
    const deAna = await comoEmpleado('ana@prueba.test');
    const deBenito = await comoEmpleado('benito@prueba.test');
    expect((await deAna.from('marca_tardia').select('id')).data).toHaveLength(1);
    expect((await deBenito.from('marca_tardia').select('id')).data).toEqual([]);
    expect((await jefa.from('marca_tardia').select('id')).data).toHaveLength(1);
  });
});
