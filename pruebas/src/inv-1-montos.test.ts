import { beforeAll, describe, expect, it } from 'vitest';
import { identidadDe, leerBloques } from '@matriz/dominio';
import { comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-1 · Ningun monto del documento llega a la base. No es que no se muestre:
// es que no se importa. La cuadricula lleva montos inventados y faciles de
// buscar; si alguno aparece en cualquier columna de cualquier tabla, el
// invariante esta roto.
const MONTOS = ['7777,77', '8888.88', '9999'];

const cuadricula = [
  [],
  ['', 'FUNCIONES CUANTIFICADAS DEL PERSONAL'],
  [],
  ['', 'ANA', '', '', '', '', '', 'ASIGNACION '],
  ['', 'INDICADORES', 'CLASIFICACION', 'Importante', 'Urgente', 'PONDERACION ', 'MONTO ', 'ASIGNACION '],
  ['', 'Cierre de Ana', 'IMPORTANTE', '7', 'mensual', '25', MONTOS[0]!, MONTOS[2]!],
  ['', 'Pagos de Ana', 'IMPORTANTE', '5', 'semanal', '10', MONTOS[1]!, MONTOS[2]!],
  ['', '', '', '', '', '100', MONTOS[2]!],
];

describe('INV-1: ningun monto del documento llega a la base', () => {
  beforeAll(async () => {
    await vaciar();
    const empleadoId = await sembrarEmpleado('ANA', 'ana@prueba.test');

    const { filas } = leerBloques(cuadricula, { ANA: empleadoId });

    for (const f of filas) {
      await sembrarFuncion(f.empleadoId, {
        hash_identidad: identidadDe(f),
        texto: f.nombre,
        ponderacion: f.ponderacion ?? 0,
        importancia: f.importancia ?? 0,
        periodicidad: f.periodicidad!,
      });
    }
  });

  it('las funciones entran, con su ponderacion y su importancia', async () => {
    // La ponderacion viaja en el vinculo con el titular, no en la funcion.
    const { data } = await comoServicio().from('funcion').select('texto, importancia, titularidad(ponderacion)');

    expect(data?.map((f) => f.texto).sort()).toEqual(['Cierre de Ana', 'Pagos de Ana']);
    expect(data?.find((f) => f.texto === 'Cierre de Ana')?.titularidad).toEqual([{ ponderacion: 25 }]);
  });

  it('ningun monto aparece en ninguna columna de ninguna tabla', async () => {
    const servicio = comoServicio();
    const [funciones, titularidades, empleados, marcas] = await Promise.all([
      servicio.from('funcion').select('*'),
      servicio.from('titularidad').select('*'),
      servicio.from('empleado').select('*'),
      servicio.from('marca').select('*'),
    ]);

    const todo = JSON.stringify([funciones.data, titularidades.data, empleados.data, marcas.data]);

    for (const monto of MONTOS) expect(todo).not.toContain(monto);
  });

  it('la tabla de funciones no tiene donde guardar un monto', async () => {
    const { data } = await comoServicio().from('funcion').select('*').limit(1);
    const columnas = Object.keys(data?.[0] ?? {});

    expect(columnas.some((c) => /monto|asignacion|sueldo|salario/i.test(c))).toBe(false);
  });
});
