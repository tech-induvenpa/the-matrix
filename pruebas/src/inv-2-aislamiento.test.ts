import { beforeAll, describe, expect, it } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, vaciar } from './entorno';

// INV-2 · Un empleado nunca obtiene datos de otro empleado, y quien no es
// administrador no obtiene datos de nadie mas que de si mismo. Ni funciones, ni
// marcas, ni estados de flujo, ni razones, aunque una ruta de servidor olvide
// filtrar.
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

  it('un administrador si ve a todos: para eso existe el rol', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');

    const { data } = await jefa.from('funcion').select('texto');

    expect(data?.map((f) => f.texto).sort()).toEqual(['Cierre de Ana', 'Cierre de Benito']);
  });

  it('el administrador lee las razones de todos, que es lo que vino a buscar', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');

    const { data } = await jefa.from('marca').select('razon');

    expect(data?.map((m) => m.razon)).toEqual(['Secreto de Benito']);
  });

  it('que exista un administrador no le abre nada a un empleado', async () => {
    await comoAdministrador('jefa@prueba.test');
    const ana = await comoEmpleado('ana@prueba.test');

    const { data } = await ana.from('funcion').select('texto');

    expect(data?.map((f) => f.texto)).toEqual(['Cierre de Ana']);
  });

  it('un empleado no puede leer quien es administrador', async () => {
    const ana = await comoEmpleado('ana@prueba.test');

    const { data } = await ana.from('administrador').select('auth_user_id');

    expect(data ?? []).toEqual([]);
  });

  it('un empleado no puede hacerse administrador', async () => {
    const ana = await comoEmpleado('ana@prueba.test');
    const { data: usuario } = await ana.auth.getUser();

    const { error } = await ana.from('administrador').insert({ auth_user_id: usuario.user!.id });

    expect(error).not.toBeNull();
  });
});
