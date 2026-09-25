import { Calendario, vencimientoDe } from '@matriz/dominio';
import { beforeAll, describe, expect, it } from 'vitest';
import { comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// La intromision: el vinculo entre un incumplimiento de lo previsto y los
// imprevistos que lo causaron (CEB-146). La base aplica la regla 3 con lo que
// sabe: en una ocurrencia, el fin de su periodo; en un flujo, su ultimo "al dia".

const hoy = () => new Date().toISOString().slice(0, 10);
const calendario = Calendario.con([]);
const mesDe = (f: string) => f.slice(0, 7);

let ana: string;
let benito: string;
let cierre: string;
let caja: string;

async function registrar(correo: string, empleadoId: string, texto: string): Promise<string> {
  const sesion = await comoEmpleado(correo);
  const { data, error } = await sesion
    .from('imprevisto')
    .insert({ empleado_id: empleadoId, texto, vence: vencimientoDe(hoy(), 'hoy', calendario), pedido_por_otro: 'Un cliente' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

beforeAll(async () => {
  await vaciar();
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  benito = await sembrarEmpleado('BENITO', 'benito@prueba.test');
  cierre = await sembrarFuncion(ana, {
    texto: 'Cierre de Ana', periodicidad: 'mensual', importancia: 9, tipo_generado: 'entregable', ponderacion: 60,
  });
  caja = await sembrarFuncion(ana, {
    texto: 'Caja de Ana', periodicidad: 'diaria', importancia: 5, tipo_generado: 'flujo', ponderacion: 40,
  });
});

// INV-20 · Una intromision solo vincula imprevistos pedidos antes del
// vencimiento de lo que se incumplio. En un flujo, desde su ultimo "al dia".
describe('INV-20: la intromision no se puede inventar', () => {
  it('un "no pude" de este mes se vincula a un imprevisto de hoy', async () => {
    const imprevisto = await registrar('ana@prueba.test', ana, 'Auditoria sorpresa');
    const sesion = await comoEmpleado('ana@prueba.test');

    const { error } = await sesion.rpc('marcar_no_pude', {
      la_funcion: cierre, el_periodo: mesDe(hoy()), la_razon: 'Me cayo una auditoria', imprevistos: [imprevisto],
    });
    expect(error).toBeNull();

    const { data } = await sesion.from('intromision').select('imprevisto_id');
    expect(data).toEqual([{ imprevisto_id: imprevisto }]);

    await comoServicio().from('marca').delete().eq('funcion_id', cierre);
  });

  it('un imprevisto pedido despues del fin del periodo se rechaza, y la marca tampoco queda', async () => {
    const imprevisto = await registrar('ana@prueba.test', ana, 'Llego tarde para excusar agosto');
    const sesion = await comoEmpleado('ana@prueba.test');

    const { error } = await sesion.rpc('marcar_no_pude', {
      la_funcion: cierre, el_periodo: '2020-08', la_razon: 'Excusa', imprevistos: [imprevisto],
    });
    expect(error).not.toBeNull();

    const { data } = await sesion.from('marca').select('id').eq('periodo', '2020-08');
    expect(data).toEqual([]);
  });

  it('un imprevisto de otro empleado se rechaza', async () => {
    const deBenito = await registrar('benito@prueba.test', benito, 'De Benito');
    const sesion = await comoEmpleado('ana@prueba.test');

    const { error } = await sesion.rpc('marcar_no_pude', {
      la_funcion: cierre, el_periodo: mesDe(hoy()), la_razon: 'Ajeno', imprevistos: [deBenito],
    });
    expect(error).not.toBeNull();
  });

  it('un "no pude" sin razon se rechaza aunque traiga vinculos', async () => {
    const imprevisto = await registrar('ana@prueba.test', ana, 'Sin razon');
    const sesion = await comoEmpleado('ana@prueba.test');

    const { error } = await sesion.rpc('marcar_no_pude', {
      la_funcion: cierre, el_periodo: mesDe(hoy()), la_razon: ' ', imprevistos: [imprevisto],
    });
    expect(error).not.toBeNull();
  });

  it('deshacer la marca se lleva sus vinculos', async () => {
    const imprevisto = await registrar('ana@prueba.test', ana, 'Se deshace');
    const sesion = await comoEmpleado('ana@prueba.test');
    await sesion.rpc('marcar_no_pude', {
      la_funcion: cierre, el_periodo: mesDe(hoy()), la_razon: 'Razon', imprevistos: [imprevisto],
    });

    await sesion.from('marca').delete().eq('funcion_id', cierre).eq('periodo', mesDe(hoy()));

    const { data } = await comoServicio().from('intromision').select('id').eq('imprevisto_id', imprevisto);
    expect(data).toEqual([]);
  });

  it('en un flujo, un imprevisto de antes del ultimo "al dia" se rechaza', async () => {
    const viejo = await registrar('ana@prueba.test', ana, 'Antes de ponerme al dia');
    const sesion = await comoEmpleado('ana@prueba.test');
    await sesion.from('evento_flujo').insert({ funcion_id: caja, estado: 'al_dia' });

    const { error } = await sesion.rpc('atrasar_flujo', { la_funcion: caja, la_razon: 'Excusa', imprevistos: [viejo] });
    expect(error).not.toBeNull();

    const { data } = await sesion.from('evento_flujo').select('estado').eq('funcion_id', caja);
    expect(data?.map((e) => e.estado)).toEqual(['al_dia']);
  });

  it('en un flujo, uno pedido despues del ultimo "al dia" se acepta', async () => {
    const nuevo = await registrar('ana@prueba.test', ana, 'Despues de ponerme al dia');
    const sesion = await comoEmpleado('ana@prueba.test');

    const { error } = await sesion.rpc('atrasar_flujo', { la_funcion: caja, la_razon: 'Me atrase', imprevistos: [nuevo] });
    expect(error).toBeNull();
  });

  it('en un flujo, uno de otro empleado se rechaza', async () => {
    const deBenito = await registrar('benito@prueba.test', benito, 'Otro de Benito');
    const sesion = await comoEmpleado('ana@prueba.test');

    const { error } = await sesion.rpc('atrasar_flujo', { la_funcion: caja, la_razon: 'Ajeno', imprevistos: [deBenito] });
    expect(error).not.toBeNull();
  });

  it('Benito no ve las intromisiones de Ana (INV-2)', async () => {
    const sesion = await comoEmpleado('benito@prueba.test');
    const { data } = await sesion.from('intromision').select('id');
    expect(data).toEqual([]);
  });
});

// INV-19 · Registrar imprevistos deja identicos el plan, la meta y la parte
// prevista del cumplimiento ponderado; solo mueve la holgura (CEB-158). Se
// prueba por estructura: el plan, la meta y el
// cumplimiento se calculan solo de estas cuatro tablas. Si ninguna cambia,
// nada de lo que se calcula de ellas puede cambiar.
describe('INV-19: los imprevistos no tocan lo previsto', () => {
  it('registrar, marcar, rechazar y borrar imprevistos no cambia nada de lo previsto', async () => {
    const sesion = await comoEmpleado('ana@prueba.test');
    const foto = async () =>
      Promise.all(
        ['funcion', 'marca', 'titularidad', 'evento_flujo'].map(async (t) => (await sesion.from(t).select('*').order('id')).data),
      );

    const antes = await foto();

    const uno = await registrar('ana@prueba.test', ana, 'Uno');
    const dos = await registrar('ana@prueba.test', ana, 'Dos');
    const tres = await registrar('ana@prueba.test', ana, 'Tres');
    const cuatro = await registrar('ana@prueba.test', ana, 'Cuatro');
    await sesion.rpc('marcar_imprevisto', { el_imprevisto: uno, el_resultado: 'hecho', la_razon: null });
    await sesion.rpc('marcar_imprevisto', { el_imprevisto: dos, el_resultado: 'no_pude', la_razon: 'No alcanzo' });
    await sesion.rpc('marcar_imprevisto', { el_imprevisto: tres, el_resultado: 'no_lo_tome', la_razon: 'El cierre primero' });
    await sesion.rpc('borrar_imprevisto', { el_imprevisto: cuatro });

    expect(await foto()).toEqual(antes);
  });
});

// INV-22 · La ponderacion desplazada nunca llega al empleado. Como INV-3: no se
// guarda en ninguna parte, se calcula en el servidor solo para el
// administrador; y el empleado no puede leer lo de nadie mas para calcularla.
describe('INV-22: la ponderacion desplazada no existe para el empleado', () => {
  it('ninguna tabla que el empleado lee guarda una ponderacion desplazada', async () => {
    const servicio = comoServicio();
    for (const tabla of ['imprevisto', 'intromision']) {
      const { data } = await servicio.from(tabla).select('*').limit(1);
      const columnas = Object.keys(data?.[0] ?? {});
      expect(columnas.some((c) => /desplazad|ponderacion|cumplimiento/i.test(c))).toBe(false);
    }
  });

  it.todo('el HTML de /mes y de / no contiene la ponderación desplazada; el de /admin/reporte sí');
});
