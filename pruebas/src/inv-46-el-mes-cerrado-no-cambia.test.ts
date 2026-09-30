import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, empresa, leerHoja, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-46 · Un mes cerrado no cambia (CEB-237, CEB-238, ADR 0017). Agosto de
// 2026, ya cerrado: se lee su nomina y sus descargas; despues se baja un
// peso, se cambia un bono y se cambia la empresa de alguien. La nomina ("El
// mes", "Su nomina", la descarga "Nominas") y la descarga "Tareas del mes"
// siguen iguales al centavo, con la empresa del cierre. Reabrir y volver a
// cerrar toma una foto nueva que si refleja lo corregido. Todo pasa por el
// cableado real, con sesiones reales; solo se sustituyen las cookies de Next.
const next = await vi.hoisted(async () => {
  const { createRequire } = await import('node:module');
  const web = createRequire(new URL('../../apps/web/package.json', import.meta.url));
  return { sesion: null as SupabaseClient | null, servidor: web.resolve('next/server') };
});
vi.mock('@/lib/supabase/servidor', () => ({ clienteDelServidor: async () => next.sesion }));

const { nominaDelMes } = await import('../../apps/web/src/lib/nomina');
const { GET: descargar } = await import('../../apps/web/src/app/admin/descarga/route');
const { GET: descargarNomina } = await import('../../apps/web/src/app/admin/nomina/route');
const { NextRequest } = (await import(next.servidor)) as typeof import('next/server');

const MES = '2026-08';
const BONO = 777.77;

let ana: string;
let benito: string;
let toyota: string;
let honda: string;
let caja: string;
let pagos: string;
let conciliacion: string;
let jefa: SupabaseClient;
let sesionAna: SupabaseClient;
let sesionSara: SupabaseClient;

const funcion = (texto: string, extra: Record<string, unknown> = {}) => ({
  hash_identidad: `h-${texto}`,
  texto,
  importancia: 5,
  periodicidad: 'mensual',
  tipo_generado: 'entregable',
  fecha_alta: '2026-01-01',
  ...extra,
});

const nominaComo = async (sesion: SupabaseClient, quien: string) => {
  next.sesion = sesion;
  return (await nominaDelMes(quien, MES)).nomina;
};

const nominas = async (empresaId: string) => {
  next.sesion = jefa;
  const respuesta = await descargarNomina(new NextRequest(`http://localhost/admin/nomina?mes=${MES}&empresa=${empresaId}`));
  expect(respuesta.status).toBe(200);
  return leerHoja(await respuesta.text()).filas;
};

const tareas = async (filtro: string) => {
  next.sesion = jefa;
  const respuesta = await descargar(new NextRequest(`http://localhost/admin/descarga?mes=${MES}&${filtro}`));
  return leerHoja(await respuesta.text()).filas;
};

beforeAll(async () => {
  await vaciar();
  const servicio = comoServicio();
  toyota = await empresa('Toyota');
  honda = (await servicio.from('empresa').select('id').neq('id', toyota).limit(1).single()).data!.id as string;

  const sara = await sembrarEmpleado('SARA', 'sara@prueba.test', { empresa_id: toyota });
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test', { empresa_id: toyota });
  benito = await sembrarEmpleado('BENITO', 'benito@prueba.test', { empresa_id: toyota });
  await servicio.from('empleado').update({ supervisor_id: sara }).eq('id', ana);
  jefa = await comoAdministrador('jefa@prueba.test');
  sesionAna = await comoEmpleado('ana@prueba.test');
  sesionSara = await comoEmpleado('sara@prueba.test');
  await comoEmpleado('benito@prueba.test');
  const quien = (await jefa.auth.getUser()).data.user!.id;

  await servicio.from('bono').insert([
    { empleado_id: ana, monto: BONO, rige_desde: '2026-01-01' },
    { empleado_id: benito, monto: 300, rige_desde: '2026-01-01' },
  ]);

  // Caja, semanal: un "no pude" y una semana vencida sin marcar.
  caja = await sembrarFuncion(ana, { ...funcion('Cierre de caja', { periodicidad: 'semanal' }), ponderacion: 40 });
  // Pagos, mensual, vencida sin marcar.
  pagos = await sembrarFuncion(ana, { ...funcion('Pagos'), ponderacion: 10 });
  // Conciliacion, flujo: atrasada del lunes 10 al jueves 13 de agosto.
  conciliacion = await sembrarFuncion(ana, { ...funcion('Conciliación', { periodicidad: 'diaria', tipo_generado: 'flujo' }), ponderacion: 20 });
  await sembrarFuncion(benito, { ...funcion('Compras'), ponderacion: 50 });

  const { error } = await servicio.from('marca').insert([
    { funcion_id: caja, periodo: '2026-08-03', resultado: 'hecho' },
    { funcion_id: caja, periodo: '2026-08-10', resultado: 'no_pude', razon: 'sin efectivo' },
    { funcion_id: caja, periodo: '2026-08-17', resultado: 'hecho' },
  ]);
  if (error) throw error;
  await servicio.from('evento_flujo').insert([
    { funcion_id: conciliacion, estado: 'atrasado', razon: 'sin extracto', en: '2026-08-10T12:00:00Z' },
    { funcion_id: conciliacion, estado: 'al_dia', en: '2026-08-13T12:00:00Z' },
  ]);
  const imprevisto = (texto: string, resultado: string) => ({
    empleado_id: ana,
    texto,
    vence: '2026-08-20',
    pedido_en: '2026-08-18T12:00:00Z',
    pedido_por_otro: 'el banco',
    registrado_por: quien,
    resultado,
    razon: resultado === 'hecho' ? null : 'no alcanzo',
    marcada_en: '2026-08-20T12:00:00Z',
  });
  const { error: sinImprevistos } = await servicio.from('imprevisto').insert([imprevisto('Uno', 'hecho'), imprevisto('Dos', 'no_pude')]);
  if (sinImprevistos) throw sinImprevistos;
});

