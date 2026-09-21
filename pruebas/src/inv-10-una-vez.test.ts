import { beforeAll, describe, expect, it } from 'vitest';
import { Calendario, ocurrenciasEntre, pendientes, seleccionarPlan, unaPorFuncion } from '@matriz/dominio';
import { comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-10 · Una funcion nunca aparece dos veces en el plan, y marcarla libera su
// lugar. Se prueba con las ocurrencias calculadas sobre datos reales de la
// base, no sobre un objeto inventado en memoria.
const HOY = '2026-09-16';

describe('INV-10: una funcion aporta una sola fila, y marcarla libera su lugar', () => {
  let funcionId: string;
  let calendario: Calendario;

  beforeAll(async () => {
    await vaciar();
    const servicio = comoServicio();
    const empleadoId = await sembrarEmpleado('ANA', 'ana@prueba.test');

    funcionId = await sembrarFuncion(empleadoId, {
      hash_identidad: 'diaria-1',
      texto: 'Cuentas por pagar',
      ponderacion: 10,
      importancia: 7,
      periodicidad: 'diaria',
      tipo_generado: 'entregable',
      fecha_alta: '2026-08-01',
    });

    const { data: noHabiles } = await servicio.from('dia_no_habil').select('desde, hasta');
    calendario = Calendario.con(noHabiles ?? []);
  });

  const planDe = async () => {
    const servicio = comoServicio();
    const { data: funciones } = await servicio.from('funcion').select('*');
    const { data: marcas } = await servicio.from('marca').select('funcion_id, periodo');

    const ocurrencias = (funciones ?? []).flatMap((f) =>
      ocurrenciasEntre(
        { periodicidad: f.periodicidad, diaTope: f.dia_tope_generado ?? undefined, fechaAlta: f.fecha_alta },
        calendario,
        HOY,
        '2026-12-31',
      ).map((o) => ({ ...o, funcionId: f.id, importancia: f.importancia, periodicidad: f.periodicidad })),
    );

    const abiertas = pendientes(ocurrencias, (marcas ?? []).map((m) => ({ funcionId: m.funcion_id, periodo: m.periodo })));
    return seleccionarPlan(unaPorFuncion(abiertas), 5);
  };

  it('una funcion diaria, que vence todos los dias, aporta una sola fila', async () => {
    const plan = await planDe();

    expect(plan.filter((o) => o.funcionId === funcionId)).toHaveLength(1);
  });

  it('al marcarla, su lugar queda libre y la siguiente ocurrencia no se adelanta al mismo dia', async () => {
    const antes = await planDe();
    const periodo = antes.find((o) => o.funcionId === funcionId)!.periodo;

    const { error } = await comoServicio().from('marca').insert({ funcion_id: funcionId, periodo, resultado: 'hecho' });
    if (error) throw error;

    const despues = await planDe();
    const suya = despues.filter((o) => o.funcionId === funcionId);

    expect(suya).toHaveLength(1);
    expect(suya[0]!.periodo).not.toBe(periodo);
  });

  it('marcar dos veces el mismo periodo no crea dos marcas', async () => {
    const servicio = comoServicio();
    const { error } = await servicio.from('marca').insert({ funcion_id: funcionId, periodo: '2026-09-16', resultado: 'hecho' });

    // La base lo impide: (funcion, periodo) es unico.
    const { count } = await servicio
      .from('marca')
      .select('*', { count: 'exact', head: true })
      .eq('funcion_id', funcionId)
      .eq('periodo', '2026-09-16');

    expect(error === null || count === 1).toBe(true);
    expect(count).toBeLessThanOrEqual(1);
  });
});
