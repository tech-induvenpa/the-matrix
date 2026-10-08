import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { comoAdministrador, comoEmpleado, comoServicio, empresa, RELOJ_DE_LAS_PRUEBAS, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-54 a INV-61 (CEB-259, ADR 0019): la empresa es un limite. El
// administrador de empresa y el supervisor solo gestionan dentro de la suya;
// solo el general cruza empresas, mantiene el calendario y da de alta a otros
// administradores. Todo con sesiones reales, sin llave de servicio en el medio.

// El mes del reloj de las pruebas: un bono de este mes no pide foto de cierres pasados.
const MES = new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 7);

let kia: string;
let toyota: string;
let ana: string; // KIA, supervisora de benito
let benito: string; // KIA
let dario: string; // Toyota
let funcionKia: string;
let funcionToyota: string;
let general: SupabaseClient;
let deKia: SupabaseClient;
let sesionAna: SupabaseClient;

const entregable = (texto: string) => ({
  hash_identidad: `h-${texto}`,
  texto,
  importancia: 5,
  periodicidad: 'mensual',
  tipo_generado: 'entregable',
  fecha_alta: '2026-01-01',
});

beforeAll(async () => {
  await vaciar();
  kia = await empresa('KIA');
  toyota = await empresa('Toyota');

  ana = await sembrarEmpleado('ANA', 'ana@prueba.test', { empresa_id: kia });
  benito = await sembrarEmpleado('BENITO', 'benito@prueba.test', { empresa_id: kia });
  dario = await sembrarEmpleado('DARIO', 'dario@prueba.test', { empresa_id: toyota });
  funcionKia = await sembrarFuncion(benito, entregable('Cierre de caja KIA'));
  funcionToyota = await sembrarFuncion(dario, entregable('Conciliacion Toyota'));
  await comoServicio().from('empleado').update({ supervisor_id: ana }).eq('id', benito);
  await comoServicio().from('bono').insert({ empleado_id: dario, monto: 777, rige_desde: `${MES}-01` });

  general = await comoAdministrador('general@prueba.test');
  deKia = await comoAdministrador('admin-kia@prueba.test', kia);
  const quien = (await general.auth.getUser()).data.user!.id;
  const im = await comoServicio().from('imprevisto').insert({
    empleado_id: dario, texto: 'Revisar factura', vence: RELOJ_DE_LAS_PRUEBAS.slice(0, 10), pedido_por_otro: 'finanzas', registrado_por: quien,
  });
  if (im.error) throw im.error;
  sesionAna = await comoEmpleado('ana@prueba.test');
  await comoEmpleado('benito@prueba.test');
});

describe('INV-54: el administrador de empresa nunca lee otra empresa', () => {
  it('ve a la gente de la suya y a nadie mas', async () => {
    const { data } = await deKia.from('empleado').select('id');
    expect((data ?? []).map((e) => e.id).sort()).toEqual([ana, benito].sort());
  });

  it('ni sus funciones, ni su reparto, ni sus imprevistos, ni su bono', async () => {
    expect((await deKia.from('funcion').select('id')).data?.map((f) => f.id)).toEqual([funcionKia]);
    expect((await deKia.from('titularidad').select('empleado_id')).data?.every((t) => t.empleado_id === benito)).toBe(true);
    expect((await deKia.from('imprevisto').select('id')).data).toEqual([]);
    expect((await deKia.from('bono').select('id')).data).toEqual([]);
  });

  it('ni por las funciones de lectura', async () => {
    expect((await deKia.rpc('tareas_de', { el_empleado: dario })).data).toBeNull();
    expect((await deKia.rpc('tareas_de', { el_empleado: benito })).data).not.toBeNull();
  });

  it('el general sigue viendo todo (INV-60)', async () => {
    expect(((await general.from('empleado').select('id')).data ?? []).length).toBe(3);
    expect(((await general.from('funcion').select('id')).data ?? []).length).toBe(2);
    expect(((await general.from('bono').select('id')).data ?? []).length).toBe(1);
  });
});

