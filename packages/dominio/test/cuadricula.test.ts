import { describe, expect, it } from 'vitest';
import { leerBloques } from '../src/cuadricula';

// Copia la forma real del documento de JFS: la columna 0 vacia, el titulo
// arriba, el nombre del empleado con la etiqueta ASIGNACION a su derecha, la
// fila de totales, bloques pegados sin fila en blanco y montos que no se
// importan. Las columnas Importante y Urgente llegan vacias: hoy la cadencia
// esta escrita en prosa dentro del propio nombre.
const cuadricula = [
  [],
  ['', 'FUNCIONES CUANTIFICADAS DEL PERSONAL'],
  [],
  ['', 'EDDYMAR RODRIGUEZ', '', '', '', '', '', 'ASIGNACION '],
  ['', 'INDICADORES', 'CLASIFICACION', 'Importante', 'Urgente', 'PONDERACION ', 'MONTO ', '  3,000.00   '],
  ['', 'TAXES JFS (ESTABLECER FECHA TOPE PARA EL ENVIO) ', 'IMPORTANTE', '', '', '25', '  750.00   '],
  ['', 'REPORTE FINANCIERO (TOYOTA TRIMESTRAL)', 'IMPORTANTE', '9', 'trimestral', '5', '  150.00   '],
  ['', '', '', '', '', '', '  -     '],
  ['', '', '', '', '', '100', '3,000.00'],
  // Pegado al anterior, sin fila en blanco.
  ['', 'ROSIBEL', '', '', '', '', '', 'ASIGNACION '],
  ['', 'INDICADORES', 'CLASIFICACION', '', '', 'PONDERACION ', 'MONTO ', 'ASIGNACION '],
  ['', 'COMISION VENDEDORES', '', '', '', '10', '200'],
];

const empleados = { 'EDDYMAR RODRIGUEZ': 'e-eddymar', ROSIBEL: 'e-rosibel' };

describe('leer el documento como cuadricula', () => {
  it('encuentra las columnas por su encabezado, no por su posicion', () => {
    // Los datos no empiezan en la columna 0 y el ancho cambia entre bloques.
    expect(leerBloques(cuadricula, empleados).filas).toEqual([
      {
        empleadoId: 'e-eddymar',
        nombre: 'TAXES JFS (ESTABLECER FECHA TOPE PARA EL ENVIO)',
        ponderacion: 25,
        importancia: undefined,
        periodicidad: undefined,
      },
      {
        empleadoId: 'e-eddymar',
        nombre: 'REPORTE FINANCIERO (TOYOTA TRIMESTRAL)',
        ponderacion: 5,
        importancia: 9,
        periodicidad: 'trimestral',
      },
      {
        empleadoId: 'e-rosibel',
        nombre: 'COMISION VENDEDORES',
        ponderacion: 10,
        importancia: undefined,
        periodicidad: undefined,
      },
    ]);
  });

  it('el nombre del bloque lleva etiquetas a su derecha y aun asi es un nombre', () => {
    expect(leerBloques(cuadricula, empleados).filas[0]?.empleadoId).toBe('e-eddymar');
  });

  it('un bloque pegado al anterior arranca igual, sin fila en blanco', () => {
    expect(leerBloques(cuadricula, empleados).filas.at(-1)?.empleadoId).toBe('e-rosibel');
  });

  it('el titulo del documento no es el nombre de nadie', () => {
    expect(leerBloques(cuadricula, empleados).bloquesDesconocidos).toEqual([]);
  });

  it('la fila de totales no tiene indicador, asi que se salta sola', () => {
    expect(leerBloques(cuadricula, empleados).filas.map((f) => f.ponderacion)).not.toContain(100);
  });

  it('el bloque plantilla, con su encabezado y sin nombre encima, se descarta', () => {
    const conPlantilla = [
      ['', 'INDICADORES', 'CLASIFICACION', '', '', 'PONDERACION ', 'MONTO '],
      ['', 'FUNCION DE EJEMPLO', '', '', '', '10', '100'],
      ...cuadricula,
    ];
    expect(leerBloques(conPlantilla, empleados).filas).toHaveLength(3);
  });

  it('un bloque que no existe en la base no crea empleado: se lista', () => {
    const { filas, bloquesDesconocidos } = leerBloques(cuadricula, { ROSIBEL: 'e-rosibel' });
    expect(bloquesDesconocidos).toEqual(['EDDYMAR RODRIGUEZ']);
    expect(filas.every((f) => f.empleadoId === 'e-rosibel')).toBe(true);
  });

  it('dos bloques con el mismo nombre no se importan: no se sabe de quien son', () => {
    const conDosMarias = [
      ['', 'MARIA', '', '', '', '', '', 'ASIGNACION '],
      ['', 'INDICADORES', 'CLASIFICACION', '', '', 'PONDERACION ', 'MONTO '],
      ['', 'CONCILIACION BANCARIA', '', '', '', '8', '400'],
      ['', 'MARIA', '', '', '', '', '', 'ASIGNACION '],
      ['', 'INDICADORES', 'CLASIFICACION', '', '', 'PONDERACION ', 'MONTO '],
      ['', 'ARCHIVO DE EXPEDIENTES', '', '', '', '3', '150'],
    ];

    const { filas, bloquesAmbiguos } = leerBloques(conDosMarias, { MARIA: 'e-maria' });
    expect(bloquesAmbiguos).toEqual(['MARIA']);
    expect(filas).toEqual([]);
  });
});
