import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// Las notificaciones de comentarios (CEB-267, CEB-268). SARA supervisa a ANA;
// SOFIA supervisa a BRUNO; la jefa es administradora. Lo que se prueba es que la
// base decide a quien avisa, quien las lee y cuando dejan de estar pendientes.

const hoy = () => new Date().toISOString().slice(0, 10);
const mes = () => hoy().slice(0, 7);

let ana: string, bruno: string, sara: string, sofia: string;
let jefa: SupabaseClient, sAna: SupabaseClient, sBruno: SupabaseClient, sSara: SupabaseClient, sSofia: SupabaseClient;
const uid = async (s: SupabaseClient) => (await s.auth.getUser()).data.user!.id;

const comentar = (s: SupabaseClient, tarea: Record<string, string>, texto = 'un comentario') =>
  s.from('comentario').insert({ ...tarea, texto });

type Fila = { tipo: string; cantidad: number; texto: string; vista_en: string | null };
const todas = async (s: SupabaseClient) => ((await s.rpc('mis_notificaciones')).data ?? []) as Fila[];
const avisos = async (s: SupabaseClient) => (await todas(s)).filter((a) => a.vista_en === null);
const ver = (s: SupabaseClient, t: Record<string, string>) =>
  s.rpc('ver_tarea', { la_funcion: t.funcion_id ?? null, el_periodo: t.periodo ?? null, el_imprevisto: t.imprevisto_id ?? null });

beforeAll(async () => {
  await vaciar();
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  bruno = await sembrarEmpleado('BRUNO', 'bruno@prueba.test');
  sara = await sembrarEmpleado('SARA', 'sara@prueba.test');
  sofia = await sembrarEmpleado('SOFIA', 'sofia@prueba.test');

  jefa = await comoAdministrador('jefa@prueba.test');
  sAna = await comoEmpleado('ana@prueba.test');
  sBruno = await comoEmpleado('bruno@prueba.test');
  sSara = await comoEmpleado('sara@prueba.test');
  sSofia = await comoEmpleado('sofia@prueba.test');

  for (const [e, s] of [[ana, sara], [bruno, sofia]]) {
    const { error } = await jefa.rpc('asignar_supervisor', { el_empleado: e, el_supervisor: s });
    if (error) throw error;
  }
});

const nueva = async (texto: string) => {
  const f = await sembrarFuncion(ana, {
    hash_identidad: `h-${texto}`,
    texto,
    importancia: 5,
    periodicidad: 'mensual',
    tipo_generado: 'entregable',
    fecha_alta: '2026-01-01',
  });
  return { funcion_id: f, periodo: mes() };
};

describe('INV-63: un comentario avisa al titular, a su supervisor y a quien pidio el imprevisto', () => {
  it('ANA comenta: avisa a SARA, no a ANA, ni a BRUNO, ni a la administradora', async () => {
    const tarea = await nueva('Cierre de Ana');
    expect((await comentar(sAna, tarea)).error).toBeNull();

    expect((await avisos(sSara)).map((a) => a.texto)).toEqual(['Cierre de Ana']);
    expect(await avisos(sAna)).toEqual([]);
    expect(await avisos(sBruno)).toEqual([]);
    expect(await avisos(jefa)).toEqual([]);
  });

  it('SARA comenta: avisa a ANA, la titular', async () => {
    const tarea = await nueva('Informe de Ana');
    expect((await comentar(sSara, tarea)).error).toBeNull();
    expect((await avisos(sAna)).map((a) => a.texto)).toContain('Informe de Ana');
  });

  it('un comentario de la administradora avisa a la titular y a su supervisora', async () => {
    const tarea = await nueva('Presupuesto de Ana');
    expect((await comentar(jefa, tarea)).error).toBeNull();
    expect((await avisos(sAna)).map((a) => a.texto)).toContain('Presupuesto de Ana');
    expect((await avisos(sSara)).map((a) => a.texto)).toContain('Presupuesto de Ana');
  });

  it('un imprevisto pedido por SOFIA: ANA y SARA avisan a SOFIA, y SOFIA avisa a ANA y a SARA', async () => {
    const { data: imp, error } = await comoServicio()
      .from('imprevisto')
      .insert({ empleado_id: ana, texto: 'Pedido de Sofia', vence: hoy(), pedido_por: await uid(sSofia), registrado_por: await uid(sSofia) })
      .select('id')
      .single();
    if (error) throw error;
    const tarea = { imprevisto_id: imp.id };

    expect((await comentar(sAna, tarea)).error).toBeNull();
    expect((await avisos(sSofia)).map((a) => a.texto)).toContain('Pedido de Sofia');

    expect((await comentar(sSofia, tarea)).error).toBeNull();
    expect((await avisos(sSara)).map((a) => a.texto)).toContain('Pedido de Sofia');
    expect((await avisos(sAna)).map((a) => a.texto)).toContain('Pedido de Sofia');
  });
});

