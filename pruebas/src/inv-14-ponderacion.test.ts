import { beforeEach, describe, expect, it } from 'vitest';
import { reescalarA } from '@matriz/dominio';
import { comoAdministrador, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// Cambiar el peso de una funcion suelta sin romper el cien (INV-14). El
// sistema hace la parte aritmetica: las demas conservan sus proporciones
// dentro de lo que queda.
describe('ajustar la ponderacion de una funcion', () => {
  let ana: string;
  let gorda: string;

  beforeEach(async () => {
    await vaciar();
    ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
    gorda = await sembrarFuncion(ana, {
      hash_identidad: 'g', texto: 'La gorda', periodicidad: 'mensual', importancia: 9, ponderacion: 50,
    });
    await sembrarFuncion(ana, {
      hash_identidad: 'm', texto: 'La mediana', periodicidad: 'mensual', importancia: 6, ponderacion: 30,
    });
    await sembrarFuncion(ana, {
      hash_identidad: 'f', texto: 'La flaca', periodicidad: 'mensual', importancia: 3, ponderacion: 20,
    });
  });

  const pesos = async () => {
    const { data } = await comoServicio()
      .from('titularidad')
      .select('funcion_id, ponderacion')
      .eq('empleado_id', ana)
      .is('hasta', null);
    return data ?? [];
  };

  it('bajar una sube las demas, y el total sigue en cien', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');
    const antes = await pesos();
    const resto = antes
      .filter((t) => t.funcion_id !== gorda)
      .map((t) => ({ funcionId: t.funcion_id as string, ponderacion: t.ponderacion as number }));

    const { error } = await jefa.rpc('ajustar_ponderacion', {
      la_funcion: gorda,
      quien: ana,
      nueva: 20,
      pesos_del_resto: reescalarA(resto, 80).map((p) => ({ funcion_id: p.funcionId, ponderacion: p.ponderacion })),
    });
    expect(error).toBeNull();

    const despues = await pesos();
    expect(despues.reduce((t, p) => t + (p.ponderacion as number), 0)).toBe(100);
    expect(despues.find((p) => p.funcion_id === gorda)?.ponderacion).toBe(20);

    // 30 y 20 dentro de 80: siguen siendo tres a dos.
    const otras = despues.filter((p) => p.funcion_id !== gorda).map((p) => p.ponderacion).sort();
    expect(otras).toEqual([32, 48]);
  });

  it('dejar el reparto sin cuadrar lo rechaza la base', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');

    const { error } = await jefa.rpc('ajustar_ponderacion', {
      la_funcion: gorda,
      quien: ana,
      nueva: 20,
      pesos_del_resto: [],
    });

    expect(error).not.toBeNull();
  });

  it('un empleado no puede ajustarse el peso', async () => {
    const { comoEmpleado } = await import('./entorno');
    const empleada = await comoEmpleado('ana@prueba.test');

    const { error } = await empleada.rpc('ajustar_ponderacion', {
      la_funcion: gorda, quien: ana, nueva: 99, pesos_del_resto: [],
    });

    expect(error).not.toBeNull();
  });
});
