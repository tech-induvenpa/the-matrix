import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sinLeer } from '@matriz/dominio';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// El perfil de la tarea y sus comentarios (CEB-198). Dos equipos y el
// administrador: SARA supervisa a ANA; SOFIA supervisa a BRUNO. Lo que se
// prueba es que la base decide quien lee y quien escribe, y cuando.

const hoy = () => new Date().toISOString().slice(0, 10);
const mes = () => hoy().slice(0, 7);
const mesPasado = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
};
const finDelMes = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
};

const entregable = (texto: string, tipo = 'entregable') => ({
  hash_identidad: `h-${texto}`,
  texto,
  importancia: 5,
  periodicidad: 'mensual',
  tipo_generado: tipo,
  fecha_alta: '2026-01-01',
});

let ana: string, bruno: string, sara: string, sofia: string;
let jefa: SupabaseClient, sAna: SupabaseClient, sBruno: SupabaseClient, sSara: SupabaseClient, sSofia: SupabaseClient;
const uid = async (s: SupabaseClient) => (await s.auth.getUser()).data.user!.id;

const comentar = (s: SupabaseClient, tarea: Record<string, string>, texto = 'un comentario') =>
  s.from('comentario').insert({ ...tarea, texto });

const textos = async (s: SupabaseClient, tarea: Record<string, string>) => {
  let q = s.from('comentario').select('texto').order('escrito_en');
  for (const [k, v] of Object.entries(tarea)) q = q.eq(k, v);
  return ((await q).data ?? []).map((c) => c.texto as string);
};

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

describe('INV-34: solo el circulo de hoy lee y escribe los comentarios de una tarea', () => {
  let deAna: Record<string, string>;
  let deSara: Record<string, string>;
  let pedidoPorSofia: Record<string, string>;
  let delegacion: Record<string, string>;
  let funcionDeAna: string;

  beforeAll(async () => {
    funcionDeAna = await sembrarFuncion(ana, entregable('Cierre de Ana'));
    deAna = { funcion_id: funcionDeAna, periodo: mes() };
    const funcionDeSara = await sembrarFuncion(sara, entregable('Cierre de Sara'));
    deSara = { funcion_id: funcionDeSara, periodo: mes() };

    const { data: imp, error } = await comoServicio()
      .from('imprevisto')
      .insert({ empleado_id: ana, texto: 'Pedido de Sofia', vence: hoy(), pedido_por: await uid(sSofia), registrado_por: await uid(sSofia) })
      .select('id')
      .single();
    if (error) throw error;
    pedidoPorSofia = { imprevisto_id: imp.id };

    const { data: del, error: sinDelegar } = await sSara.rpc('delegar', {
      la_funcion: funcionDeSara,
      el_periodo: mes(),
      a_quien: ana,
      el_vence: finDelMes(),
    });
    if (sinDelegar) throw sinDelegar;
    delegacion = { imprevisto_id: del as string };
  });

  it('una ocurrencia de un empleado: la leen el, su supervisora y el administrador; nadie mas', async () => {
    expect((await comentar(sAna, deAna, 'de ana')).error).toBeNull();
    expect((await comentar(sSara, deAna, 'de sara')).error).toBeNull();
    expect((await comentar(jefa, deAna, 'de la jefa')).error).toBeNull();

    for (const s of [sAna, sSara, jefa]) expect(await textos(s, deAna)).toEqual(['de ana', 'de sara', 'de la jefa']);
    for (const s of [sBruno, sSofia]) {
      expect(await textos(s, deAna)).toEqual([]);
      expect((await comentar(s, deAna)).error).not.toBeNull();
    }
  });

  it('un imprevisto pedido por la supervisora de otro equipo: ella lo lee y lo comenta', async () => {
    expect((await comentar(sSofia, pedidoPorSofia, 'de sofia')).error).toBeNull();
    for (const s of [sAna, sSara, sSofia, jefa]) expect(await textos(s, pedidoPorSofia)).toEqual(['de sofia']);
    expect(await textos(sBruno, pedidoPorSofia)).toEqual([]);
  });

  it('una ocurrencia de la supervisora: la leen ella y el administrador; su equipo no', async () => {
    expect((await comentar(sSara, deSara, 'de sara')).error).toBeNull();
    expect(await textos(sSara, deSara)).toEqual(['de sara']);
    expect(await textos(jefa, deSara)).toEqual(['de sara']);
    expect(await textos(sAna, deSara)).toEqual([]);
    expect((await comentar(sAna, deSara)).error).not.toBeNull();
  });

  it('una delegacion: la leen quien la recibe, quien la pidio y el administrador; la ocurrencia sigue aparte', async () => {
    expect((await comentar(sAna, delegacion, 'la empiezo')).error).toBeNull();
    expect((await comentar(sSara, delegacion, 'gracias')).error).toBeNull();
    for (const s of [sAna, sSara, jefa]) expect(await textos(s, delegacion)).toEqual(['la empiezo', 'gracias']);
    expect(await textos(sBruno, delegacion)).toEqual([]);
    expect(await textos(sAna, deSara)).toEqual([]);
  });

  it('tras el traspaso, el circulo nuevo lee lo anterior y el viejo deja de leerlo', async () => {
    const servicio = comoServicio();
    await servicio.from('titularidad').update({ hasta: hoy() }).eq('funcion_id', funcionDeAna).is('hasta', null);
    const { error } = await servicio
      .from('titularidad')
      .insert({ funcion_id: funcionDeAna, empleado_id: bruno, ponderacion: 10, publicado_en: new Date().toISOString() });
    if (error) throw error;

    for (const s of [sBruno, sSofia, jefa]) expect(await textos(s, deAna)).toEqual(['de ana', 'de sara', 'de la jefa']);
    for (const s of [sAna, sSara]) {
      expect(await textos(s, deAna)).toEqual([]);
      expect((await comentar(s, deAna)).error).not.toBeNull();
    }
  });
});

