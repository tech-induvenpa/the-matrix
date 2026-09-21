import { beforeAll, describe, expect, it } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-13 · Un borrador nunca llega a la pantalla de un empleado. Lo que ve es
// siempre el ultimo reparto publicado.
//
// INV-14 · Un reparto que no suma cien no se publica, ni por la interfaz ni por
// la base.
describe('INV-13 e INV-14: el borrador y el cien', () => {
  let ana: string;
  let cierre: string;
  let pagos: string;

  beforeAll(async () => {
    await vaciar();
    ana = await sembrarEmpleado('ANA', 'ana@prueba.test');

    cierre = await sembrarFuncion(ana, {
      hash_identidad: 'c-1', texto: 'Cierre de Ana', periodicidad: 'mensual', importancia: 9, ponderacion: 60,
    });
    pagos = await sembrarFuncion(ana, {
      hash_identidad: 'p-1', texto: 'Pagos de Ana', periodicidad: 'semanal', importancia: 5, ponderacion: 40,
    });

    await comoServicio().from('titularidad').update({ publicado_en: new Date().toISOString() }).eq('empleado_id', ana);
  });

  it('un borrador no cambia lo que ve el empleado', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');

    await jefa.from('titularidad').insert([
      { funcion_id: cierre, empleado_id: ana, ponderacion: 10, publicado_en: null },
      { funcion_id: pagos, empleado_id: ana, ponderacion: 90, publicado_en: null },
    ]);

    const empleada = await comoEmpleado('ana@prueba.test');
    const { data } = await empleada
      .from('funcion')
      .select('texto, titularidad(ponderacion)')
      .order('texto');

    expect(data).toEqual([
      { texto: 'Cierre de Ana', titularidad: [{ ponderacion: 60 }] },
      { texto: 'Pagos de Ana', titularidad: [{ ponderacion: 40 }] },
    ]);
  });

  it('publicar un reparto que no suma cien lo rechaza la base', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');

    await jefa.from('titularidad').delete().eq('empleado_id', ana).is('publicado_en', null);
    await jefa.from('titularidad').insert([
      { funcion_id: cierre, empleado_id: ana, ponderacion: 10, publicado_en: null },
      { funcion_id: pagos, empleado_id: ana, ponderacion: 89, publicado_en: null },
    ]);

    const { error } = await jefa.rpc('publicar_reparto', { quien: ana });

    expect(error).not.toBeNull();
  });

  it('y el reparto vigente no cambio ni un punto', async () => {
    const { data } = await comoServicio()
      .from('titularidad')
      .select('ponderacion')
      .eq('empleado_id', ana)
      .is('hasta', null)
      .not('publicado_en', 'is', null)
      .order('ponderacion');

    expect(data?.map((t) => t.ponderacion)).toEqual([40, 60]);
  });

  it('cuando suma cien, se publica y el empleado lo ve', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');

    await jefa.from('titularidad').delete().eq('empleado_id', ana).is('publicado_en', null);
    await jefa.from('titularidad').insert([
      { funcion_id: cierre, empleado_id: ana, ponderacion: 30, publicado_en: null },
      { funcion_id: pagos, empleado_id: ana, ponderacion: 70, publicado_en: null },
    ]);

    const { error } = await jefa.rpc('publicar_reparto', { quien: ana });
    expect(error).toBeNull();

    const empleada = await comoEmpleado('ana@prueba.test');
    const { data } = await empleada.from('funcion').select('texto, titularidad(ponderacion)').order('texto');

    expect(data).toEqual([
      { texto: 'Cierre de Ana', titularidad: [{ ponderacion: 30 }] },
      { texto: 'Pagos de Ana', titularidad: [{ ponderacion: 70 }] },
    ]);
  });

  // Cambiar un peso no es cambiar de manos: el historial tiene que seguir
  // mostrando una sola tenencia, no una por publicacion.
  it('publicar un cambio de peso no ensucia el historial de titulares', async () => {
    const { data } = await comoServicio().from('titularidad').select('id').eq('funcion_id', cierre);

    expect(data).toHaveLength(1);
  });
});
