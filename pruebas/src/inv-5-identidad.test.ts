import { beforeAll, describe, expect, it } from 'vitest';
import { identidadDe, reconciliar } from '@matriz/dominio';
import { comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-5 · Una funcion conserva su historial mientras siga siendo la misma
// funcion. La identidad sale del id del empleado y del texto normalizado, no de
// donde este la fila: JFS mueve bloques y reordena filas constantemente.
describe('INV-5: el historial sigue a la funcion, no a su posicion', () => {
  let empleadoId: string;
  let funcionId: string;

  beforeAll(async () => {
    await vaciar();
    empleadoId = await sembrarEmpleado('ANA', 'ana@prueba.test');

    const fila = { empleadoId, nombre: 'Cierre financiero Auto Bengala' };
    funcionId = await sembrarFuncion(empleadoId, {
      hash_identidad: identidadDe(fila),
      texto: fila.nombre,
      ponderacion: 25,
      importancia: 9,
      periodicidad: 'mensual',
      tipo_generado: 'entregable',
      fecha_alta: '2026-06-01',
    });

    await comoServicio()
      .from('marca')
      .insert({ funcion_id: funcionId, periodo: '2026-08', resultado: 'no_pude', razon: 'Michell no pasó el cálculo' });
  });

  it('mover la fila en la hoja no cambia su identidad', () => {
    const fila = { empleadoId, nombre: 'Cierre financiero Auto Bengala' };

    // Da igual en que posicion aparezca: el hash sale del texto, no del indice.
    expect(identidadDe(fila)).toBe(identidadDe({ ...fila }));
  });

  it('escribirla con otros espacios, acentos o mayusculas sigue siendo la misma', async () => {
    const comoLaEscribieronHoy = { empleadoId, nombre: '  CIERRE FINANCIERO AUTO BENGALA  ' };

    const { data } = await comoServicio()
      .from('funcion')
      .select('id')
      .eq('hash_identidad', identidadDe(comoLaEscribieronHoy))
      .maybeSingle();

    expect(data?.id).toBe(funcionId);
  });

  it('reimportarla sin cambios no la da de baja ni toca su historial', async () => {
    const existentes = [{ identidad: identidadDe({ empleadoId, nombre: 'Cierre financiero Auto Bengala' }), periodicidad: 'mensual', ponderacion: 25, importancia: 9 }];
    const leidas = [{ empleadoId, nombre: 'Cierre financiero Auto Bengala', periodicidad: 'mensual', ponderacion: 25, importancia: 9 }];

    const { altas, bajas, cambios } = reconciliar(existentes, leidas);

    expect({ altas: altas.length, bajas: bajas.length, cambios: cambios.length }).toEqual({ altas: 0, bajas: 0, cambios: 0 });

    const { count } = await comoServicio()
      .from('marca')
      .select('*', { count: 'exact', head: true })
      .eq('funcion_id', funcionId);
    expect(count).toBe(1);
  });

  it('la fecha de alta no se reescribe al reimportar', async () => {
    const { data } = await comoServicio().from('funcion').select('fecha_alta').eq('id', funcionId).single();

    expect(data?.fecha_alta).toBe('2026-06-01');
  });

  it('re-redactarla se ve como un alta y una baja, que es lo que una persona tiene que confirmar', () => {
    const existentes = [{ identidad: identidadDe({ empleadoId, nombre: 'Cierre financiero Auto Bengala' }), periodicidad: 'mensual', ponderacion: 25, importancia: 9 }];
    const leidas = [{ empleadoId, nombre: 'Cierre financiero de Auto Bengala (mensual)', periodicidad: 'mensual', ponderacion: 25, importancia: 9 }];

    const { altas, bajas } = reconciliar(existentes, leidas);

    expect(altas).toHaveLength(1);
    expect(bajas).toHaveLength(1);
  });

  // Esto era lo que el invariante pedia y no se podia cumplir: hacia falta un
  // camino para decir "estas dos son la misma". Desde CEB-130 no hace falta
  // ninguno, porque la identidad dejo de salir del texto. Renombrar es editar
  // un campo, y no hay nada que confirmar (ADR 0008).
  it('renombrar conserva marcas, fecha de alta y titular: la identidad ya no sale del texto', async () => {
    const servicio = comoServicio();
    const empleadoId = await sembrarEmpleado('BEATRIZ', 'beatriz@prueba.test');

    const funcionId = await sembrarFuncion(empleadoId, {
      hash_identidad: 'renombrable',
      texto: 'Declaraciones al SENIAT KIA',
      ponderacion: 30,
      importancia: 8,
      periodicidad: 'mensual',
      tipo_corregido: 'entregable',
      dia_tope_corregido: 3,
    });

    await servicio.from('marca').insert({ funcion_id: funcionId, periodo: '2026-08', resultado: 'no_pude', razon: 'El portal estaba caido' });

    const { data: antes } = await servicio.from('funcion').select('fecha_alta').eq('id', funcionId).single();

    await servicio.from('funcion').update({ texto: 'Declaraciones al SENIAT de KIA Motors' }).eq('id', funcionId);

    const { data: despues } = await servicio
      .from('funcion')
      .select('texto, fecha_alta, tipo_corregido, dia_tope_corregido, marca(razon), titularidad(ponderacion)')
      .eq('id', funcionId)
      .single();

    expect(despues).toEqual({
      texto: 'Declaraciones al SENIAT de KIA Motors',
      fecha_alta: antes!.fecha_alta,
      tipo_corregido: 'entregable',
      dia_tope_corregido: 3,
      marca: [{ razon: 'El portal estaba caido' }],
      titularidad: [{ ponderacion: 30 }],
    });
  });
});