describe('INV-46: un mes cerrado no cambia', () => {
  let antes: Awaited<ReturnType<typeof nominaComo>>;
  let nominasAntes: Record<string, string | number>[];
  let tareasAntes: Record<string, string | number>[];

  it('sin su foto, la base no deja mover un peso, un bono ni una empresa, ni reabrir', async () => {
    const pesos = { la_funcion: caja, quien: ana, nueva: 30, pesos_del_resto: [{ funcion_id: pagos, ponderacion: 20 }] };
    expect((await jefa.rpc('ajustar_ponderacion', pesos)).error?.hint).toBe('sin_foto');
    expect((await jefa.rpc('fijar_bono', { el_empleado: ana, el_monto: 2000 })).error?.hint).toBe('sin_foto');
    const empresaNueva = { el_empleado: ana, el_nombre: 'ANA', el_correo: 'ana@prueba.test', la_empresa: honda, la_sede: null };
    expect((await jefa.rpc('editar_empleado', empresaNueva)).error?.hint).toBe('sin_foto');
    expect((await jefa.rpc('reabrir_mes', { el_mes: MES, la_razon: 'Antes de la foto' })).error?.hint).toBe('sin_foto');
    expect((await comoServicio().from('reapertura').select('id')).data).toEqual([]);
  });

  it('leer un mes cerrado toma su foto: la nomina de cada persona con la empresa del cierre', async () => {
    antes = await nominaComo(jefa, ana);
    expect(antes).toMatchObject({ bono: BONO });
    nominasAntes = await nominas(toyota);
    expect(nominasAntes.filter((f) => f.PERSONA === 'ANA').at(-1)).toMatchObject({ CONCEPTO: 'Total a pagar', MONTO: antes!.total.toFixed(2).replace('.', ',') });

    tareasAntes = await tareas(`persona=${ana}`);
    expect(tareasAntes.some((f) => f.FUNCION === 'Pagos')).toBe(true);

    const { data } = await comoServicio().from('foto_del_cierre').select('empleado_id, empresa_id, total').eq('mes', MES);
    expect(data).toHaveLength(3);
    expect(data!.find((f) => f.empleado_id === ana)).toMatchObject({ empresa_id: toyota, total: antes!.total });
  });

  it('bajar un peso, cambiar un bono y cambiar una empresa no la mueve', async () => {
    const servicio = comoServicio();
    // Caja baja de 40 a 10; lo que sobra va a la cotidianidad y a las demas.
    const { error: sinPeso } = await jefa.rpc('ajustar_ponderacion', {
      la_funcion: caja,
      quien: ana,
      nueva: 10,
      pesos_del_resto: [
        { funcion_id: pagos, ponderacion: 20 },
        { funcion_id: conciliacion, ponderacion: 30 },
      ],
    });
    expect(sinPeso).toBeNull();
    // Y Pagos se archiva.
    const { error: sinArchivar } = await jefa.rpc('archivar_funcion', {
      la_funcion: pagos,
      quien: ana,
      pesos: [
        { funcion_id: caja, ponderacion: 10 },
        { funcion_id: conciliacion, ponderacion: 30 },
      ],
    });
    expect(sinArchivar).toBeNull();
    expect((await jefa.rpc('fijar_bono', { el_empleado: ana, el_monto: 2000 })).error).toBeNull();
    // Una correccion del bono que regia en agosto, por fuera de la pantalla.
    expect((await servicio.from('bono').update({ monto: 5000 }).eq('empleado_id', ana).eq('rige_desde', '2026-01-01')).error).toBeNull();
    const { error: sinEmpresa } = await jefa.rpc('editar_empleado', {
      el_empleado: ana,
      el_nombre: 'ANA',
      el_correo: 'ana@prueba.test',
      la_empresa: honda,
      la_sede: null,
    });
    expect(sinEmpresa).toBeNull();

    expect(await nominaComo(jefa, ana)).toEqual(antes);
    expect(await nominaComo(sesionAna, ana)).toEqual(antes);
    expect(await nominas(toyota)).toEqual(nominasAntes);
    expect((await nominas(honda)).some((f) => f.PERSONA === 'ANA')).toBe(false);
  });

  it('"Tareas del mes" sigue igual: los pesos, el bono y la empresa son los de la foto, y lo archivado sigue saliendo', async () => {
    expect(await tareas(`persona=${ana}`)).toEqual(tareasAntes);
    expect((await tareas(`empresa=${toyota}`)).filter((f) => f.PERSONA === 'ANA')).toEqual(tareasAntes);
    expect((await tareas(`empresa=${honda}`)).some((f) => f.PERSONA === 'ANA')).toBe(false);

    // Y sigue cuadrando con la nomina, parte por parte, al centavo (INV-45).
    const nomina = await nominaComo(jefa, ana);
    const suma = (funcion: string) =>
      Math.round(tareasAntes.filter((f) => f.FUNCION === funcion).reduce((t, f) => t + Number(f['MONTO NO CUMPLIDO']), 0) * 100) / 100;
    for (const l of nomina!.lineas) expect(suma(l.parte)).toBe(l.descuento);
    expect(tareasAntes.filter((f) => f.FUNCION === 'Cierre de caja').every((f) => f.PONDERACION === '40' && f.BONO === String(BONO))).toBe(true);
  });

  it('la foto la lee cada quien la suya y el administrador todas; el supervisor ninguna; nadie la escribe', async () => {
    expect((await sesionAna.from('foto_del_cierre').select('empleado_id').eq('mes', MES)).data).toEqual([{ empleado_id: ana }]);
    expect((await sesionSara.from('foto_del_cierre').select('empleado_id').eq('empleado_id', ana)).data).toEqual([]);
    expect(await nominaComo(sesionSara, ana)).toBeNull();
    expect((await jefa.from('foto_del_cierre').select('empleado_id').eq('mes', MES)).data).toHaveLength(3);

    for (const sesion of [sesionAna, jefa]) {
      expect((await sesion.from('foto_del_cierre').update({ total: 1 }).eq('empleado_id', ana).select()).data ?? []).toEqual([]);
      expect((await sesion.from('foto_del_cierre').delete().eq('empleado_id', ana).select()).data ?? []).toEqual([]);
      expect((await sesion.from('foto_del_cierre').insert({ mes: '2026-07', empleado_id: ana, partes: [] })).error).not.toBeNull();
    }
    expect((await sesionAna.rpc('tomar_foto_del_cierre', { el_mes: '2026-07', fotos: [] })).error).not.toBeNull();
    expect((await comoServicio().from('foto_del_cierre').select('total').eq('mes', MES).eq('empleado_id', ana).single()).data!.total).toBe(antes!.total);
  });

  it('reabrir descarta la foto; al volver a cerrar, la nueva refleja lo corregido', async () => {
    const servicio = comoServicio();
    expect((await jefa.rpc('reabrir_mes', { el_mes: MES, la_razon: 'Los pesos de caja estaban mal' })).error).toBeNull();
    expect((await servicio.from('foto_del_cierre').select('empleado_id').eq('mes', MES)).data).toEqual([]);
    // Lo que tenia a pagar antes de reabrir sale de la foto.
    expect((await servicio.from('total_al_reabrir').select('total').eq('empleado_id', ana)).data).toEqual([{ total: antes!.total }]);

    expect((await jefa.rpc('cerrar_mes', { el_mes: MES })).error).toBeNull();
    const despues = await nominaComo(jefa, ana);
    expect(despues!.bono).toBe(5000);
    expect(despues!.lineas.find((l) => l.parte === 'Cierre de caja')!.ponderacion).toBe(10);
    expect(despues!.total).not.toBe(antes!.total);

    const { data } = await servicio.from('foto_del_cierre').select('empresa_id, total').eq('mes', MES).eq('empleado_id', ana).single();
    expect(data).toEqual({ empresa_id: honda, total: despues!.total });
    expect((await nominas(honda)).filter((f) => f.PERSONA === 'ANA').at(-1)).toMatchObject({ MONTO: despues!.total.toFixed(2).replace('.', ',') });
    expect((await nominas(toyota)).some((f) => f.PERSONA === 'ANA')).toBe(false);
  });
});
