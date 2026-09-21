import { beforeEach, describe, expect, it } from 'vitest';
import { comoAdministrador, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-15 · Un traspaso publica los dos lados o ninguno. Nunca existe un
// instante en que la funcion este en dos cargos ni en ninguno.
//
// INV-16 · Traspasar nunca borra una marca: son observaciones, y no hay de
// donde volver a sacarlas.
describe('INV-15 e INV-16: traspasar sin partir la historia', () => {
  let ana: string;
  let benito: string;
  let cierre: string;

  beforeEach(async () => {
    await vaciar();
    ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
    benito = await sembrarEmpleado('BENITO', 'benito@prueba.test');

    // Ana reparte 30/70; Benito, 100 en una sola.
    cierre = await sembrarFuncion(ana, {
      hash_identidad: 'c-1', texto: 'Cierre financiero', periodicidad: 'mensual', importancia: 9, ponderacion: 30,
    });
    await sembrarFuncion(ana, {
      hash_identidad: 'p-1', texto: 'Pagos', periodicidad: 'semanal', importancia: 5, ponderacion: 70,
    });
    await sembrarFuncion(benito, {
      hash_identidad: 'b-1', texto: 'Compras', periodicidad: 'semanal', importancia: 6, ponderacion: 100,
    });

    await comoServicio()
      .from('marca')
      .insert({ funcion_id: cierre, periodo: '2026-08', resultado: 'no_pude', razon: 'El banco no proceso' });
  });

  const traspaso = async (
    jefa: Awaited<ReturnType<typeof comoAdministrador>>,
    pesoNuevo: number,
    { leHaceSitio = true } = {},
  ) =>
    jefa.rpc('traspasar', {
      la_funcion: cierre,
      de_quien: ana,
      a_quien: benito,
      peso_nuevo: pesoNuevo,
      pesos_de_quien_entrega: await restoDe(ana, cierre, 100),
      pesos_de_quien_recibe: leHaceSitio ? await restoDe(benito, cierre, 100 - pesoNuevo) : [],
    });

  it('la funcion cambia de manos y su marca se queda donde estaba', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');

    // Ana se queda solo con Pagos, que pasa de 70 a 100: la proporcion se
    // conserva porque no queda nadie con quien compararse.
    const { error } = await traspaso(jefa, 25);
    expect(error).toBeNull();

    const { data: titulares } = await comoServicio()
      .from('titularidad')
      .select('empleado_id, ponderacion, hasta')
      .eq('funcion_id', cierre)
      .order('desde');

    expect(titulares).toHaveLength(2);
    expect(titulares![0]).toMatchObject({ empleado_id: ana });
    expect(titulares![0]!.hasta).not.toBeNull();
    expect(titulares![1]).toMatchObject({ empleado_id: benito, ponderacion: 25, hasta: null });

    const { data: marcas } = await comoServicio().from('marca').select('razon').eq('funcion_id', cierre);
    expect(marcas).toEqual([{ razon: 'El banco no proceso' }]);
  });

  it('si el lado que recibe no cuadra, el lado que entrega tampoco se aplica', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');

    // Si Benito no le hace sitio, queda en 125: su reparto no cuadra, asi que
    // nada debe entrar -- tampoco lo de Ana, que ya se habia aplicado.
    const { error } = await traspaso(jefa, 25, { leHaceSitio: false });

    expect(error).not.toBeNull();

    const { data } = await comoServicio()
      .from('titularidad')
      .select('empleado_id, ponderacion, hasta')
      .eq('funcion_id', cierre);

    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ empleado_id: ana, ponderacion: 30, hasta: null });
  });

  it('traspasar a quien ya la tiene no tiene sentido y se rechaza', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');

    const { error } = await jefa.rpc('traspasar', {
      la_funcion: cierre,
      de_quien: ana,
      a_quien: ana,
      peso_nuevo: 30,
      pesos_de_quien_entrega: [],
      pesos_de_quien_recibe: [],
    });

    expect(error).not.toBeNull();
  });
});

// El resto del cargo de alguien, reescalado a lo que le toque: lo que el
// dominio calcula y la base solo aplica.
async function restoDe(quien: string, sinEsta: string, objetivo: number) {
  const { reescalarA } = await import('@matriz/dominio');
  const { data } = await comoServicio()
    .from('titularidad')
    .select('funcion_id, ponderacion')
    .eq('empleado_id', quien)
    .is('hasta', null);

  const quedan = (data ?? [])
    .filter((t) => t.funcion_id !== sinEsta)
    .map((t) => ({ funcionId: t.funcion_id as string, ponderacion: t.ponderacion as number }));

  return reescalarA(quedan, objetivo).map((p) => ({ funcion_id: p.funcionId, ponderacion: p.ponderacion }));
}
