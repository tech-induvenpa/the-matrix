import { Calendario, emojiDe, urgenciaDe, vencimientoPorUrgencia } from '@matriz/dominio';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// El imprevisto elige su vencimiento (CEB-192, ADR 0013). INV-32 pasa por la
// accion del servidor de verdad; lo unico que se sustituye es Next alrededor:
// las cookies (la sesion es la de un empleado real), la cache y el documento.
// Next se resuelve desde la web, no desde aqui: se mockea por su ruta real.
const next = await vi.hoisted(async () => {
  const { createRequire } = await import('node:module');
  const web = createRequire(new URL('../../apps/web/package.json', import.meta.url));
  return { sesion: null as SupabaseClient | null, cache: web.resolve('next/cache') };
});
vi.mock('@/lib/supabase/servidor', () => ({ clienteDelServidor: async () => next.sesion }));
vi.mock('@/lib/razones', () => ({ proyectarRazones: async () => {} }));
vi.mock(next.cache, () => ({ revalidatePath: () => {} }));

const { registrarImprevisto } = await import('../../apps/web/src/app/acciones');

const hoy = () => new Date().toISOString().slice(0, 10);
const EMOJI = ['🍃', '🍃', '🍃', '🍃', '🧠', '🧠', '💣', '💣', '🔥', '🔥'];
const MARCA = 'prueba CEB-192';

async function calendarioDeLaBase(): Promise<Calendario> {
  const { data } = await comoServicio().from('dia_no_habil').select('desde, hasta');
  return Calendario.con(data ?? []);
}

let ana: string;

beforeAll(async () => {
  await vaciar();
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
});

// Los feriados de prueba no se quedan en la base: los demas archivos la usan.
afterAll(async () => {
  await comoServicio().from('dia_no_habil').delete().eq('descripcion', MARCA);
});

// INV-32 · La urgencia que se elige al anotar es la que la pantalla muestra ese dia.
describe('INV-32: la urgencia elegida es la que se ve', () => {
  it('para cada urgencia de 0 a 9, con un feriado dentro del tramo', async () => {
    // Un feriado a tres habiles de hoy: cae dentro del tramo de 7 para abajo.
    const antes = await calendarioDeLaBase();
    const feriado = antes.sumarHabiles(hoy(), 3);
    await comoServicio().from('dia_no_habil').insert({ desde: feriado, hasta: feriado, descripcion: MARCA });
    const calendario = await calendarioDeLaBase();

    next.sesion = await comoEmpleado('ana@prueba.test');
    for (let u = 0; u <= 9; u++) {
      const formulario = new FormData();
      formulario.set('texto', `Urgencia ${u}`);
      formulario.set('urgencia', String(u));
      formulario.set('pidio', 'otro');
      formulario.set('otro', 'Un cliente');
      await registrarImprevisto(ana, formulario);

      const { data } = await comoServicio().from('imprevisto').select('vence').eq('texto', `Urgencia ${u}`).single();
      const urgencia = urgenciaDe(calendario.habilesEntre(hoy(), data!.vence));
      expect(urgencia).toBe(u);
      expect(emojiDe(urgencia)).toBe(EMOJI[u]);
    }
  });

  it('sin urgencia, 8: manana, como siempre', async () => {
    const formulario = new FormData();
    formulario.set('texto', 'Sin elegir');
    formulario.set('pidio', 'otro');
    formulario.set('otro', 'Un cliente');
    await registrarImprevisto(ana, formulario);

    const { data } = await comoServicio().from('imprevisto').select('vence').eq('texto', 'Sin elegir').single();
    expect(data!.vence).toBe(vencimientoPorUrgencia(hoy(), 8, await calendarioDeLaBase()));
  });
});

// INV-33 · Cargar dias no habiles nunca deja un imprevisto abierto venciendo en
// un dia no habil, y no toca nada mas.
describe('INV-33: un feriado nuevo corre solo al imprevisto abierto', () => {
  it('el abierto pasa al habil siguiente; marcado, borrado, delegacion y el de D+3 no se mueven', async () => {
    await vaciar();
    ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
    const cierre = await sembrarFuncion(ana, {
      texto: 'Cierre', periodicidad: 'mensual', importancia: 9, tipo_generado: 'entregable', ponderacion: 100,
    });

    const antes = await calendarioDeLaBase();
    const D = vencimientoPorUrgencia(hoy(), 5, antes);
    const D3 = antes.sumarHabiles(D, 3);

    const sesion = await comoEmpleado('ana@prueba.test');
    const registrar = async (texto: string, vence: string) => {
      const { data, error } = await sesion
        .from('imprevisto')
        .insert({ empleado_id: ana, texto, vence, pedido_por_otro: 'Un cliente' })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    };

    const abierto = await registrar('Abierto en D', D);
    const marcado = await registrar('Marcado en D', D);
    const borrado = await registrar('Borrado en D', D);
    const despues = await registrar('Abierto en D+3', D3);
    await sesion.rpc('marcar_imprevisto', { el_imprevisto: marcado, el_resultado: 'hecho', la_razon: null });
    await sesion.rpc('borrar_imprevisto', { el_imprevisto: borrado });
    // ponytail: la delegacion se siembra directo; delegar() pide montar un
    // supervisor, y aqui solo importa que sea una fila de delegacion.
    const { data: yo } = await comoServicio().from('empleado').select('auth_user_id').eq('id', ana).single();
    const { data: delegacion, error } = await comoServicio()
      .from('imprevisto')
      .insert({
        empleado_id: ana, texto: 'Delegado en D', vence: D, pedido_por_otro: 'Un supervisor', registrado_por: yo!.auth_user_id,
        delega_funcion: cierre, delega_periodo: D.slice(0, 7),
      })
      .select('id')
      .single();
    if (error) throw error;

    const leer = async () => {
      const { data } = await comoServicio().from('imprevisto').select('id, vence, pedido_en');
      return new Map((data ?? []).map((i) => [i.id as string, i as { vence: string; pedido_en: string }]));
    };
    const previo = await leer();

    const jefa = await comoAdministrador('jefa@prueba.test');
    const { error: sinCargar } = await jefa.from('dia_no_habil').insert({ desde: D, hasta: D, descripcion: MARCA });
    expect(sinCargar).toBeNull();

    const ahora = await leer();
    expect(ahora.get(abierto)!.vence).toBe((await calendarioDeLaBase()).habilSiguiente(D));
    expect(ahora.get(abierto)!.vence).not.toBe(D);
    for (const id of [marcado, borrado, delegacion.id as string]) expect(ahora.get(id)!.vence).toBe(D);
    expect(ahora.get(despues)!.vence).toBe(D3);
    for (const [id, i] of previo) expect(ahora.get(id)!.pedido_en).toBe(i.pedido_en);
  });
});
