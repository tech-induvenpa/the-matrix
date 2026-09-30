import { beforeAll, describe, expect, it } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// Eliminar por completo es para la funcion creada por error (0022). La que ya
// tiene historia se archiva: una funcion tiene vida propia (ADR 0008).
const funcion = (texto: string) => ({
  hash_identidad: `h-${texto}`,
  texto,
  importancia: 5,
  periodicidad: 'mensual',
  tipo_generado: 'entregable',
  fecha_alta: '2026-01-01',
});

let ana: string;
let porError: string;
let conHistoria: string;
let queda: string;

beforeAll(async () => {
  await vaciar();
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  porError = await sembrarFuncion(ana, { ...funcion('Por error'), ponderacion: 20 });
  conHistoria = await sembrarFuncion(ana, { ...funcion('Con historia'), ponderacion: 30 });
  queda = await sembrarFuncion(ana, { ...funcion('Queda'), ponderacion: 40 });
  await comoServicio().from('marca').insert({ funcion_id: conHistoria, periodo: '2026-01', resultado: 'hecho' });
});

describe('eliminar una funcion por completo', () => {
  it('un empleado no elimina nada', async () => {
    const sesion = await comoEmpleado('ana@prueba.test');
    expect((await sesion.rpc('eliminar_funcion', { la_funcion: porError, quien: ana, pesos: [] })).error).not.toBeNull();
  });

  it('la que tiene historia no se elimina: se archiva', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');
    expect((await jefa.rpc('eliminar_funcion', { la_funcion: conHistoria, quien: ana, pesos: [] })).error).not.toBeNull();
  });

  it('la creada por error desaparece y el reparto se reacomoda en el mismo acto', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');
    const pesos = [
      { funcion_id: conHistoria, ponderacion: 34 },
      { funcion_id: queda, ponderacion: 45 },
    ];
    expect((await jefa.rpc('eliminar_funcion', { la_funcion: porError, quien: ana, pesos })).error).toBeNull();

    const servicio = comoServicio();
    expect((await servicio.from('funcion').select('id').eq('id', porError)).data).toEqual([]);
    const { data } = await servicio.from('titularidad').select('ponderacion').eq('empleado_id', ana).order('ponderacion');
    expect(data?.map((t) => t.ponderacion)).toEqual([34, 45]);
  });
});