describe('INV-35: una tarea marcada no admite comentarios; deshacer la marca los vuelve a admitir', () => {
  let ocurrencia: Record<string, string>;
  let imprevisto: Record<string, string>;

  beforeAll(async () => {
    ocurrencia = { funcion_id: await sembrarFuncion(ana, entregable('Conciliacion')), periodo: mes() };
    const { data, error } = await sAna
      .from('imprevisto')
      .insert({ empleado_id: ana, texto: 'Lo pidio un cliente', vence: hoy(), pedido_por_otro: 'un cliente' })
      .select('id')
      .single();
    if (error) throw error;
    imprevisto = { imprevisto_id: data.id };
  });

  it('abiertas, se comentan', async () => {
    expect((await comentar(sAna, ocurrencia)).error).toBeNull();
    expect((await comentar(sAna, imprevisto)).error).toBeNull();
  });

  it('marcadas, ni el titular ni el administrador comentan', async () => {
    expect((await sAna.from('marca').insert({ ...ocurrencia, resultado: 'hecho' })).error).toBeNull();
    expect((await sAna.rpc('marcar_imprevisto', { el_imprevisto: imprevisto.imprevisto_id, el_resultado: 'hecho', la_razon: null })).error).toBeNull();

    for (const s of [sAna, jefa]) {
      expect((await comentar(s, ocurrencia)).error).not.toBeNull();
      expect((await comentar(s, imprevisto)).error).not.toBeNull();
    }
  });

  it('deshacer la marca de la ocurrencia la reabre', async () => {
    await sAna.from('marca').delete().eq('funcion_id', ocurrencia.funcion_id).eq('periodo', ocurrencia.periodo);
    expect((await comentar(sAna, ocurrencia)).error).toBeNull();
  });

  it('una ocurrencia vencida sin marca se sigue comentando; un flujo nunca', async () => {
    expect((await comentar(sAna, { ...ocurrencia, periodo: mesPasado() })).error).toBeNull();
    const flujo = await sembrarFuncion(ana, entregable('Archivo', 'flujo'));
    expect((await comentar(sAna, { funcion_id: flujo, periodo: mes() })).error).not.toBeNull();
  });
});

