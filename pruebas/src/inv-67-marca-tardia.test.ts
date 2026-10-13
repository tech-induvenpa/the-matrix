import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, empresa, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

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

// CEB-275: poner y quitar la marca tardia, con sesiones reales.
describe('INV-67: poner y quitar una marca tardia', () => {
  let carla: string;
  let informe: string;
  let aTiempo: string;
  let sesionCarla: SupabaseClient;
  let sesionBenito: SupabaseClient;
  let imprevisto: string;
  let imprevistoMarcado: string;

  const tarde = (funcion: string, periodo: string, resultado: string, razon: string | null = null) =>
    sesionCarla.rpc('marcar_tarde', { la_funcion: funcion, el_periodo: periodo, el_resultado: resultado, la_razon: razon });

  beforeAll(async () => {
    const servicio = comoServicio();
    carla = await sembrarEmpleado('CARLA', 'carla@prueba.test');
    sesionCarla = await comoEmpleado('carla@prueba.test');
    sesionBenito = await comoEmpleado('benito@prueba.test');
    informe = await sembrarFuncion(carla, { ...pagos('h-informe'), texto: 'Informe', ponderacion: 50 });
    aTiempo = await sembrarFuncion(carla, { ...pagos('h-a-tiempo'), texto: 'A tiempo', ponderacion: 50 });
    await servicio.from('marca').insert({ funcion_id: aTiempo, periodo: '2026-08', resultado: 'hecho' });
    const base = { empleado_id: carla, vence: '2026-08-20', pedido_en: '2026-08-18T12:00:00Z', pedido_por_otro: 'el banco' };
    const quien = (await jefa.auth.getUser()).data.user!.id;
    const filas = await servicio
      .from('imprevisto')
      .insert([
        { ...base, texto: 'Abierto', registrado_por: quien },
        { ...base, texto: 'Ya hecho', registrado_por: quien, resultado: 'hecho', marcada_en: '2026-08-20T12:00:00Z' },
      ])
      .select('id, texto');
    imprevisto = filas.data!.find((i) => i.texto === 'Abierto')!.id;
    imprevistoMarcado = filas.data!.find((i) => i.texto === 'Ya hecho')!.id;
  });

  it('el titular marca "hecho" una ocurrencia de un mes cerrado, y queda cuando se marco de verdad', async () => {
    expect((await tarde(informe, '2026-08', 'hecho')).error).toBeNull();
    const { data } = await comoServicio().from('marca_tardia').select('resultado, marcada_en').eq('funcion_id', informe).single();
    expect(data).toMatchObject({ resultado: 'hecho' });
    expect(data!.marcada_en).toBeTruthy();
    expect((await comoServicio().from('marca').select('id').eq('funcion_id', informe)).data).toEqual([]);
  });

  it('"no pude" tardio pide razon', async () => {
    const hash = await sembrarFuncion(carla, { ...pagos('h-sin-razon'), texto: 'Sin razon', ponderacion: 0 });
    expect((await tarde(hash, '2026-08', 'no_pude')).error).not.toBeNull();
    expect((await tarde(hash, '2026-08', 'no_pude', 'sin acceso')).error).toBeNull();
  });

  it('no se marca tarde lo que ya estaba marcado a tiempo, ni se deshace', async () => {
    expect((await tarde(aTiempo, '2026-08', 'no_pude', 'otra')).error).not.toBeNull();
    expect((await sesionCarla.rpc('deshacer_marca_tardia', { la_funcion: aTiempo, el_periodo: '2026-08' })).data).toBe(false);
    expect((await sesionCarla.from('marca').delete().eq('funcion_id', aTiempo)).error?.hint).toBe('mes_cerrado');
  });

  it('un mes abierto se marca como siempre, no tarde', async () => {
    const abierto = await sembrarFuncion(carla, { ...pagos('h-abierto'), texto: 'Abierto', ponderacion: 0 });
    const periodo = new Date().toISOString().slice(0, 7);
    expect((await tarde(abierto, periodo, 'hecho')).error).not.toBeNull();
  });

  it('solo el titular la pone: ni otro empleado ni el administrador', async () => {
    const ajena = await sembrarFuncion(carla, { ...pagos('h-ajena'), texto: 'Ajena', ponderacion: 0 });
    const args = { la_funcion: ajena, el_periodo: '2026-08', el_resultado: 'hecho', la_razon: null };
    expect((await sesionBenito.rpc('marcar_tarde', args)).error).not.toBeNull();
    expect((await jefa.rpc('marcar_tarde', args)).error).not.toBeNull();
  });

  it('el titular deshace su marca tardia y la tarea vuelve a quedar sin marca', async () => {
    const { data } = await sesionCarla.rpc('deshacer_marca_tardia', { la_funcion: informe, el_periodo: '2026-08' });
    expect(data).toBe(true);
    expect((await comoServicio().from('marca_tardia').select('id').eq('funcion_id', informe)).data).toEqual([]);
  });

  it('lo mismo con un imprevisto: se marca tarde si seguia abierto, no si ya estaba marcado', async () => {
    const args = (id: string) => ({ el_imprevisto: id, el_resultado: 'hecho', la_razon: null });
    expect((await sesionBenito.rpc('marcar_imprevisto_tarde', args(imprevisto))).error).not.toBeNull();
    expect((await sesionCarla.rpc('marcar_imprevisto_tarde', args(imprevistoMarcado))).error).not.toBeNull();
    expect((await sesionCarla.rpc('marcar_imprevisto_tarde', args(imprevisto))).error).toBeNull();
    expect((await comoServicio().from('imprevisto').select('resultado').eq('id', imprevisto).single()).data!.resultado).toBeNull();
    expect((await sesionCarla.rpc('deshacer_marca_tardia_de_imprevisto', { el_imprevisto: imprevistoMarcado })).data).toBe(false);
    expect((await sesionCarla.rpc('deshacer_marca_tardia_de_imprevisto', { el_imprevisto: imprevisto })).data).toBe(true);
  });
});