describe('INV-55: el administrador de empresa nunca escribe en otra empresa', () => {
  it('no da de alta a nadie de otra empresa, y a los suyos si', async () => {
    const alta = (la_empresa: string, correo: string) =>
      deKia.rpc('dar_de_alta', { el_nombre: 'NUEVO', el_correo: correo, la_empresa, la_sede: null });
    expect((await alta(toyota, 'otro@prueba.test')).error).not.toBeNull();
    expect((await alta(kia, 'suyo@prueba.test')).error).toBeNull();
  });

  it('no edita ni borra a alguien de otra empresa', async () => {
    const { error } = await deKia.rpc('editar_empleado', {
      el_empleado: dario, el_nombre: 'DARIO', el_correo: 'dario@prueba.test', la_empresa: toyota, la_sede: null,
    });
    expect(error).not.toBeNull();
    expect((await deKia.from('empleado').delete().eq('id', dario).select()).data ?? []).toEqual([]);
  });

  it('no fija el bono, no borra el imprevisto ni toca la funcion de otra empresa', async () => {
    expect((await deKia.rpc('fijar_bono', { el_empleado: dario, el_monto: 1 })).error?.message).toContain('otra empresa');
    const { data: imprevisto } = await comoServicio().from('imprevisto').select('id').eq('empleado_id', dario).single();
    expect((await deKia.rpc('borrar_imprevisto', { el_imprevisto: imprevisto!.id })).error?.message).toContain('otra empresa');
    expect((await deKia.from('funcion').update({ texto: 'Pisada' }).eq('id', funcionToyota).select()).data ?? []).toEqual([]);
    expect((await comoServicio().from('funcion').select('texto').eq('id', funcionToyota).single()).data!.texto).toBe('Conciliacion Toyota');
  });

  it('lo de su empresa si lo escribe', async () => {
    expect((await deKia.rpc('fijar_bono', { el_empleado: benito, el_monto: 100 })).error?.message ?? '').not.toContain('otra empresa');
    const { error } = await deKia.rpc('editar_empleado', { el_empleado: benito, el_nombre: 'BENITO R', el_correo: 'benito@prueba.test', la_empresa: kia, la_sede: null });
    expect(error).toBeNull();
  });
});

describe('INV-56: cruzar empresas es solo del general', () => {
  it('el de empresa no cambia a alguien de empresa, ni a la suya hacia otra', async () => {
    const { error } = await deKia.rpc('editar_empleado', {
      el_empleado: benito, el_nombre: 'BENITO', el_correo: 'benito@prueba.test', la_empresa: toyota, la_sede: null,
    });
    expect(error).not.toBeNull();
  });

  it('el de empresa no traspasa hacia otra empresa', async () => {
    const { error } = await deKia.rpc('traspasar', {
      la_funcion: funcionKia, de_quien: benito, a_quien: dario, peso_nuevo: 10,
      pesos_de_quien_entrega: [], pesos_de_quien_recibe: [],
    });
    expect(error).not.toBeNull();
  });

  it('el general si cambia a alguien de empresa', async () => {
    const { error } = await general.rpc('editar_empleado', {
      el_empleado: dario, el_nombre: 'DARIO', el_correo: 'dario@prueba.test', la_empresa: kia, la_sede: null,
    });
    expect(error).toBeNull();
    // Y su historial lo sigue: el de KIA ahora lo ve.
    expect((await deKia.from('empleado').select('id').eq('id', dario)).data).toEqual([{ id: dario }]);
    await general.rpc('editar_empleado', {
      el_empleado: dario, el_nombre: 'DARIO', el_correo: 'dario@prueba.test', la_empresa: toyota, la_sede: null,
    });
  });
});

describe('INV-57: el supervisor es de la misma empresa que su gente', () => {
  it('nadie, ni el general ni la llave de servicio, deja un supervisor de otra empresa', async () => {
    expect((await general.rpc('asignar_supervisor', { el_empleado: dario, el_supervisor: ana })).error).not.toBeNull();
    expect((await comoServicio().from('empleado').update({ supervisor_id: ana }).eq('id', dario)).error).not.toBeNull();
    expect((await deKia.rpc('asignar_supervisor', { el_empleado: dario, el_supervisor: ana })).error).not.toBeNull();
  });

  it('cambiar de empresa a quien supervisa a otros se rechaza hasta soltarlos', async () => {
    const { error } = await general.rpc('editar_empleado', {
      el_empleado: ana, el_nombre: 'ANA', el_correo: 'ana@prueba.test', la_empresa: toyota, la_sede: null,
    });
    expect(error).not.toBeNull();
  });

  it('dentro de la empresa si se asigna', async () => {
    expect((await deKia.rpc('asignar_supervisor', { el_empleado: benito, el_supervisor: ana })).error).toBeNull();
  });

  it('el supervisor sigue viendo solo a su gente, que es de su empresa', async () => {
    const { data } = await sesionAna.rpc('lo_de_mi_gente');
    expect((data as { gente: { id: string }[] }).gente.map((g) => g.id)).toEqual([benito]);
  });
});

