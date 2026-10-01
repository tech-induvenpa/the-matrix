import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-48 · Todo imprevisto tiene una importancia de 0 a 9, la escribe quien lo
// anota o la hereda de la funcion que delega, y nunca cambia (CEB-240). Con
// sesiones reales de empleada, supervisora y administradora, contra la base de
// verdad; la accion "Nueva tarea", la lectura de la supervisora, la lista de
// tareas, la nomina y la descarga pasan por el cableado de la web. Solo se
// sustituyen las cookies de Next.
const next = await vi.hoisted(async () => {
  const { createRequire } = await import('node:module');
  const web = createRequire(new URL('../../apps/web/package.json', import.meta.url));
  return { sesion: null as SupabaseClient | null, cache: web.resolve('next/cache'), servidor: web.resolve('next/server') };
});
vi.mock('@/lib/supabase/servidor', () => ({ clienteDelServidor: async () => next.sesion }));
vi.mock('@/lib/razones', () => ({ proyectarRazones: async () => {} }));
vi.mock(next.cache, () => ({ revalidatePath: () => {} }));

const { registrarImprevisto } = await import('../../apps/web/src/app/acciones');
const { loDeMiGente } = await import('../../apps/web/src/lib/supervisor');
const { tareasAbiertasDe } = await import('../../apps/web/src/lib/tareas');
const { nominaDelMes } = await import('../../apps/web/src/lib/nomina');
const { GET: descargar } = await import('../../apps/web/src/app/admin/descarga/route');
const { NextRequest } = (await import(next.servidor)) as typeof import('next/server');
const { Calendario, ocurrenciasEntre } = await import('@matriz/dominio');

const hoy = new Date().toISOString().slice(0, 10);
// El mes del reloj de las pruebas: abierto, a mitad de mes (ADR 0017).
const mes = new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 7);

const funcion = (texto: string, extra: Record<string, unknown> = {}) => ({
  hash_identidad: `h-${texto}`,
  texto,
  importancia: 5,
  periodicidad: 'mensual',
  tipo_generado: 'entregable',
  fecha_alta: '2026-01-01',
  ...extra,
});

let ana: string;
let bea: string;
let informe: string;
let sesionAna: SupabaseClient;
let sesionSara: SupabaseClient;
let jefa: SupabaseClient;

const importanciaDe = async (texto: string) => {
  const { data, error } = await comoServicio().from('imprevisto').select('importancia').eq('texto', texto).single();
  if (error) throw error;
  return data.importancia as number;
};

beforeAll(async () => {
  await vaciar();
  const servicio = comoServicio();
  const sara = await sembrarEmpleado('SARA', 'sara@prueba.test');
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  bea = await sembrarEmpleado('BEA', 'bea@prueba.test');
  await servicio.from('empleado').update({ supervisor_id: sara }).in('id', [ana, bea]);
  await sembrarFuncion(ana, { ...funcion('Cierre'), ponderacion: 30 });
  informe = await sembrarFuncion(sara, { ...funcion('Informe al directorio', { importancia: 8 }), ponderacion: 20 });
  await servicio.from('bono').insert({ empleado_id: ana, monto: 500, rige_desde: '2026-01-01' });

  jefa = await comoAdministrador('jefa@prueba.test');
  sesionAna = await comoEmpleado('ana@prueba.test');
  sesionSara = await comoEmpleado('sara@prueba.test');
  await comoEmpleado('bea@prueba.test');
});

