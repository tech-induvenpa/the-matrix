import { beforeAll, describe, expect, it } from 'vitest';
import { leerBloques } from '@matriz/dominio';
import { comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-6 · Un bloque que JFS escriba en el documento y que no exista en la tabla
// de empleados no importa ninguna fila, y aparece listado. Dar acceso es una
// decision de una persona, no un efecto de que alguien escriba un nombre.
const cuadricula = [
  ['', 'ANA', '', '', '', '', '', 'ASIGNACION '],
  ['', 'INDICADORES', 'CLASIFICACION', 'Importante', 'Urgente', 'PONDERACION ', 'MONTO '],
  ['', 'Cierre de Ana', '', '7', 'mensual', '25', '100'],
  ['', 'FULANO NUEVO', '', '', '', '', '', 'ASIGNACION '],
  ['', 'INDICADORES', 'CLASIFICACION', 'Importante', 'Urgente', 'PONDERACION ', 'MONTO '],
  ['', 'Trabajo de Fulano', '', '9', 'mensual', '50', '200'],
];

describe('INV-6: un bloque desconocido no importa nada y se lista', () => {
  let empleadoId: string;

  beforeAll(async () => {
    await vaciar();
    empleadoId = await sembrarEmpleado('ANA', 'ana@prueba.test');
  });

  it('las filas del bloque desconocido no se leen, y el bloque se reporta', () => {
    const { filas, bloquesDesconocidos } = leerBloques(cuadricula, { ANA: empleadoId });

    expect(filas.map((f) => f.nombre)).toEqual(['Cierre de Ana']);
    expect(bloquesDesconocidos).toEqual(['FULANO NUEVO']);
  });

  it('el bloque desconocido no crea empleado', async () => {
    const { data } = await comoServicio().from('empleado').select('nombre_bloque');

    expect(data?.map((e) => e.nombre_bloque)).toEqual(['ANA']);
  });

  it('la base tampoco aceptaria una titularidad sin empleado', async () => {
    // La funcion ya no nombra a su titular, asi que lo que la base tiene que
    // rechazar es el vinculo: sin empleado que exista, no hay de quien sea.
    await expect(
      sembrarFuncion('00000000-0000-0000-0000-000000000000', {
        hash_identidad: 'huerfana',
        texto: 'Trabajo de Fulano',
        ponderacion: 50,
        importancia: 9,
        periodicidad: 'mensual',
      }),
    ).rejects.toThrow();
  });
});
