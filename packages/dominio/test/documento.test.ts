import { describe, expect, it } from 'vitest';
import { identidadDe, normalizar, reconciliar } from '../src/documento';

describe('lo que se escribe a mano en el documento', () => {
  it('se normaliza antes de compararlo', () => {
    expect(normalizar('  Nómina   QUINCENAL ')).toBe('NOMINA QUINCENAL');
  });

  it('la misma funcion escrita distinto sigue siendo la misma', () => {
    const a = identidadDe({ empleado: 'ana@jfs.com', nombre: 'Nómina  quincenal' });
    const b = identidadDe({ empleado: 'ANA@jfs.com', nombre: 'Nomina quincenal ' });
    expect(a).toBe(b);
  });

  it('la de otro empleado nunca coincide, aunque la funcion se llame igual', () => {
    expect(identidadDe({ empleado: 'ana@jfs.com', nombre: 'Nómina' })).not.toBe(
      identidadDe({ empleado: 'luis@jfs.com', nombre: 'Nómina' }),
    );
  });
});

describe('reconciliar el documento con lo que ya existe', () => {
  const nomina = { empleado: 'ana@jfs.com', nombre: 'Nómina quincenal', periodicidad: 'quincenal', ponderacion: 9 };
  const cxp = { empleado: 'ana@jfs.com', nombre: 'Cuentas por pagar', periodicidad: 'diaria', ponderacion: 6 };

  it('separa lo nuevo, lo que cambio y lo que desaparecio', () => {
    const existentes = [
      { identidad: identidadDe(nomina), periodicidad: 'mensual', ponderacion: 9 },
      { identidad: identidadDe({ empleado: 'ana@jfs.com', nombre: 'Archivo' }), periodicidad: 'diaria', ponderacion: 2 },
    ];

    const cambio = reconciliar(existentes, [nomina, cxp]);

    expect(cambio.altas.map((f) => f.nombre)).toEqual(['Cuentas por pagar']);
    expect(cambio.cambios.map((c) => c.fila.nombre)).toEqual(['Nómina quincenal']);
    expect(cambio.bajas).toEqual([identidadDe({ empleado: 'ana@jfs.com', nombre: 'Archivo' })]);
  });

  it('una fila identica no toca nada: importar dos veces no cambia nada', () => {
    const existentes = [{ identidad: identidadDe(nomina), periodicidad: 'quincenal', ponderacion: 9 }];
    const cambio = reconciliar(existentes, [nomina]);
    expect(cambio).toEqual({ altas: [], cambios: [], bajas: [] });
  });

  it('renombrar una funcion la da de baja y crea otra: el nombre es su identidad', () => {
    const existentes = [{ identidad: identidadDe(nomina), periodicidad: 'quincenal', ponderacion: 9 }];
    const cambio = reconciliar(existentes, [{ ...nomina, nombre: 'Nómina de la quincena' }]);
    expect(cambio.altas).toHaveLength(1);
    expect(cambio.bajas).toHaveLength(1);
  });
});