describe('INV-58: solo el general da de alta administradores', () => {
  it('el general crea uno general y uno de empresa', async () => {
    expect((await general.rpc('alta_de_administrador', { el_nombre: 'OTRO', el_correo: 'otro-general@prueba.test' })).error).toBeNull();
    expect((await general.rpc('alta_de_administrador', { el_nombre: 'TOY', el_correo: 'admin-toyota@prueba.test', la_empresa: toyota })).error).toBeNull();
    const { data } = await general.from('administrador').select('correo, empresa_id').order('correo');
    expect(data).toEqual(expect.arrayContaining([
      { correo: 'otro-general@prueba.test', empresa_id: null },
      { correo: 'admin-toyota@prueba.test', empresa_id: toyota },
    ]));
  });

  it('el de empresa, un supervisor y un empleado no crean administradores, ni por la funcion ni por la tabla', async () => {
    const empleado = await comoEmpleado('benito@prueba.test');
    for (const sesion of [deKia, sesionAna, empleado]) {
      expect((await sesion.rpc('alta_de_administrador', { el_nombre: 'X', el_correo: 'x@prueba.test' })).error).not.toBeNull();
      expect((await sesion.from('administrador').insert({ auth_user_id: crypto.randomUUID(), nombre: 'X', correo: 'x2@prueba.test' })).error).not.toBeNull();
    }
    expect((await comoServicio().from('administrador').select('correo').eq('correo', 'x@prueba.test')).data).toEqual([]);
  });

  it('solo el general lee la lista de administradores', async () => {
    expect(((await general.from('administrador').select('correo')).data ?? []).length).toBeGreaterThanOrEqual(4);
    expect((await deKia.from('administrador').select('correo')).data ?? []).toEqual([]);
  });
});

describe('INV-59: un correo es de un administrador o de un empleado', () => {
  it('no se da de alta de administrador a un empleado', async () => {
    expect((await general.rpc('alta_de_administrador', { el_nombre: 'BENITO', el_correo: 'benito@prueba.test' })).error).not.toBeNull();
  });

  it('no se da de alta de empleado a un administrador', async () => {
    const { error } = await general.rpc('dar_de_alta', { el_nombre: 'JEFE', el_correo: 'general@prueba.test', la_empresa: kia, la_sede: null });
    expect(error).not.toBeNull();
  });
});

describe('INV-60: el general ve lo mismo que antes', () => {
  it('no esta acotado a ninguna empresa', async () => {
    expect((await general.rpc('tareas_de', { el_empleado: dario })).data).not.toBeNull();
    expect((await general.rpc('tareas_de', { el_empleado: benito })).data).not.toBeNull();
  });
});

describe('INV-61: el calendario es solo del general', () => {
  it('el de empresa no carga ni quita dias no habiles ni declara cobertura', async () => {
    expect((await deKia.from('dia_no_habil').insert({ desde: '2026-12-24', hasta: '2026-12-24', descripcion: 'x' })).error).not.toBeNull();
    expect((await deKia.from('calendario').update({ cargado_hasta: '2030-01-01' }).not('id', 'is', null)).error).not.toBeNull();
  });

  it('el general si', async () => {
    const { error } = await general.from('dia_no_habil').insert({ desde: '2026-12-24', hasta: '2026-12-24', descripcion: 'Nochebuena' });
    expect(error).toBeNull();
    await comoServicio().from('dia_no_habil').delete().eq('descripcion', 'Nochebuena');
  });

  it('el cierre del mes tampoco es del de empresa', async () => {
    expect((await deKia.rpc('cerrar_mes', { el_mes: '2026-07' })).error).not.toBeNull();
  });
});