describe('un flujo avisa como cualquier tarea, y su aviso no se cierra con una marca', () => {
  it('SARA comenta el flujo de ANA: avisa a ANA; al abrirlo, se ve', async () => {
    const f = await sembrarFuncion(ana, {
      hash_identidad: 'h-flujo',
      texto: 'Atender solicitudes',
      importancia: 5,
      periodicidad: 'diaria',
      tipo_generado: 'flujo',
      fecha_alta: '2026-01-01',
    });
    const hilo = { funcion_id: f, periodo: 'flujo' };
    expect((await comentar(sSara, hilo)).error).toBeNull();
    expect((await avisos(sAna)).map((a) => a.texto)).toContain('Atender solicitudes');

    expect((await ver(sAna, hilo)).error).toBeNull();
    expect((await avisos(sAna)).map((a) => a.texto)).not.toContain('Atender solicitudes');
  });
});

describe('INV-62: cada quien lee solo sus avisos y nadie escribe con su token', () => {
  it('ANA no lee los de SARA ni con una consulta sin filtro', async () => {
    const tarea = await nueva('Aislamiento');
    await comentar(sAna, tarea);

    const duenos = async (s: SupabaseClient) => ((await s.from('notificacion').select('usuario')).data ?? []).map((n) => n.usuario);
    expect(new Set(await duenos(sSara))).toEqual(new Set([await uid(sSara)]));
    expect(new Set(await duenos(sAna))).toEqual(new Set([await uid(sAna)]));
    expect(await duenos(sBruno)).toEqual([]);
  });

  it('nadie inserta, edita ni borra con su token', async () => {
    const mia = { usuario: await uid(sAna), tipo: 'comentario', ...(await nueva('Falsa')) };
    expect((await sAna.from('notificacion').insert(mia)).error).not.toBeNull();
    expect((await sSara.from('notificacion').update({ vista_en: new Date().toISOString() }).not('id', 'is', null)).error).not.toBeNull();
    expect((await sSara.from('notificacion').delete().not('id', 'is', null)).error).not.toBeNull();
  });
});

describe('INV-65: abrir la tarea o marcarla deja el aviso sin pendiente', () => {
  it('abrir la tarea ve su aviso; las demas se quedan', async () => {
    const a = await nueva('Abierta A');
    const b = await nueva('Abierta B');
    await comentar(sAna, a);
    await comentar(sAna, b);

    expect((await ver(sSara, a)).error).toBeNull();
    const pendientes = (await avisos(sSara)).map((x) => x.texto);
    expect(pendientes).not.toContain('Abierta A');
    expect(pendientes).toContain('Abierta B');
  });

  it('una tarea marcada no deja aviso, y deshacer la marca lo devuelve', async () => {
    const tarea = await nueva('Marcada');
    await comentar(sSara, tarea);
    expect((await avisos(sAna)).map((x) => x.texto)).toContain('Marcada');

    expect((await sAna.from('marca').insert({ ...tarea, resultado: 'hecho' })).error).toBeNull();
    expect((await avisos(sAna)).map((x) => x.texto)).not.toContain('Marcada');

    await sAna.from('marca').delete().eq('funcion_id', tarea.funcion_id).eq('periodo', tarea.periodo);
    expect((await avisos(sAna)).map((x) => x.texto)).toContain('Marcada');
  });

  it('un comentario sin ver de la misma tarea sube la cantidad, y tras verla crea otro', async () => {
    const tarea = await nueva('Charla');
    for (const t of ['uno', 'dos', 'tres']) await comentar(sAna, tarea, t);
    const antes = (await avisos(sSara)).filter((x) => x.texto === 'Charla');
    expect(antes.map((x) => x.cantidad)).toEqual([3]);

    await ver(sSara, tarea);
    await comentar(sAna, tarea, 'cuatro');
    expect((await avisos(sSara)).filter((x) => x.texto === 'Charla').map((x) => x.cantidad)).toEqual([1]);
  });
});

