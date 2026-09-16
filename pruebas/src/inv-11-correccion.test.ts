import { beforeAll, describe, expect, it } from 'vitest';
import { comoServicio, sembrarEmpleado, vaciar } from './entorno';

// INV-11 · Lo que corrige una persona manda sobre lo que propone el agente, y
// sobrevive a reimportar. El agente solo escribe las columnas _generado.
describe('INV-11: una correccion manual sobrevive a la reimportacion', () => {
  let funcionId: string;

  beforeAll(async () => {
    await vaciar();
    const empleadoId = await sembrarEmpleado('ANA', 'ana@prueba.test');

    const { data, error } = await comoServicio()
      .from('funcion')
      .insert({
        empleado_id: empleadoId,
        hash_identidad: 'corregida-1',
        texto: 'Asistencia a la gerencia',
        ponderacion: 25,
        importancia: 8,
        periodicidad: 'mensual',
        tipo_generado: 'entregable',
        dia_tope_generado: 3,
      })
      .select('id')
      .single();
    if (error) throw error;
    funcionId = data.id as string;

    // Una persona corrige: esto no es un entregable, es un area del cargo.
    await comoServicio()
      .from('funcion')
      .update({ tipo_corregido: 'area', dia_tope_corregido: null })
      .eq('id', funcionId);
  });

  it('el valor vigente es el corregido, no el generado', async () => {
    const { data } = await comoServicio().from('funcion').select('tipo_generado, tipo_corregido').eq('id', funcionId).single();

    expect(data?.tipo_generado).toBe('entregable');
    expect(data?.tipo_corregido).toBe('area');
  });

  it('reimportar la fila actualiza lo que escribe JFS y no toca la correccion', async () => {
    // Lo que hace el importador con una fila que cambio en el documento.
    const { error } = await comoServicio()
      .from('funcion')
      .update({ ponderacion: 30, importancia: 9, periodicidad: 'trimestral' })
      .eq('hash_identidad', 'corregida-1');
    if (error) throw error;

    const { data } = await comoServicio()
      .from('funcion')
      .select('ponderacion, periodicidad, tipo_generado, tipo_corregido')
      .eq('id', funcionId)
      .single();

    expect(data?.ponderacion).toBe(30);
    expect(data?.periodicidad).toBe('trimestral');
    expect(data?.tipo_corregido).toBe('area');
  });

  it('la base rechaza un tipo corregido que no existe', async () => {
    const { error } = await comoServicio().from('funcion').update({ tipo_corregido: 'inventado' }).eq('id', funcionId);

    expect(error).not.toBeNull();
  });
});