describe('INV-48: la escribe quien lo anota, de 0 a 9', () => {
  const anotar = (sesion: SupabaseClient, texto: string, importancia?: number) =>
    sesion.from('imprevisto').insert({
      empleado_id: ana,
      texto,
      vence: hoy,
      pedido_por_otro: 'el banco',
      ...(importancia !== undefined && { importancia }),
    });

  it('empleada, supervisora y administradora: con 7 queda en 7, sin importancia queda en 5', async () => {
    for (const [quien, sesion] of [
      ['ana', sesionAna],
      ['sara', sesionSara],
      ['jefa', jefa],
    ] as const) {
      expect((await anotar(sesion, `Siete de ${quien}`, 7)).error).toBeNull();
      expect((await anotar(sesion, `Sin elegir de ${quien}`)).error).toBeNull();
      expect(await importanciaDe(`Siete de ${quien}`)).toBe(7);
      expect(await importanciaDe(`Sin elegir de ${quien}`)).toBe(5);
    }
  });

  it('con 10 o -1, la base lo rechaza, venga de quien venga', async () => {
    for (const sesion of [sesionAna, sesionSara, jefa]) {
      for (const importancia of [10, -1]) {
        const { error } = await anotar(sesion, `Fuera de rango ${importancia}`, importancia);
        expect(error?.code).toBe('23514');
      }
    }
    const { count } = await comoServicio().from('imprevisto').select('id', { count: 'exact', head: true }).like('texto', 'Fuera de rango%');
    expect(count).toBe(0);
  });

  it('"Nueva tarea" guarda lo elegido, y 5 si no llega un entero de 0 a 9', async () => {
    next.sesion = sesionAna;
    for (const [texto, elegida] of [
      ['Accion con cero', '0'],
      ['Accion con nueve', '9'],
      ['Accion con doce', '12'],
      ['Accion con menos uno', '-1'],
      ['Accion con medio', '4.5'],
      ['Accion sin importancia', null],
    ] as const) {
      const formulario = new FormData();
      formulario.set('texto', texto);
      formulario.set('urgencia', '8');
      formulario.set('pidio', 'otro');
      formulario.set('otro', 'Un cliente');
      if (elegida !== null) formulario.set('importancia', elegida);
      await registrarImprevisto(ana, formulario);
    }
    expect(await importanciaDe('Accion con cero')).toBe(0);
    expect(await importanciaDe('Accion con nueve')).toBe(9);
    expect(await importanciaDe('Accion con doce')).toBe(5);
    expect(await importanciaDe('Accion con menos uno')).toBe(5);
    expect(await importanciaDe('Accion con medio')).toBe(5);
    expect(await importanciaDe('Accion sin importancia')).toBe(5);
  });
});

describe('INV-48: una delegacion la hereda de la funcion, el dia en que se delega', () => {
  let delegacion: string;

  beforeAll(async () => {
    // La proxima ocurrencia del informe de Sara que aun no vence.
    const { data: dias } = await comoServicio().from('dia_no_habil').select('desde, hasta');
    const [o] = ocurrenciasEntre({ periodicidad: 'mensual', fechaAlta: '2026-01-01' }, Calendario.con(dias ?? []), hoy, `${+hoy.slice(0, 4) + 1}${hoy.slice(4)}`).filter(
      (x) => x.vence >= hoy,
    );
    const { data, error } = await sesionSara.rpc('delegar', { la_funcion: informe, el_periodo: o!.periodo, a_quien: ana, el_vence: o!.vence });
    if (error) throw error;
    delegacion = data as string;
  });

  it('delegar una ocurrencia de una funcion de importancia 8 crea un imprevisto de 8', async () => {
    const { data } = await sesionAna.from('imprevisto').select('importancia, delega_funcion').eq('id', delegacion).single();
    expect(data).toEqual({ importancia: 8, delega_funcion: informe });
  });

  it('la administradora cambia la funcion a 3: la delegacion sigue en 8', async () => {
    const { error } = await jefa.from('funcion').update({ importancia: 3 }).eq('id', informe);
    expect(error).toBeNull();
    const { data: f } = await comoServicio().from('funcion').select('importancia').eq('id', informe).single();
    expect(f!.importancia).toBe(3);

    const { data } = await comoServicio().from('imprevisto').select('importancia').eq('id', delegacion).single();
    expect(data!.importancia).toBe(8);
  });

  it('devolverla a otra persona es una delegacion nueva, con la importancia de hoy', async () => {
    expect((await sesionAna.rpc('marcar_imprevisto', { el_imprevisto: delegacion, el_resultado: 'hecho', la_razon: null })).error).toBeNull();
    expect((await sesionSara.rpc('devolver', { la_delegacion: delegacion, la_razon: 'faltan los anexos', a_quien: bea })).error).toBeNull();

    const { data } = await comoServicio()
      .from('imprevisto')
      .select('empleado_id, importancia, devuelto_en')
      .eq('delega_funcion', informe)
      .order('pedido_en');
    expect(data!.map((d) => [d.empleado_id, d.importancia, d.devuelto_en !== null])).toEqual([
      [ana, 8, true],
      [bea, 3, false],
    ]);
  });
});

