import { describe, expect, it } from 'vitest';
import { leerBloques } from '../src/cuadricula';

// Copia la forma real del documento: titulo, bloque plantilla sin nombre,
// nombres combinados, encabezados repetidos, fila de totales, bloques pegados
// sin fila en blanco, espacios finales y montos que no se importan.
const cuadricula = [
  ['FUNCIONES CUANTIFICADAS DEL PERSONAL', '', '', '', ''],
  ['', '', '', '', ''],
  ['INDICADORES', 'PONDERACION', 'IMPORTANCIA', 'Urgente', 'MONTO'],
  ['', '', '', '', ''],
  ['DOUGLENIS', '', '', '', ''],
  ['INDICADORES', 'PONDERACION', 'IMPORTANCIA', 'Urgente', 'MONTO'],
  ['Cierre financiero Auto Bengala ', '25', '9', 'mensual', '1.200'],
  ['  Pago condominio SEDEFANB', '2', '5', 'mensual', '80'],
  ['', '100', '', '', '1.280'],
  ['ROSIBEL', '', '', '', ''],
  ['INDICADORES', 'PONDERACION', 'IMPORTANCIA', 'Urgente', 'MONTO'],
  ['Cuentas por pagar MDV', '5', '5', 'diaria', '300'],
];

const empleados = { DOUGLENIS: 'e-douglenis', ROSIBEL: 'e-rosibel' };

describe('leer el documento como cuadricula', () => {
  it('cada fila pertenece al bloque de arriba, y el monto no se importa', () => {
    const { filas } = leerBloques(cuadricula, empleados);

    expect(filas).toEqual([
      { empleadoId: 'e-douglenis', nombre: 'Cierre financiero Auto Bengala', ponderacion: 25, importancia: 9, periodicidad: 'mensual' },
      { empleadoId: 'e-douglenis', nombre: 'Pago condominio SEDEFANB', ponderacion: 2, importancia: 5, periodicidad: 'mensual' },
      { empleadoId: 'e-rosibel', nombre: 'Cuentas por pagar MDV', ponderacion: 5, importancia: 5, periodicidad: 'diaria' },
    ]);
  });

  it('el bloque plantilla, sin nombre encima, se descarta', () => {
    expect(leerBloques(cuadricula, empleados).filas.some((f) => !f.empleadoId)).toBe(false);
  });

  it('la fila de totales no tiene indicador, asi que se salta sola', () => {
    expect(leerBloques(cuadricula, empleados).filas.map((f) => f.ponderacion)).not.toContain(100);
  });

  it('un bloque que no existe en la base no crea empleado: se lista', () => {
    const { filas, bloquesDesconocidos } = leerBloques(cuadricula, { DOUGLENIS: 'e-douglenis' });
    expect(bloquesDesconocidos).toEqual(['ROSIBEL']);
    expect(filas.every((f) => f.empleadoId === 'e-douglenis')).toBe(true);
  });

  it('dos bloques con el mismo nombre no se importan: no se sabe de quien son', () => {
    const conDosMarias = [
      ['MARIA', '', '', '', ''],
      ['INDICADORES', 'PONDERACION', 'IMPORTANCIA', 'Urgente', 'MONTO'],
      ['Conciliación bancaria', '8', '7', 'semanal', '400'],
      ['MARIA', '', '', '', ''],
      ['INDICADORES', 'PONDERACION', 'IMPORTANCIA', 'Urgente', 'MONTO'],
      ['Archivo de expedientes', '3', '4', 'diaria', '150'],
    ];

    const { filas, bloquesAmbiguos } = leerBloques(conDosMarias, { MARIA: 'e-maria' });
    expect(bloquesAmbiguos).toEqual(['MARIA']);
    expect(filas).toEqual([]);
  });
});