describe('INV-36: un comentario nunca cambia ni desaparece, y su fecha la pone la base', () => {
  let ocurrencia: Record<string, string>;
  let id: string;

  beforeAll(async () => {
    ocurrencia = { funcion_id: await sembrarFuncion(ana, entregable('Nomina')), periodo: mes() };
    const { data, error } = await comentar(sAna, ocurrencia, 'original').select('id').single();
    if (error) throw error;
    id = data.id;
  });

  it('ni el autor ni el administrador lo editan ni lo borran', async () => {
    const { data: antes } = await comoServicio().from('comentario').select('*').eq('id', id).single();
    for (const s of [sAna, jefa]) {
      await s.from('comentario').update({ texto: 'cambiado' }).eq('id', id);
      await s.from('comentario').update({ autor: await uid(sSara) }).eq('id', id);
      await s.from('comentario').update({ escrito_en: '2020-01-01T00:00:00Z' }).eq('id', id);
      await s.from('comentario').delete().eq('id', id);
    }
    const { data: despues } = await comoServicio().from('comentario').select('*').eq('id', id).single();
    expect(despues).toEqual(antes);
  });

  it('una fecha o un autor inventados no quedan', async () => {
    await sAna.from('comentario').insert({ ...ocurrencia, texto: 'con fecha', escrito_en: '2020-01-01T00:00:00Z' });
    await sAna.from('comentario').insert({ ...ocurrencia, texto: 'con autor', autor: await uid(sSara) });
    const { data } = await comoServicio().from('comentario').select('texto, autor, escrito_en').eq('funcion_id', ocurrencia.funcion_id);
    const yo = await uid(sAna);
    for (const c of data ?? []) {
      expect(c.autor).toBe(yo);
      expect(String(c.escrito_en).slice(0, 10)).toBe(hoy());
    }
  });
});

describe('INV-37: sin leer se enciende con el comentario de otro y se apaga al abrir el perfil', () => {
  let ocurrencia: { funcion_id: string; periodo: string };

  // Lo que la pantalla calcula para quien tiene la sesion, con lo que la base le da.
  const sinLeerPara = async (s: SupabaseClient) => {
    const { data: comentarios } = await s.rpc('comentarios_visibles');
    const suyos = ((comentarios ?? []) as { funcion_id: string; periodo: string; autor: string; escrito_en: string; empleado_id: string; abierta: boolean }[])
      .filter((c) => c.funcion_id === ocurrencia.funcion_id && c.periodo === ocurrencia.periodo);
    const { data: visto } = await s
      .from('comentario_visto')
      .select('visto_en')
      .eq('funcion_id', ocurrencia.funcion_id)
      .eq('periodo', ocurrencia.periodo)
      .maybeSingle();
    expect(suyos.every((c) => c.empleado_id === ana)).toBe(true);
    return sinLeer(
      suyos.map((c) => ({ autor: c.autor, escritoEn: c.escrito_en })),
      (visto?.visto_en as string | undefined) ?? null,
      await uid(s),
      suyos.some((c) => !c.abierta),
    );
  };

  beforeAll(async () => {
    ocurrencia = { funcion_id: await sembrarFuncion(ana, entregable('Facturas')), periodo: mes() };
  });

  it('el comentario de la supervisora: sin leer para ana y para el administrador, no para ella', async () => {
    expect((await comentar(sSara, ocurrencia, 'ojo con la firma')).error).toBeNull();
    expect(await sinLeerPara(sAna)).toBe(true);
    expect(await sinLeerPara(jefa)).toBe(true);
    expect(await sinLeerPara(sSara)).toBe(false);
  });

  it('ana abre el perfil: para ella se apaga, para el administrador no', async () => {
    expect((await sAna.rpc('ver_tarea', { la_funcion: ocurrencia.funcion_id, el_periodo: ocurrencia.periodo, el_imprevisto: null })).error).toBeNull();
    expect(await sinLeerPara(sAna)).toBe(false);
    expect(await sinLeerPara(jefa)).toBe(true);
  });

  it('lo que ana escribe no le enciende nada a ella', async () => {
    expect((await comentar(sAna, ocurrencia, 'ya la tengo')).error).toBeNull();
    expect(await sinLeerPara(sAna)).toBe(false);
  });

  it('marcada, no queda nada sin leer para nadie', async () => {
    expect((await sAna.from('marca').insert({ ...ocurrencia, resultado: 'hecho' })).error).toBeNull();
    expect(await sinLeerPara(jefa)).toBe(false);
  });

  it('nadie registra que vio una tarea fuera de su circulo', async () => {
    const { error } = await sBruno.rpc('ver_tarea', { la_funcion: ocurrencia.funcion_id, el_periodo: ocurrencia.periodo, el_imprevisto: null });
    expect(error).not.toBeNull();
  });
});

