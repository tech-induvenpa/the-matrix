import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, vaciar } from './entorno';

// Delegar un imprevisto (CEB-253, ADR 0018). Una supervisora, alguien a su
// cargo, otra supervisora y alguien sin supervisar; sesiones reales. El
// imprevisto que le cayo a ana lo delega a benito: el original sigue siendo
// suyo, y la base decide quien puede y cuando.

const hoy = () => new Date().toISOString().slice(0, 10);
const ayer = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);

let ana: string; // supervisora
let benito: string; // a cargo de ana
let carla: string; // sin supervisor
let dora: string; // otra supervisora, con su propia gente
let enrique: string; // a cargo de dora
let sesionAna: SupabaseClient;
let sesionBenito: SupabaseClient;
let sesionCarla: SupabaseClient;
let sesionDora: SupabaseClient;
let jefa: SupabaseClient;
let uidAna: string;

// Un imprevisto que le cayo a ana, pedido por "finanzas".
async function aAna(texto: string, importancia = 7): Promise<string> {
  const { data, error } = await comoServicio()
    .from('imprevisto')
    .insert({ empleado_id: ana, texto, vence: hoy(), importancia, pedido_por_otro: 'finanzas', registrado_por: uidAna })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

const delegar = (s: SupabaseClient, imprevisto: string, aQuien: string) =>
  s.rpc('delegar_imprevisto', { el_imprevisto: imprevisto, a_quien: aQuien });

const marcar = (s: SupabaseClient, id: string, resultado: string, razon: string | null = null) =>
  s.rpc('marcar_imprevisto', { el_imprevisto: id, el_resultado: resultado, la_razon: razon });

const filaDe = async (id: string) =>
  (await comoServicio().from('imprevisto').select('*').eq('id', id).single()).data!;

beforeAll(async () => {
  await vaciar();
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  benito = await sembrarEmpleado('BENITO', 'benito@prueba.test');
  carla = await sembrarEmpleado('CARLA', 'carla@prueba.test');
  dora = await sembrarEmpleado('DORA', 'dora@prueba.test');
  enrique = await sembrarEmpleado('ENRIQUE', 'enrique@prueba.test');

  jefa = await comoAdministrador('jefa@prueba.test');
  sesionAna = await comoEmpleado('ana@prueba.test');
  sesionBenito = await comoEmpleado('benito@prueba.test');
  sesionCarla = await comoEmpleado('carla@prueba.test');
  sesionDora = await comoEmpleado('dora@prueba.test');
  uidAna = (await sesionAna.auth.getUser()).data.user!.id;

  for (const [quien, aCargoDe] of [
    [benito, ana],
    [enrique, dora],
  ]) {
    const { error } = await jefa.rpc('asignar_supervisor', { el_empleado: quien, el_supervisor: aCargoDe });
    if (error) throw error;
  }
});

describe('INV-49: delegar no cierra ni mueve el original', () => {
  it('a benito le nace uno nuevo, vinculado; el original sigue abierto y de ana', async () => {
    const original = await aAna('Revisar una factura');
    const { data: nueva, error } = await delegar(sesionAna, original, benito);
    expect(error).toBeNull();

    const delegado = await filaDe(nueva);
    expect(delegado.empleado_id).toBe(benito);
    expect(delegado.delega_imprevisto).toBe(original);
    expect((await filaDe(original)).empleado_id).toBe(ana);
    expect((await filaDe(original)).resultado).toBeNull();
  });

  it('que benito lo marque hecho no marca el original', async () => {
    const original = await aAna('Copiar el contrato');
    const { data: nueva } = await delegar(sesionAna, original, benito);
    expect((await marcar(sesionBenito, nueva, 'hecho')).error).toBeNull();

    expect((await filaDe(nueva)).resultado).toBe('hecho');
    const o = await filaDe(original);
    expect(o.resultado).toBeNull();
    expect(o.empleado_id).toBe(ana);
  });

  it('ana lo marca ella, despues de revisar', async () => {
    const original = await aAna('Pagar a un proveedor');
    await delegar(sesionAna, original, benito);
    expect((await marcar(sesionAna, original, 'hecho')).error).toBeNull();
    expect((await filaDe(original)).resultado).toBe('hecho');
  });
});

describe('INV-50: vence con el original, hereda su importancia, solo si esta abierto y a la vez una', () => {
  it('copia vencimiento e importancia; cambiar el original despues no la mueve', async () => {
    const original = await aAna('Atender a un cliente', 9);
    const { data: nueva } = await delegar(sesionAna, original, benito);
    const d = await filaDe(nueva);
    expect(d.vence).toBe(hoy());
    expect(d.importancia).toBe(9);

    await comoServicio().from('imprevisto').update({ importancia: 1 }).eq('id', original);
    expect((await filaDe(nueva)).importancia).toBe(9);
  });

  it('la base rechaza una delegacion que no vence con su original', async () => {
    const original = await aAna('Un trámite');
    const { error } = await comoServicio()
      .from('imprevisto')
      .insert({ empleado_id: benito, texto: 'x', vence: ayer(), delega_imprevisto: original, pedido_por: uidAna, registrado_por: uidAna });
    expect(error).not.toBeNull();
  });

  it('no se delega uno vencido, marcado, borrado o devuelto', async () => {
    const vencido = await aAna('Vencido');
    await comoServicio().from('imprevisto').update({ vence: ayer() }).eq('id', vencido);
    expect((await delegar(sesionAna, vencido, benito)).error).not.toBeNull();

    const marcado = await aAna('Marcado');
    await marcar(sesionAna, marcado, 'no_pude', 'sin acceso');
    expect((await delegar(sesionAna, marcado, benito)).error).not.toBeNull();

    const borrado = await aAna('Borrado');
    expect((await sesionAna.rpc('borrar_imprevisto', { el_imprevisto: borrado })).error).toBeNull();
    expect((await delegar(sesionAna, borrado, benito)).error).not.toBeNull();
  });

  it('una delegacion no se delega otra vez, y no hay cadena', async () => {
    const original = await aAna('Sin cadena');
    const { data: nueva } = await delegar(sesionAna, original, benito);
    expect((await delegar(sesionBenito, nueva, carla)).error).not.toBeNull();
  });

  it('un imprevisto se delega una vez a la vez, aun con dos llamadas simultaneas', async () => {
    const original = await aAna('Una sola vez');
    const [a, b] = await Promise.all([delegar(sesionAna, original, benito), delegar(sesionAna, original, benito)]);
    expect([a.error, b.error].filter((e) => e === null)).toHaveLength(1);

    const { data } = await comoServicio().from('imprevisto').select('id').eq('delega_imprevisto', original);
    expect(data).toHaveLength(1);
  });

  it('tras un "no pude" de quien lo recibio, se puede delegar otra vez', async () => {
    const original = await aAna('Otra vez');
    const { data: primera } = await delegar(sesionAna, original, benito);
    await marcar(sesionBenito, primera, 'no_pude', 'sin tiempo');
    expect((await delegar(sesionAna, original, benito)).error).toBeNull();
  });
});

describe('INV-51: solo la supervisora del dueño, y solo a su gente', () => {
  it('rechaza a un empleado sin gente, a otra supervisora, y a alguien que no esta a cargo', async () => {
    const original = await aAna('Ajeno');

    expect((await delegar(sesionBenito, original, carla)).error).not.toBeNull(); // no es suyo
    expect((await delegar(sesionDora, original, enrique)).error).not.toBeNull(); // es de ana
    expect((await delegar(sesionAna, original, carla)).error).not.toBeNull(); // carla no esta a cargo de ana
    expect((await delegar(sesionAna, original, enrique)).error).not.toBeNull(); // enrique es de dora
    expect((await delegar(sesionCarla, original, carla)).error).not.toBeNull(); // no supervisa a nadie

    const { data } = await comoServicio().from('imprevisto').select('id').eq('delega_imprevisto', original);
    expect(data).toEqual([]);
  });

  it('nadie escribe la columna del vinculo por fuera de delegar_imprevisto', async () => {
    const original = await aAna('A mano');
    const { error } = await sesionAna
      .from('imprevisto')
      .insert({ empleado_id: benito, texto: 'x', vence: hoy(), pedido_por: uidAna, delega_imprevisto: original });
    expect(error).not.toBeNull();
  });
});

describe('INV-52: el pedido original se cuenta una sola vez', () => {
  it('la delegacion es de ana; "finanzas" solo aparece en el original', async () => {
    await vaciarImprevistos();
    const original = await aAna('Contar una vez');
    const { data: nueva } = await delegar(sesionAna, original, benito);

    const d = await filaDe(nueva);
    expect(d.pedido_por).toBe(uidAna);
    expect(d.pedido_por_otro).toBeNull();

    const { data: todos } = await comoServicio().from('imprevisto').select('pedido_por, pedido_por_otro');
    const quienes = (todos ?? []).map((i) => i.pedido_por_otro ?? i.pedido_por);
    expect(quienes.filter((q) => q === 'finanzas')).toHaveLength(1);
    expect(quienes.filter((q) => q === uidAna)).toHaveLength(1);
  });

  it('quien recibe ve el pedido original, y nadie mas que ella y ana lo lee', async () => {
    const original = await aAna('Con contexto');
    const { data: nueva } = await delegar(sesionAna, original, benito);

    const { data: origen } = await sesionBenito.rpc('origen_de_mi_delegacion', { la_delegacion: nueva });
    expect(origen).toEqual([expect.objectContaining({ texto: 'Con contexto', pedido_por_otro: 'finanzas' })]);

    expect((await sesionCarla.rpc('origen_de_mi_delegacion', { la_delegacion: nueva })).data).toEqual([]);
    expect((await sesionBenito.from('imprevisto').select('id').eq('id', original)).data).toEqual([]);
  });

  it('no es "lo que pedi" de ana, y si una de sus delegaciones', async () => {
    const original = await aAna('Seguimiento');
    const { data: nueva } = await delegar(sesionAna, original, benito);

    expect(((await sesionAna.rpc('lo_que_pedi')).data ?? []).map((i: { id: string }) => i.id)).not.toContain(nueva);
    expect(((await sesionAna.rpc('mis_delegaciones')).data ?? []).map((i: { id: string }) => i.id)).toContain(nueva);
  });
});

describe('INV-53: devolver sigue las reglas de INV-27', () => {
  it('solo un "hecho", con razon; cuenta en contra de quien lo recibio', async () => {
    const original = await aAna('A devolver');
    const { data: nueva } = await delegar(sesionAna, original, benito);

    // Sin "hecho" no se devuelve.
    expect((await sesionAna.rpc('devolver', { la_delegacion: nueva, la_razon: 'no' })).error).not.toBeNull();

    await marcar(sesionBenito, nueva, 'hecho');
    expect((await sesionAna.rpc('devolver', { la_delegacion: nueva, la_razon: '  ' })).error).not.toBeNull();
    expect((await sesionBenito.rpc('devolver', { la_delegacion: nueva, la_razon: 'no' })).error).not.toBeNull();

    expect((await sesionAna.rpc('devolver', { la_delegacion: nueva, la_razon: 'Falto el sello' })).error).toBeNull();
    const d = await filaDe(nueva);
    expect(d.devuelto_en).not.toBeNull();
    expect(d.devuelto_razon).toBe('Falto el sello');
    expect((await filaDe(original)).resultado).toBeNull();
  });

  it('devolver a otra persona crea una delegacion nueva con el vencimiento y la importancia vigentes', async () => {
    await comoServicio().from('empleado').update({ supervisor_id: ana }).eq('id', carla);
    const original = await aAna('A otra persona', 6);
    const { data: nueva } = await delegar(sesionAna, original, benito);
    await marcar(sesionBenito, nueva, 'hecho');

    expect((await sesionAna.rpc('devolver', { la_delegacion: nueva, la_razon: 'Rehacer', a_quien: carla })).error).toBeNull();

    const { data: filas } = await comoServicio().from('imprevisto').select('*').eq('delega_imprevisto', original);
    const abierta = filas!.filter((f) => !f.devuelto_en);
    expect(abierta).toHaveLength(1);
    expect(abierta[0]).toMatchObject({ empleado_id: carla, vence: hoy(), importancia: 6, pedido_por: uidAna });
  });

  it('con el original ya marcado, no se devuelve: lo aprobado, aprobado', async () => {
    const original = await aAna('Ya aprobado');
    const { data: nueva } = await delegar(sesionAna, original, benito);
    await marcar(sesionBenito, nueva, 'hecho');
    await marcar(sesionAna, original, 'hecho');
    expect((await sesionAna.rpc('devolver', { la_delegacion: nueva, la_razon: 'tarde' })).error).not.toBeNull();
  });
});

async function vaciarImprevistos() {
  const { error } = await comoServicio().from('imprevisto').delete().not('id', 'is', null);
  if (error) throw error;
}
