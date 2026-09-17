import { beforeAll, describe, expect, it } from 'vitest';
import { comoEmpleado, comoServicio, sembrarEmpleado, vaciar } from './entorno';

// INV-3 · El empleado no ve el peso de su trabajo en la pantalla donde trabaja,
// y no ve una tasa de cumplimiento en ninguna parte. La ponderacion existe y es
// suya, pero solo se muestra en el listado del mes, bajo el encuadre de como se
// reparte su cargo.
describe('INV-3: la ponderacion vive en el mes, y la tasa no existe', () => {
  beforeAll(async () => {
    await vaciar();
    const ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
    const benito = await sembrarEmpleado('BENITO', 'benito@prueba.test');

    const { error } = await comoServicio()
      .from('funcion')
      .insert([
        { empleado_id: ana, hash_identidad: 'a-1', texto: 'Cierre de Ana', ponderacion: 25, importancia: 9, periodicidad: 'mensual', tipo_generado: 'entregable' },
        { empleado_id: benito, hash_identidad: 'b-1', texto: 'Cierre de Benito', ponderacion: 40, importancia: 9, periodicidad: 'mensual', tipo_generado: 'entregable' },
      ]);
    if (error) throw error;
  });

  it('no existe ninguna tasa de cumplimiento que consultar: no se guarda, se calcularia', async () => {
    const { data } = await comoServicio().from('funcion').select('*').limit(1);
    const columnas = Object.keys(data?.[0] ?? {});

    expect(columnas.some((c) => /tasa|cumplimiento|porcentaje|rendimiento/i.test(c))).toBe(false);
  });

  it('el empleado puede leer la ponderacion de lo suyo, que es lo que alimenta el mes', async () => {
    const ana = await comoEmpleado('ana@prueba.test');

    const { data } = await ana.from('funcion').select('texto, ponderacion');

    expect(data).toEqual([{ texto: 'Cierre de Ana', ponderacion: 25 }]);
  });

  it('y no puede leer la de nadie mas, ni sumarla', async () => {
    const ana = await comoEmpleado('ana@prueba.test');

    const { data } = await ana.from('funcion').select('ponderacion').neq('texto', 'Cierre de Ana');

    expect(data).toEqual([]);
  });

  // La garantia que falta es de interfaz, no de datos: que el HTML de la
  // pantalla de trabajo no imprima la ponderacion y el del mes si. Pide levantar
  // Next contra esta base y pedir las dos paginas con una sesion.
  it.todo('el HTML de / no contiene la ponderación y el de /mes sí');
});