describe('la lista por persona y lo que pedi', () => {
  it('las tareas de ana: para su supervisora y el administrador, sin ponderacion; para otra supervisora, nada', async () => {
    const { data } = await sSara.rpc('tareas_de', { el_empleado: ana });
    expect(data.funciones.length).toBeGreaterThan(0);
    expect(JSON.stringify(data)).not.toMatch(/ponderacion/);
    expect((await jefa.rpc('tareas_de', { el_empleado: ana })).data.funciones).toEqual(data.funciones);
    expect((await sSofia.rpc('tareas_de', { el_empleado: ana })).data).toBeNull();
    expect((await sBruno.rpc('tareas_de', { el_empleado: ana })).data).toBeNull();
  });

  it('sofia ve lo que le pidio a ana, que no es de su equipo; sara no lo ve ahi porque ana es suya', async () => {
    const { data } = await sSofia.rpc('lo_que_pedi');
    expect(data.map((i: { texto: string; nombre: string }) => [i.texto, i.nombre])).toEqual([['Pedido de Sofia', 'ANA']]);
    expect((await sSara.rpc('lo_que_pedi')).data).toEqual([]);
  });
});

// QA de CEB-198: los criterios de CEB-200 a CEB-203 que las pruebas de arriba
// no tocaban.
describe('QA CEB-198: criterios sin cubrir', () => {
  let ocurrencia: { funcion_id: string; periodo: string };
  let pedido: string;

  beforeAll(async () => {
    ocurrencia = { funcion_id: await sembrarFuncion(ana, entregable('Arqueo')), periodo: mes() };
    const { data, error } = await comoServicio()
      .from('imprevisto')
      .insert({ empleado_id: ana, texto: 'Otro pedido de Sofia', vence: hoy(), pedido_por: await uid(sSofia), registrado_por: await uid(sSofia) })
      .select('id')
      .single();
    if (error) throw error;
    pedido = data.id;
  });

  it('CEB-200: un comentario se ancla a una sola tarea, ni a dos ni a ninguna', async () => {
    expect((await comentar(sAna, { ...ocurrencia, imprevisto_id: pedido })).error).not.toBeNull();
    expect((await sAna.from('comentario').insert({ texto: 'sin tarea' })).error).not.toBeNull();
    expect((await comentar(jefa, { funcion_id: ocurrencia.funcion_id })).error).not.toBeNull();
  });

  it('CEB-200: un imprevisto borrado no admite comentarios', async () => {
    const { data } = await sAna
      .from('imprevisto')
      .insert({ empleado_id: ana, texto: 'Anotado por error', vence: hoy(), pedido_por_otro: 'nadie' })
      .select('id')
      .single();
    expect((await sAna.rpc('borrar_imprevisto', { el_imprevisto: data!.id })).error).toBeNull();
    expect((await comentar(sAna, { imprevisto_id: data!.id })).error).not.toBeNull();
    expect((await comentar(jefa, { imprevisto_id: data!.id })).error).not.toBeNull();
  });

  it('CEB-202: nadie lee ni escribe la vista de otro', async () => {
    await sAna.rpc('ver_tarea', { la_funcion: ocurrencia.funcion_id, el_periodo: ocurrencia.periodo, el_imprevisto: null });
    const deAna = await comoServicio().from('comentario_visto').select('usuario').eq('funcion_id', ocurrencia.funcion_id);
    expect(deAna.data).toHaveLength(1);
    for (const s of [sSara, jefa]) {
      expect((await s.from('comentario_visto').select('usuario').eq('funcion_id', ocurrencia.funcion_id)).data).toEqual([]);
      expect((await s.from('comentario_visto').insert({ usuario: await uid(sAna), ...ocurrencia })).error).not.toBeNull();
      await s.from('comentario_visto').update({ visto_en: '2020-01-01T00:00:00Z' }).eq('funcion_id', ocurrencia.funcion_id);
      await s.from('comentario_visto').delete().eq('funcion_id', ocurrencia.funcion_id);
    }
    expect((await comoServicio().from('comentario_visto').select('usuario, visto_en').eq('funcion_id', ocurrencia.funcion_id)).data)
      .toEqual(deAna.data!.map((v) => ({ ...v, visto_en: expect.not.stringMatching(/^2020/) })));
  });

  it('CEB-201: el administrador ve la lista de un supervisor', async () => {
    const { data } = await jefa.rpc('tareas_de', { el_empleado: sara });
    expect(data.funciones.map((f: { texto: string }) => f.texto)).toContain('Cierre de Sara');
  });

  it('CEB-201 y CEB-203: al quitarle a ana, sara deja de ver sus tareas, y su delegacion no se cuela en "lo que pedi"', async () => {
    await jefa.rpc('asignar_supervisor', { el_empleado: ana, el_supervisor: null });
    try {
      expect((await sSara.rpc('tareas_de', { el_empleado: ana })).data).toBeNull();
      expect((await sSara.rpc('lo_que_pedi')).data).toEqual([]);
    } finally {
      await jefa.rpc('asignar_supervisor', { el_empleado: ana, el_supervisor: sara });
    }
    expect((await sSara.rpc('tareas_de', { el_empleado: ana })).data).not.toBeNull();
  });

  it('CEB-203: cuando ana le comenta, se le enciende a sofia; cuando lo marca, sale de "lo que pedi"', async () => {
    expect((await comentar(sAna, { imprevisto_id: pedido }, 'ya voy')).error).toBeNull();
    const { data: comentarios } = await sSofia.rpc('comentarios_visibles');
    const suyos = (comentarios as { imprevisto_id: string; autor: string; escrito_en: string; abierta: boolean }[]).filter(
      (c) => c.imprevisto_id === pedido,
    );
    expect(sinLeer(suyos.map((c) => ({ autor: c.autor, escritoEn: c.escrito_en })), null, await uid(sSofia), !suyos[0]!.abierta)).toBe(true);

    const antes = ((await sSofia.rpc('lo_que_pedi')).data as { id: string }[]).map((i) => i.id);
    expect(antes).toContain(pedido);
    expect((await sAna.rpc('marcar_imprevisto', { el_imprevisto: pedido, el_resultado: 'hecho', la_razon: null })).error).toBeNull();
    expect(((await sSofia.rpc('lo_que_pedi')).data as { id: string }[]).map((i) => i.id)).not.toContain(pedido);
  });
});
