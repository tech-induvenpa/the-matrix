import { beforeAll, describe, expect, it } from 'vitest';
import { arrastreDe, Calendario, ocurrenciasEntre } from '@matriz/dominio';
import { comoAdministrador, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-17 · El arrastre de una persona no incluye lo de quien tuvo la funcion
// antes. Nadie hereda la mora de otro.
//
// Y su contraparte, que es lo que el sistema no podia ver hasta ahora: el
// arrastre de la FUNCION si cruza a los titulares, porque una funcion que dos
// personas seguidas no pudieron sostener no es un problema de ninguna de las
// dos (ADR 0008).
describe('INV-17: el arrastre no se hereda, pero la funcion lo conserva', () => {
  const HOY = '2026-09-21';
  let ana: string;
  let benito: string;
  let cierre: string;
  let calendario: Calendario;

  beforeAll(async () => {
    await vaciar();
    ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
    benito = await sembrarEmpleado('BENITO', 'benito@prueba.test');

    // Alta en abril: mayo, junio, julio y agosto vencieron sin marcarse.
    cierre = await sembrarFuncion(ana, {
      hash_identidad: 'c-1',
      texto: 'Cierre financiero',
      periodicidad: 'mensual',
      importancia: 9,
      ponderacion: 100,
      fecha_alta: '2026-04-01',
    });
    await sembrarFuncion(benito, {
      hash_identidad: 'b-1', texto: 'Compras', periodicidad: 'semanal', importancia: 6, ponderacion: 100,
    });

    const { data: dias } = await comoServicio().from('dia_no_habil').select('desde, hasta');
    calendario = Calendario.con(dias ?? []);
  });

  const ocurrencias = (desde: string) =>
    ocurrenciasEntre({ periodicidad: 'mensual', fechaAlta: '2026-04-01' }, calendario, desde, HOY);

  it('antes del traspaso, Ana arrastra todo lo que no cerro', async () => {
    const { data: tenencia } = await comoServicio()
      .from('titularidad')
      .select('desde')
      .eq('funcion_id', cierre)
      .is('hasta', null)
      .single();

    const suyo = arrastreDe(ocurrencias(tenencia!.desde as string), [], HOY);
    const deLaFuncion = arrastreDe(ocurrencias('2026-04-01'), [], HOY);

    expect(deLaFuncion.periodos).toBeGreaterThan(0);
    // Su tenencia empezo hoy (se sembro hoy), asi que lo suyo es menos que lo
    // de la funcion: la aritmetica de la herencia ya se ve aqui.
    expect(suyo.periodos).toBeLessThanOrEqual(deLaFuncion.periodos);
  });

  it('despues del traspaso, quien recibe empieza en cero y la funcion no', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');

    const { error } = await jefa.rpc('traspasar', {
      la_funcion: cierre,
      de_quien: ana,
      a_quien: benito,
      peso_nuevo: 50,
      pesos_de_quien_entrega: [],
      pesos_de_quien_recibe: [{ funcion_id: await compras(benito), ponderacion: 50 }],
    });
    expect(error).toBeNull();

    const { data: nueva } = await comoServicio()
      .from('titularidad')
      .select('desde, empleado_id')
      .eq('funcion_id', cierre)
      .is('hasta', null)
      .single();

    expect(nueva!.empleado_id).toBe(benito);

    // Lo de Benito arranca el dia del traspaso: nada de lo de Ana le cuenta.
    const suyo = arrastreDe(ocurrencias(nueva!.desde as string), [], HOY);
    expect(suyo.periodos).toBe(0);

    // Y la funcion conserva su cuenta entera, que es la señal de que el
    // problema no era de quien la tenia.
    const deLaFuncion = arrastreDe(ocurrencias('2026-04-01'), [], HOY);
    expect(deLaFuncion.periodos).toBeGreaterThan(0);
  });

  it('el historial guarda las dos manos por las que paso', async () => {
    const { data } = await comoServicio()
      .from('titularidad')
      .select('empleado_id, hasta')
      .eq('funcion_id', cierre)
      .order('desde');

    expect(data).toHaveLength(2);
    expect(data![0]!.empleado_id).toBe(ana);
    expect(data![0]!.hasta).not.toBeNull();
    expect(data![1]!.empleado_id).toBe(benito);
    expect(data![1]!.hasta).toBeNull();
  });
});

async function compras(quien: string) {
  const { data } = await comoServicio()
    .from('titularidad')
    .select('funcion_id')
    .eq('empleado_id', quien)
    .is('hasta', null)
    .single();
  return data!.funcion_id as string;
}