// CEB-276: lo que ven otros. Lo marcado tarde sale de las abiertas del equipo,
// llega aparte al supervisor y cada empresa ve solo lo suyo.
describe('INV-67: lo marcado tarde, visto por otros', () => {
  it('el supervisor ve la marca tardia aparte, y la tarea ya no esta abierta', async () => {
    const servicio = comoServicio();
    const sara = await sembrarEmpleado('SARA', 'sara@prueba.test');
    const dina = await sembrarEmpleado('DINA', 'dina@prueba.test', { supervisor_id: sara });
    const sesionSara = await comoEmpleado('sara@prueba.test');
    const lista = await sembrarFuncion(dina, { ...pagos('h-lista'), texto: 'Lista', ponderacion: 50 });
    await sembrarFuncion(dina, { ...pagos('h-abierta'), texto: 'Abierta', ponderacion: 50 });
    const quien = (await jefa.auth.getUser()).data.user!.id;
    const { data: filas } = await servicio
      .from('imprevisto')
      .insert({ empleado_id: dina, texto: 'Tarde', vence: '2026-08-20', pedido_en: '2026-08-18T12:00:00Z', pedido_por_otro: 'el banco', registrado_por: quien })
      .select('id')
      .single();
    await servicio.from('marca_tardia').insert([
      // Hoy de verdad: el supervisor solo ve lo que paso desde que su gente tiene la funcion.
      { funcion_id: lista, periodo: '2026-08', resultado: 'hecho', marcada_en: new Date().toISOString() },
      { imprevisto_id: filas!.id, resultado: 'hecho', marcada_en: new Date().toISOString() },
    ]);

    const abiertas = (await sesionSara.rpc('tareas_de', { el_empleado: dina })).data as {
      marcas: unknown[];
      marcas_tardias: { funcion_id: string }[];
      imprevistos: { id: string }[];
    };
    expect(abiertas.marcas_tardias.map((m) => m.funcion_id)).toEqual([lista]);
    expect(abiertas.marcas).toEqual([]);
    expect(abiertas.imprevistos).toEqual([]);

    const gente = (await sesionSara.rpc('lo_de_mi_gente')).data as {
      marcas: unknown[];
      marcas_tardias: { funcion_id: string | null; imprevisto_id: string | null }[];
    };
    expect(gente.marcas).toEqual([]);
    expect(gente.marcas_tardias).toHaveLength(2);
  });

  it('el administrador de una empresa no ve la marca tardia de otra', async () => {
    const servicio = comoServicio();
    const toyota = await empresa('Toyota');
    const kia = await empresa('KIA');
    const dario = await sembrarEmpleado('DARIO', 'dario@prueba.test', { empresa_id: toyota });
    const funcion = await sembrarFuncion(dario, { ...pagos('h-dario'), texto: 'Conciliacion', ponderacion: 50 });
    await servicio.from('marca_tardia').insert({ funcion_id: funcion, periodo: '2026-08', resultado: 'hecho' });

    const deToyota = await comoAdministrador('admin-toyota@prueba.test', toyota);
    const deKia = await comoAdministrador('admin-kia@prueba.test', kia);
    const veToyota = (await deToyota.from('marca_tardia').select('funcion_id')).data!.map((m) => m.funcion_id);
    expect(veToyota).toContain(funcion);
    expect((await deKia.from('marca_tardia').select('funcion_id').eq('funcion_id', funcion)).data).toEqual([]);
  });
});