describe('INV-48: nunca cambia', () => {
  it('ninguna sesion puede actualizarla, ni la del administrador', async () => {
    const { data: i } = await comoServicio().from('imprevisto').select('id').eq('texto', 'Siete de ana').single();
    for (const sesion of [sesionAna, sesionSara, jefa]) {
      expect((await sesion.from('imprevisto').update({ importancia: 1 }).eq('id', i!.id)).error).not.toBeNull();
    }
    expect(await importanciaDe('Siete de ana')).toBe(7);
  });

  it('la regla vive en la base: ni la llave de servicio la mueve', async () => {
    const { data: i } = await comoServicio().from('imprevisto').select('id').eq('texto', 'Siete de ana').single();
    const { error } = await comoServicio().from('imprevisto').update({ importancia: 1 }).eq('id', i!.id);
    expect(error?.code).toBe('23514');
    expect(await importanciaDe('Siete de ana')).toBe(7);
  });

  it('marcar, deshacer la marca y borrar la dejan como estaba', async () => {
    const { data: i } = await comoServicio().from('imprevisto').select('id').eq('texto', 'Accion con nueve').single();
    expect((await sesionAna.rpc('marcar_imprevisto', { el_imprevisto: i!.id, el_resultado: 'no_pude', la_razon: 'sin sistema' })).error).toBeNull();
    expect((await sesionAna.rpc('desmarcar_imprevisto', { el_imprevisto: i!.id })).error).toBeNull();
    expect((await sesionAna.rpc('borrar_imprevisto', { el_imprevisto: i!.id })).error).toBeNull();
    expect(await importanciaDe('Accion con nueve')).toBe(9);
  });
});

describe('INV-48: lo que se lee trae la importancia', () => {
  it('lo que ve la supervisora de su gente', async () => {
    const { data } = await sesionSara.rpc('lo_de_mi_gente');
    const imprevistos = (data as { imprevistos: { texto: string; importancia: number }[] }).imprevistos;
    expect(imprevistos.find((i) => i.texto === 'Siete de sara')?.importancia).toBe(7);
    expect(imprevistos.find((i) => i.texto === 'Sin elegir de sara')?.importancia).toBe(5);

    next.sesion = sesionSara;
    const { gente } = await loDeMiGente();
    const deAna = gente.find((p) => p.id === ana)!.imprevistos;
    expect(deAna.find((i) => i.texto === 'Siete de jefa')?.importancia).toBe(7);
    expect(deAna.find((i) => i.texto === 'Informe al directorio')?.importancia).toBe(8);
  });

  it('la lista de tareas de la supervisora y de la administradora usa la importancia real', async () => {
    for (const sesion of [sesionSara, jefa]) {
      next.sesion = sesion;
      const { data: dias } = await sesion.from('dia_no_habil').select('desde, hasta');
      const lista = await tareasAbiertasDe(ana, hoy, Calendario.con(dias ?? []));
      const imprevistos = lista.filter((t) => t.tipo === 'imprevisto');
      expect(imprevistos.find((t) => t.tarea.texto === 'Siete de ana')?.importancia).toBe(7);
      expect(imprevistos.find((t) => t.tarea.texto === 'Accion con cero')?.importancia).toBe(0);
    }
  });
});

describe('INV-48: nunca toca dinero', () => {
  // La misma cotidianidad del mes, anotada con importancia 0 y luego con 9: un
  // hecho, un "no pude" y uno abierto. Como no se actualiza, se borran las
  // filas y se anotan de nuevo iguales, salvo la importancia.
  const MARCA = 'Cotidiano';
  async function conImportancia(importancia: number) {
    const servicio = comoServicio();
    await servicio.from('imprevisto').delete().like('texto', `${MARCA}%`);
    const quien = (await jefa.auth.getUser()).data.user!.id;
    const fila = (texto: string, extra: Record<string, unknown> = {}) => ({
      empleado_id: ana,
      texto,
      importancia,
      vence: `${mes}-10`,
      pedido_en: `${mes}-09T12:00:00Z`,
      pedido_por_otro: 'el banco',
      registrado_por: quien,
      ...extra,
    });
    const { error } = await servicio.from('imprevisto').insert([
      fila(`${MARCA} hecho`, { resultado: 'hecho', marcada_en: `${mes}-10T12:00:00Z` }),
      fila(`${MARCA} no pude`, { resultado: 'no_pude', razon: 'no alcanzo', marcada_en: `${mes}-10T13:00:00Z` }),
      fila(`${MARCA} abierto`),
    ]);
    if (error) throw error;

    next.sesion = jefa;
    const { nomina } = await nominaDelMes(ana, mes);
    const respuesta = await descargar(new NextRequest(`http://localhost/admin/descarga?mes=${mes}&persona=${ana}`));
    return { nomina, descarga: await respuesta.text() };
  }

  it('la nomina y la descarga del mes son identicas con importancia 0 o 9', async () => {
    const con0 = await conImportancia(0);
    const con9 = await conImportancia(9);
    expect(con0.nomina?.lineas.find((l) => l.tipo === 'cotidianidad')).toBeDefined();
    expect(con0.descarga).toContain(`${MARCA} no pude`);
    expect(con9.nomina).toEqual(con0.nomina);
    expect(con9.descarga).toBe(con0.descarga);
  });
});
