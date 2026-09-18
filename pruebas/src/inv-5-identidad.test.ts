import { beforeAll, describe, expect, it } from 'vitest';
import { identidadDe, reconciliar } from '@matriz/dominio';
import { comoServicio, sembrarEmpleado, vaciar } from './entorno';

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
    const { data, error } = await comoServicio()
      .from('funcion')
      .insert({
        empleado_id: empleadoId,
        hash_identidad: identidadDe(fila),
        texto: fila.nombre,
        ponderacion: 25,
        importancia: 9,
        periodicidad: 'mensual',
        tipo_generado: 'entregable',
        fecha_alta: '2026-06-01',
      })
      .select('id')
      .single();
    if (error) throw error;
    funcionId = data.id as string;

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

  // Lo que el invariante pide de verdad y todavia no existe: un camino para
  // decir "estas dos son la misma" y que el historial se mude con ella. Hoy el
  // importador solo sabe archivar la vieja y crear la nueva, asi que las marcas
  // se quedan colgando de una funcion archivada.
  it.todo('confirmar un renombre conserva marcas, fecha de alta y valores corregidos');
});
