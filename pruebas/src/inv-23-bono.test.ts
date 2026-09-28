import { beforeAll, describe, expect, it } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// El bono (CEB-147, ADR 0010): el unico monto que el sistema conoce. Estas
// pruebas corren con sesiones reales, porque lo que prueban es que la base
// decide quien lo ve y quien lo escribe.

const mesSiguiente = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 7);
};

let ana: string;
let benito: string;

beforeAll(async () => {
  await vaciar();
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  benito = await sembrarEmpleado('BENITO', 'benito@prueba.test');
  await comoServicio().from('bono').insert([
    { empleado_id: ana, monto: 1000, rige_desde: '2026-01-01' },
    { empleado_id: benito, monto: 800, rige_desde: '2026-01-01' },
  ]);
});

// INV-1 (reescrito) · El sueldo base no existe, y el bono de una persona solo
// llega a su sesion y a la del administrador.
describe('INV-1: el bono de cada quien es suyo', () => {
  it('cada empleado lee solo su bono', async () => {
    const sesion = await comoEmpleado('ana@prueba.test');
    const { data } = await sesion.from('bono').select('empleado_id, monto');
    expect(data).toEqual([{ empleado_id: ana, monto: 1000 }]);
  });

  it('pedir el de otro por su id devuelve vacio', async () => {
    const sesion = await comoEmpleado('ana@prueba.test');
    const { data } = await sesion.from('bono').select('monto').eq('empleado_id', benito);
    expect(data).toEqual([]);
  });

  it('el administrador lee los dos', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');
    const { data } = await jefa.from('bono').select('monto').order('monto');
    expect(data?.map((b) => b.monto)).toEqual([800, 1000]);
  });

  it('ninguna tabla tiene una columna de sueldo', async () => {
    const servicio = comoServicio();
    for (const tabla of ['empleado', 'funcion', 'titularidad', 'bono', 'imprevisto']) {
      const { data } = await servicio.from(tabla).select('*').limit(1);
      const columnas = Object.keys(data?.[0] ?? {});
      expect(columnas.some((c) => /sueldo|salario|base/i.test(c))).toBe(false);
    }
  });
});

// INV-23 · Un cambio de bono nunca altera el mes en curso ni los anteriores.
describe('INV-23: un cambio rige desde el mes siguiente', () => {
  it('fijar un bono lo pone a regir el mes siguiente, y dos cambios dejan uno', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');
    expect((await jefa.rpc('fijar_bono', { el_empleado: ana, el_monto: 1100 })).error).toBeNull();
    expect((await jefa.rpc('fijar_bono', { el_empleado: ana, el_monto: 1150 })).error).toBeNull();

    const { data } = await jefa.from('bono').select('monto, rige_desde').eq('empleado_id', ana).order('rige_desde');
    expect(data?.map((b) => [b.monto, (b.rige_desde as string).slice(0, 7)])).toEqual([
      [1000, '2026-01'],
      [1150, mesSiguiente()],
    ]);
  });
});

// INV-24 · Solo el administrador escribe un bono.
describe('INV-24: solo el administrador escribe un bono', () => {
  it('un empleado no puede fijar ningun bono, tampoco el suyo', async () => {
    const sesion = await comoEmpleado('ana@prueba.test');
    expect((await sesion.rpc('fijar_bono', { el_empleado: ana, el_monto: 99999 })).error).not.toBeNull();
    expect((await sesion.from('bono').insert({ empleado_id: ana, monto: 99999, rige_desde: '2026-01-01' })).error).not.toBeNull();
  });

  it('nadie actualiza ni borra el historial directamente, ni el administrador', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');
    expect((await jefa.from('bono').update({ monto: 1 }).eq('empleado_id', benito)).error).not.toBeNull();
    expect((await jefa.from('bono').delete().eq('empleado_id', benito)).error).not.toBeNull();

    const { data } = await comoServicio().from('bono').select('monto').eq('empleado_id', benito);
    expect(data).toEqual([{ monto: 800 }]);
  });

  // El traspaso tiene que aplicarse de verdad: si se rechazara, los bonos
  // tampoco cambiarian y la prueba pasaria sin probar nada. Asi paso hasta el
  // 28/09/2026, con los pesos mal armados.
  it('un traspaso no toca ningun bono', async () => {
    // Ana reparte 30/70; Benito, 100 en una sola.
    const cierre = await sembrarFuncion(ana, { texto: 'Cierre', periodicidad: 'mensual', importancia: 9, tipo_generado: 'entregable', ponderacion: 30 });
    const pagos = await sembrarFuncion(ana, { texto: 'Pagos', periodicidad: 'semanal', importancia: 5, tipo_generado: 'entregable', ponderacion: 70 });
    const compras = await sembrarFuncion(benito, { texto: 'Compras', periodicidad: 'semanal', importancia: 6, tipo_generado: 'entregable', ponderacion: 100 });
    const antes = (await comoServicio().from('bono').select('*').order('id')).data;

    const jefa = await comoAdministrador('jefa@prueba.test');
    const { error } = await jefa.rpc('traspasar', {
      la_funcion: cierre,
      de_quien: ana,
      a_quien: benito,
      peso_nuevo: 25,
      pesos_de_quien_entrega: [{ funcion_id: pagos, ponderacion: 100 }],
      pesos_de_quien_recibe: [{ funcion_id: compras, ponderacion: 75 }],
    });
    expect(error).toBeNull();

    const { data: titular } = await comoServicio()
      .from('titularidad')
      .select('empleado_id')
      .eq('funcion_id', cierre)
      .is('hasta', null)
      .single();
    expect(titular?.empleado_id).toBe(benito);

    const despues = (await comoServicio().from('bono').select('*').order('id')).data;
    expect(despues).toEqual(antes);
  });

  it.todo('el HTML de / no contiene dólares y el de /mes sí (INV-3)');
});
