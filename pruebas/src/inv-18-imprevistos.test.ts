import { Calendario, vencimientoPorUrgencia } from '@matriz/dominio';
import { beforeAll, describe, expect, it } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, vaciar } from './entorno';

// Los imprevistos (CEB-146, ADR 0009): trabajo que llega sin estar en el
// reparto de nadie. Estas pruebas corren con sesiones reales, porque lo que
// prueban es que la base decide, aunque la pantalla se equivoque.

const hoy = () => new Date().toISOString().slice(0, 10);
// ponytail: calendario sin feriados. La prueba no depende de la semilla, y un
// fin de semana es suficiente para que "habil siguiente" signifique algo.
const calendario = Calendario.con([]);

const sumarDias = (f: string, dias: number) => {
  const d = new Date(`${f}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

let ana: string;
let benito: string;

beforeAll(async () => {
  await vaciar();
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  benito = await sembrarEmpleado('BENITO', 'benito@prueba.test');
});

// INV-18 (reescrito, ADR 0013) · Un imprevisto vence entre el dia en que se
// pidio y 29 dias habiles despues. Ni por la interfaz ni por la base.
describe('INV-18: un imprevisto vence entre hoy y 29 habiles despues', () => {
  // Aqui si hace falta el calendario de la base: en 29 habiles caen feriados.
  let delaBase: Calendario;
  beforeAll(async () => {
    const { data } = await comoServicio().from('dia_no_habil').select('desde, hasta');
    delaBase = Calendario.con(data ?? []);
  });

  const insertar = async (texto: string, vence: string) => {
    const sesion = await comoEmpleado('ana@prueba.test');
    return (await sesion.from('imprevisto').insert({ empleado_id: ana, texto, vence, pedido_por_otro: 'Un cliente' })).error;
  };

  it('para manana se acepta', async () => {
    expect(await insertar('Cuadre de caja', vencimientoPorUrgencia(hoy(), 8, delaBase))).toBeNull();
  });

  it('a 29 habiles se acepta; a 30 se rechaza', async () => {
    expect(await insertar('Informe trimestral', delaBase.sumarHabiles(delaBase.habilSiguiente(hoy()), 29))).toBeNull();
    expect(await insertar('Demasiado lejos', delaBase.sumarHabiles(delaBase.habilSiguiente(hoy()), 30))).not.toBeNull();
  });

  // CEB-193: en un dia no habil el tope se cuenta desde el habil siguiente,
  // como en el dominio. La fecha de pedido solo la puede poner el servicio.
  it('pedido un sabado, los 29 habiles se cuentan desde el lunes', async () => {
    const hasta = new Date(`${hoy()}T00:00:00Z`);
    hasta.setUTCDate(hasta.getUTCDate() + ((6 - hasta.getUTCDay() + 7) % 7 || 7));
    const sabado = hasta.toISOString().slice(0, 10);
    const { data: yo } = await comoServicio().from('empleado').select('auth_user_id').eq('id', ana).single();
    const insertarElSabado = async (texto: string, n: number) =>
      (
        await comoServicio().from('imprevisto').insert({
          empleado_id: ana, texto, pedido_en: `${sabado}T12:00:00Z`, pedido_por_otro: 'Un cliente', registrado_por: yo!.auth_user_id,
          vence: delaBase.sumarHabiles(delaBase.habilSiguiente(sabado), n),
        })
      ).error;

    expect(await insertarElSabado('Del sabado, a 29', 29)).toBeNull();
    expect(await insertarElSabado('Del sabado, a 30', 30)).not.toBeNull();
  });

  it('a 30 habiles se rechaza tambien para el administrador', async () => {
    const jefa = await comoAdministrador('jefa@prueba.test');
    const { error } = await jefa.from('imprevisto').insert({
      empleado_id: ana, texto: 'Demasiado lejos', vence: delaBase.sumarHabiles(delaBase.habilSiguiente(hoy()), 30), pedido_por_otro: 'Un cliente',
    });
    expect(error).not.toBeNull();
  });

  it('antes de cuando se pidio tampoco: ni ayer, ni hacia atras', async () => {
    expect(await insertar('De ayer', sumarDias(hoy(), -1))).not.toBeNull();
    expect(await insertar('Del mes pasado', sumarDias(hoy(), -30))).not.toBeNull();
  });

  // Los dias se cuentan en la base igual que en el dominio, tambien mas alla
  // de la cobertura del calendario, donde solo se saltan los fines de semana.
  it('la base suma dias habiles como el dominio, dentro y fuera de lo cargado', async () => {
    const sesion = await comoEmpleado('ana@prueba.test');
    for (const desde of [hoy(), '2031-03-06']) {
      for (const n of [0, 1, 2, 7, 29]) {
        const { data, error } = await sesion.rpc('sumar_habiles', { f: desde, n });
        expect(error).toBeNull();
        expect(data).toBe(delaBase.sumarHabiles(desde, n));
      }
    }
  });

  it('la fecha en que se pidio la pone la base, no quien registra', async () => {
    const sesion = await comoEmpleado('ana@prueba.test');
    const { error } = await sesion.from('imprevisto').insert({
      empleado_id: ana, texto: 'Pedido hace un mes', vence: vencimientoPorUrgencia(hoy(), 9, calendario),
      pedido_por_otro: 'Un cliente', pedido_en: '2026-01-05T10:00:00Z',
    });
    expect(error).not.toBeNull();
  });

  // El caso que el trigger no ve: fecha atrasada Y vencimiento atrasado,
  // coherentes entre si. Solo lo para que la columna no se pueda escribir.
  it('ni siquiera con un vencimiento coherente con esa fecha atrasada', async () => {
    const sesion = await comoEmpleado('ana@prueba.test');
    const { error } = await sesion.from('imprevisto').insert({
      empleado_id: ana, texto: 'Coartada', vence: '2026-01-05',
      pedido_por_otro: 'Un cliente', pedido_en: '2026-01-05T10:00:00Z',
    });
    expect(error).not.toBeNull();
  });
});

// INV-2, ampliado a los imprevistos.
describe('INV-2: los imprevistos de uno no los ve otro', () => {
  it('Benito no puede registrarle un imprevisto a Ana', async () => {
    const sesion = await comoEmpleado('benito@prueba.test');
    const { error } = await sesion.from('imprevisto').insert({
      empleado_id: ana, texto: 'Colado', vence: vencimientoPorUrgencia(hoy(), 9, calendario), pedido_por_otro: 'Nadie',
    });
    expect(error).not.toBeNull();
  });

  it('Benito no ve los imprevistos de Ana', async () => {
    const sesion = await comoEmpleado('benito@prueba.test');
    const { data } = await sesion.from('imprevisto').select('texto').eq('empleado_id', ana);
    expect(data).toEqual([]);
  });

  it('quien lo pidio es un administrador o un "otro", nunca los dos ni ninguno', async () => {
    const sesion = await comoEmpleado('benito@prueba.test');
    const { error } = await sesion.from('imprevisto').insert({
      empleado_id: benito, texto: 'Sin origen', vence: vencimientoPorUrgencia(hoy(), 9, calendario),
    });
    expect(error).not.toBeNull();
  });
});

// Registra un imprevisto para hoy y devuelve su id.
async function registrar(correo: string, empleadoId: string, texto: string): Promise<string> {
  const sesion = await comoEmpleado(correo);
  const { data, error } = await sesion
    .from('imprevisto')
    .insert({ empleado_id: empleadoId, texto, vence: vencimientoPorUrgencia(hoy(), 9, calendario), pedido_por_otro: 'Un cliente' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

describe('marcar un imprevisto', () => {
  it('"no lo tome" sin razon se rechaza', async () => {
    const id = await registrar('ana@prueba.test', ana, 'Sin razon');
    const sesion = await comoEmpleado('ana@prueba.test');
    const { error } = await sesion.rpc('marcar_imprevisto', { el_imprevisto: id, el_resultado: 'no_lo_tome', la_razon: '' });
    expect(error).not.toBeNull();
  });

  it('marcar y deshacer la marca lo devuelve a abierto', async () => {
    const id = await registrar('ana@prueba.test', ana, 'Ida y vuelta');
    const sesion = await comoEmpleado('ana@prueba.test');

    await sesion.rpc('marcar_imprevisto', { el_imprevisto: id, el_resultado: 'hecho', la_razon: null });
    const { error } = await sesion.rpc('desmarcar_imprevisto', { el_imprevisto: id });
    expect(error).toBeNull();

    const { data } = await sesion.from('imprevisto').select('resultado').eq('id', id).single();
    expect(data?.resultado).toBeNull();
  });

  it('Benito no marca los imprevistos de Ana', async () => {
    const id = await registrar('ana@prueba.test', ana, 'De Ana');
    const sesion = await comoEmpleado('benito@prueba.test');
    const { error } = await sesion.rpc('marcar_imprevisto', { el_imprevisto: id, el_resultado: 'hecho', la_razon: null });
    expect(error).not.toBeNull();
  });
});

// INV-21 · Un imprevisto marcado no se borra, y el borrado nunca desaparece.
// La fecha en que se pidio no cambia nunca.
describe('INV-21: borrar deja traza, y lo marcado no se borra', () => {
  it('un imprevisto marcado no se borra', async () => {
    const id = await registrar('ana@prueba.test', ana, 'Ya hecho');
    const sesion = await comoEmpleado('ana@prueba.test');
    await sesion.rpc('marcar_imprevisto', { el_imprevisto: id, el_resultado: 'hecho', la_razon: null });

    const { error } = await sesion.rpc('borrar_imprevisto', { el_imprevisto: id });
    expect(error).not.toBeNull();
  });

  it('borrado sin marca, sigue en la base con quien lo borro y cuando', async () => {
    const id = await registrar('ana@prueba.test', ana, 'Me equivoque');
    const sesion = await comoEmpleado('ana@prueba.test');
    const { error } = await sesion.rpc('borrar_imprevisto', { el_imprevisto: id });
    expect(error).toBeNull();

    const { data } = await sesion.from('imprevisto').select('borrado_en, borrado_por').eq('id', id).single();
    expect(data?.borrado_en).not.toBeNull();
    expect(data?.borrado_por).not.toBeNull();
  });

  it('nadie borra fisicamente un imprevisto', async () => {
    const id = await registrar('ana@prueba.test', ana, 'Intento de borrar de verdad');
    const jefa = await comoAdministrador('jefa@prueba.test');
    await jefa.from('imprevisto').delete().eq('id', id);

    const { data } = await jefa.from('imprevisto').select('id').eq('id', id);
    expect(data).toHaveLength(1);
  });

  it('la fecha en que se pidio y el vencimiento no se cambian', async () => {
    const id = await registrar('ana@prueba.test', ana, 'Correr fechas');
    const jefa = await comoAdministrador('jefa@prueba.test');
    const { error } = await jefa.from('imprevisto').update({ pedido_en: '2026-01-05T10:00:00Z' }).eq('id', id);
    expect(error).not.toBeNull();
  });

  it('Benito no borra lo que registro Ana; el administrador si', async () => {
    const id = await registrar('ana@prueba.test', ana, 'Lo borra la jefa');
    const benitoSesion = await comoEmpleado('benito@prueba.test');
    expect((await benitoSesion.rpc('borrar_imprevisto', { el_imprevisto: id })).error).not.toBeNull();

    const jefa = await comoAdministrador('jefa@prueba.test');
    expect((await jefa.rpc('borrar_imprevisto', { el_imprevisto: id })).error).toBeNull();
  });
});
