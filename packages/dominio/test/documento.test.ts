import { describe, expect, it } from 'vitest';
import { identidadDe, normalizar, reconciliar } from '../src/documento';

describe('lo que se escribe a mano en el documento', () => {
  it('se normaliza antes de compararlo', () => {
    expect(normalizar('  Nómina   QUINCENAL ')).toBe('NOMINA QUINCENAL');
  });

  it('la puntuacion de los bordes no distingue nada', () => {
    expect(normalizar('¡Nómina, quincenal!')).toBe('NOMINA, QUINCENAL');
    expect(normalizar('(Cierre financiero) ')).toBe('CIERRE FINANCIERO');
  });

  it('la misma funcion escrita distinto sigue siendo la misma', () => {
    const a = identidadDe({ empleadoId: 'e-ana', nombre: 'Nómina  quincenal' });
    const b = identidadDe({ empleadoId: 'e-ana', nombre: 'Nomina quincenal ' });
    expect(a).toBe(b);
  });

  it('dos empleados distintos con el mismo nombre no se mezclan', () => {
    expect(identidadDe({ empleadoId: 'e-ana', nombre: 'Nómina' })).not.toBe(
      identidadDe({ empleadoId: 'e-luis', nombre: 'Nómina' }),
    );
  });
});

describe('reconciliar el documento con lo que ya existe', () => {
  const nomina = { empleadoId: 'e-ana', nombre: 'Nómina quincenal', periodicidad: 'quincenal', ponderacion: 9 };
  const cxp = { empleadoId: 'e-ana', nombre: 'Cuentas por pagar', periodicidad: 'diaria', ponderacion: 6 };

  it('separa lo nuevo, lo que cambio y lo que desaparecio', () => {
    const existentes = [
      { identidad: identidadDe(nomina), periodicidad: 'mensual', ponderacion: 9 },
      { identidad: identidadDe({ empleadoId: 'e-ana', nombre: 'Archivo' }), periodicidad: 'diaria', ponderacion: 2 },
    ];

    const cambio = reconciliar(existentes, [nomina, cxp]);

    expect(cambio.altas.map((f) => f.nombre)).toEqual(['Cuentas por pagar']);
    expect(cambio.cambios.map((c) => c.fila.nombre)).toEqual(['Nómina quincenal']);
    expect(cambio.bajas).toEqual([identidadDe({ empleadoId: 'e-ana', nombre: 'Archivo' })]);
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
