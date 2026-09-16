import { beforeAll, describe, expect, it } from 'vitest';
import { comoEmpleado, comoServicio, sembrarEmpleado, vaciar } from './entorno';

// INV-2 · Un empleado nunca obtiene datos de otro. Ni funciones, ni marcas, ni
// estados de flujo, ni razones, aunque una ruta de servidor olvide filtrar.
//
// Se prueba con dos sesiones reales contra el gotrue local. Con un cliente de
// servicio no se probaria nada: ese se salta la seguridad por fila por diseño.
describe('INV-2: un empleado nunca obtiene datos de otro', () => {
  let funcionDeB: string;

  beforeAll(async () => {
    await vaciar();
    const servicio = comoServicio();

    const a = await sembrarEmpleado('ANA', 'ana@prueba.test');
    const b = await sembrarEmpleado('BENITO', 'benito@prueba.test');

    const { data, error } = await servicio
      .from('funcion')
      .insert([
        { empleado_id: a, hash_identidad: 'a-1', texto: 'Cierre de Ana', ponderacion: 10, importancia: 7, periodicidad: 'mensual' },
        { empleado_id: b, hash_identidad: 'b-1', texto: 'Cierre de Benito', ponderacion: 20, importancia: 9, periodicidad: 'mensual' },
      ])
      .select('id, texto');
    if (error) throw error;

    funcionDeB = data.find((f) => f.texto === 'Cierre de Benito')!.id as string;

    await servicio.from('marca').insert({ funcion_id: funcionDeB, periodo: '2026-09', resultado: 'no_pude', razon: 'Secreto de Benito' });
  });

  it('una consulta sin filtro, con el token de Ana, no trae nada de Benito', async () => {
    const ana = await comoEmpleado('ana@prueba.test');

    const { data } = await ana.from('funcion').select('texto');

    expect(data?.map((f) => f.texto)).toEqual(['Cierre de Ana']);
  });

  it('pedir la funcion de Benito por su id devuelve vacio, no un error revelador', async () => {
    const ana = await comoEmpleado('ana@prueba.test');

    const { data } = await ana.from('funcion').select('texto').eq('id', funcionDeB);

    expect(data).toEqual([]);
  });

  it('las razones de Benito no llegan a Ana', async () => {
    const ana = await comoEmpleado('ana@prueba.test');

    const { data } = await ana.from('marca').select('razon');

    expect(data).toEqual([]);
  });

  it('Ana tampoco puede escribir una marca sobre una funcion ajena', async () => {
    const ana = await comoEmpleado('ana@prueba.test');

    const { error } = await ana.from('marca').insert({ funcion_id: funcionDeB, periodo: '2026-10', resultado: 'hecho' });

    expect(error).not.toBeNull();
  });
});