describe('CEB-269: la lista de la campanita', () => {
  it('marcar todas marca solo las mias, y abrir la lista no marca nada', async () => {
    const tarea = await nueva('Para marcar todas');
    await comentar(sAna, tarea);
    await comentar(sSara, tarea);
    expect((await avisos(sSara)).length).toBeGreaterThan(0);
    expect((await avisos(sAna)).length).toBeGreaterThan(0);

    expect((await sSara.rpc('marcar_notificaciones_vistas')).error).toBeNull();
    expect(await avisos(sSara)).toEqual([]);
    expect((await avisos(sAna)).length).toBeGreaterThan(0);
  });

  it('las vistas se ocultan a los 30 dias; las sin ver se quedan', async () => {
    const servicio = comoServicio();
    const tarea = await nueva('Vieja');
    await comentar(sAna, tarea);
    await sSara.rpc('marcar_notificaciones_vistas');
    expect((await todas(sSara)).some((a) => a.texto === 'Vieja' && a.vista_en)).toBe(true);

    const viejo = new Date(Date.now() - 31 * 86_400_000).toISOString();
    await servicio.from('notificacion').update({ vista_en: viejo }).eq('usuario', await uid(sSara));
    expect((await todas(sSara)).some((a) => a.texto === 'Vieja')).toBe(false);

    await comentar(sAna, tarea);
    expect((await avisos(sSara)).some((a) => a.texto === 'Vieja')).toBe(true);
  });
});

describe('CEB-270: imprevistos y delegaciones', () => {
  const imprevistoPara = async (quien: string, pedido_por: string | null) => {
    const { data, error } = await comoServicio()
      .from('imprevisto')
      .insert({ empleado_id: quien, texto: `Imprevisto ${Math.random()}`, vence: hoy(), pedido_por, ...(pedido_por ? {} : { pedido_por_otro: 'el cliente' }) , registrado_por: await uid(jefa) })
      .select('id, texto')
      .single();
    if (error) throw error;
    return data;
  };

  it('un imprevisto que te piden avisa a quien lo recibe, y solo a el', async () => {
    const imp = await imprevistoPara(ana, await uid(sSara));
    expect((await avisos(sAna)).filter((a) => a.tipo === 'imprevisto').map((a) => a.texto)).toContain(imp.texto);
    expect((await avisos(sSara)).map((a) => a.texto)).not.toContain(imp.texto);
    expect((await avisos(sBruno)).map((a) => a.texto)).not.toContain(imp.texto);
  });

  it('un imprevisto que anotas tu mismo no te avisa', async () => {
    const imp = await imprevistoPara(bruno, null);
    expect((await avisos(sBruno)).map((a) => a.texto)).not.toContain(imp.texto);
  });

  it('una delegacion avisa a quien la recibe; marcarla avisa a quien la dio; devolverla, a quien la tenia', async () => {
    const funcion = await sembrarFuncion(sara, {
      hash_identidad: 'h-delegable',
      texto: 'Delegable de Sara',
      importancia: 5,
      periodicidad: 'mensual',
      tipo_generado: 'entregable',
      fecha_alta: '2026-01-01',
    });
    const finDeMes = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    const { data: delegacion, error } = await sSara.rpc('delegar', { la_funcion: funcion, el_periodo: mes(), a_quien: ana, el_vence: finDeMes });
    if (error) throw error;

    expect((await avisos(sAna)).filter((a) => a.tipo === 'imprevisto').map((a) => a.texto)).toContain('Delegable de Sara');

    expect((await sAna.rpc('marcar_imprevisto', { el_imprevisto: delegacion, el_resultado: 'hecho', la_razon: null })).error).toBeNull();
    expect((await avisos(sSara)).filter((a) => a.tipo === 'delegacion_marcada').map((a) => a.texto)).toEqual(['Delegable de Sara']);
    expect((await avisos(sAna)).some((a) => a.tipo === 'imprevisto' && a.texto === 'Delegable de Sara')).toBe(false);

    expect((await sSara.rpc('devolver', { la_delegacion: delegacion, la_razon: 'esta incompleto' })).error).toBeNull();
    expect((await avisos(sAna)).filter((a) => a.tipo === 'delegacion_devuelta').map((a) => a.texto)).toEqual(['Delegable de Sara']);
    expect((await avisos(sBruno)).length).toBe(0);

    await ver(sSara, { imprevisto_id: delegacion });
    expect((await avisos(sSara)).some((a) => a.tipo === 'delegacion_marcada')).toBe(false);
  });
});
