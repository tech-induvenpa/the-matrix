import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cumplimientoDeLaHolgura } from '@matriz/dominio';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// El supervisor (CEB-145, ADR 0012). Tres sesiones reales y un vecino: una
// supervisora, alguien a su cargo, alguien que no lo esta, y el administrador.
// Lo que se prueba es que la base decide que ve y que escribe cada uno.

const hoy = () => new Date().toISOString().slice(0, 10);
const mes = () => hoy().slice(0, 7);
const finDelMes = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
};
const ayer = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);

let ana: string; // supervisora
let benito: string; // a cargo de ana
let carla: string; // vecina: nadie la supervisa
let cierre: string; // entregable mensual de ana
let conciliacion: string; // otro entregable mensual de ana
let deBenito: string; // entregable de benito
let jefa: SupabaseClient;
let sesionAna: SupabaseClient;
let sesionBenito: SupabaseClient;
let sesionCarla: SupabaseClient;

const entregable = (texto: string) => ({
  hash_identidad: `h-${texto}`,
  texto,
  importancia: 5,
  periodicidad: 'mensual',
  tipo_generado: 'entregable',
  fecha_alta: '2026-01-01',
});

// Todas las claves de un JSON, a cualquier profundidad.
const claves = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.flatMap(claves)
    : v && typeof v === 'object'
      ? Object.entries(v).flatMap(([k, x]) => [k, ...claves(x)])
      : [];

beforeAll(async () => {
  await vaciar();
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
  benito = await sembrarEmpleado('BENITO', 'benito@prueba.test');
  carla = await sembrarEmpleado('CARLA', 'carla@prueba.test');
  cierre = await sembrarFuncion(ana, { ...entregable('Cierre'), ponderacion: 40 });
  conciliacion = await sembrarFuncion(ana, { ...entregable('Conciliacion'), ponderacion: 30 });
  deBenito = await sembrarFuncion(benito, { ...entregable('Facturas'), ponderacion: 37 });

  const servicio = comoServicio();
  await servicio.from('bono').insert([
    { empleado_id: ana, monto: 1000, rige_desde: '2026-01-01' },
    { empleado_id: benito, monto: 777, rige_desde: '2026-01-01' },
  ]);
  await servicio.from('marca').insert({ funcion_id: deBenito, periodo: '2026-01', resultado: 'no_pude', razon: 'sin sistema' });

  jefa = await comoAdministrador('jefa@prueba.test');
  sesionAna = await comoEmpleado('ana@prueba.test');
  sesionBenito = await comoEmpleado('benito@prueba.test');
  sesionCarla = await comoEmpleado('carla@prueba.test');

  const { error } = await jefa.rpc('asignar_supervisor', { el_empleado: benito, el_supervisor: ana });
  if (error) throw error;
});

describe('INV-28: solo el administrador decide quien supervisa a quien, en un solo nivel', () => {
  it('un empleado o una supervisora no asignan supervisor', async () => {
    expect((await sesionCarla.rpc('asignar_supervisor', { el_empleado: carla, el_supervisor: ana })).error).not.toBeNull();
    expect((await sesionAna.rpc('asignar_supervisor', { el_empleado: carla, el_supervisor: ana })).error).not.toBeNull();
    expect((await sesionAna.from('empleado').update({ supervisor_id: ana }).eq('id', carla).select()).data ?? []).toEqual([]);
  });

  it('la base rechaza los tres casos de nivel, aunque lo pida el administrador', async () => {
    // Benito tiene supervisor: no puede supervisar.
    expect((await jefa.rpc('asignar_supervisor', { el_empleado: carla, el_supervisor: benito })).error).not.toBeNull();
    // Ana supervisa: no puede tener supervisor.
    expect((await jefa.rpc('asignar_supervisor', { el_empleado: ana, el_supervisor: carla })).error).not.toBeNull();
    // Nadie se supervisa a si mismo.
    expect((await jefa.rpc('asignar_supervisor', { el_empleado: carla, el_supervisor: carla })).error).not.toBeNull();

    const { data } = await comoServicio().from('empleado').select('id, supervisor_id').order('nombre_bloque');
    expect(data).toEqual([
      { id: ana, supervisor_id: null },
      { id: benito, supervisor_id: ana },
      { id: carla, supervisor_id: null },
    ]);
  });
});

describe('INV-2: la supervisora ve a su gente de hoy, y a nadie mas', () => {
  it('obtiene lo de benito y nada de carla', async () => {
    const { data } = await sesionAna.rpc('lo_de_mi_gente');
    expect(data.gente).toEqual([{ id: benito, nombre: 'BENITO' }]);
    expect(data.funciones.map((f: { id: string }) => f.id)).toEqual([deBenito]);
    expect(data.marcas.map((m: { razon: string }) => m.razon)).toEqual(['sin sistema']);
  });

  it('quien no supervisa no obtiene nada, y nadie lee la gente de otro por las tablas', async () => {
    expect((await sesionBenito.rpc('lo_de_mi_gente')).data.gente).toEqual([]);
    expect((await sesionCarla.rpc('lo_de_mi_gente')).data.gente).toEqual([]);
    expect((await sesionAna.from('marca').select('id').eq('funcion_id', deBenito)).data).toEqual([]);
    expect((await sesionAna.from('empleado').select('id').eq('id', benito)).data).toEqual([]);
  });

  it('al cambiarle el supervisor a benito, ana deja de obtener sus datos', async () => {
    await jefa.rpc('asignar_supervisor', { el_empleado: benito, el_supervisor: null });
    expect((await sesionAna.rpc('lo_de_mi_gente')).data.gente).toEqual([]);
    await jefa.rpc('asignar_supervisor', { el_empleado: benito, el_supervisor: ana });
    expect((await sesionAna.rpc('lo_de_mi_gente')).data.gente).toEqual([{ id: benito, nombre: 'BENITO' }]);
  });
});

describe('INV-3 e INV-1: ni pesos ni bonos de su gente', () => {
  it('lo que obtiene de su gente no trae ponderacion, cumplimiento ni montos', async () => {
    const { data } = await sesionAna.rpc('lo_de_mi_gente');
    expect(claves(data).filter((k) => /ponder|cumpl|bono|monto|peso|desplaz|arrastr/i.test(k))).toEqual([]);
  });

  it('por las tablas tampoco: ni titularidades ni bonos de benito', async () => {
    expect((await sesionAna.from('titularidad').select('ponderacion').eq('empleado_id', benito)).data).toEqual([]);
    const { data } = await sesionAna.from('bono').select('empleado_id, monto');
    expect(data).toEqual([{ empleado_id: ana, monto: 1000 }]);
  });
});

describe('INV-26: registra y delega solo en su gente, solo lo suyo que no vencio, una a la vez', () => {
  it('le pide un imprevisto a benito, a su nombre; a carla no', async () => {
    const { data: yo } = await sesionAna.auth.getUser();
    const aBenito = await sesionAna
      .from('imprevisto')
      .insert({ empleado_id: benito, texto: 'Llamar al banco', vence: hoy(), pedido_por: yo.user!.id });
    expect(aBenito.error).toBeNull();

    const { data } = await sesionBenito.from('imprevisto').select('texto, pedido_por');
    expect(data).toEqual([{ texto: 'Llamar al banco', pedido_por: yo.user!.id }]);

    const aCarla = await sesionAna.from('imprevisto').insert({ empleado_id: carla, texto: 'x', vence: hoy(), pedido_por_otro: 'yo' });
    expect(aCarla.error).not.toBeNull();
  });

  it('no se registra un imprevisto pedido por si misma', async () => {
    const { data: yo } = await sesionAna.auth.getUser();
    const { error } = await sesionAna.from('imprevisto').insert({ empleado_id: ana, texto: 'x', vence: hoy(), pedido_por: yo.user!.id });
    expect(error).not.toBeNull();
  });

  it('aparece en la lista de quien lo pidio de cualquiera', async () => {
    const { data } = await sesionCarla.rpc('quienes_piden');
    expect((data as { nombre: string }[]).map((q) => q.nombre)).toContain('ANA');
  });

  it('rechaza delegar lo ajeno, a quien no esta a su cargo, dos veces, o sin supervisar', async () => {
    const delegar = (s: SupabaseClient, funcion: string, aQuien: string) =>
      s.rpc('delegar', { la_funcion: funcion, el_periodo: mes(), a_quien: aQuien, el_vence: finDelMes() });

    expect((await delegar(sesionAna, deBenito, benito)).error).not.toBeNull();
    expect((await delegar(sesionAna, cierre, carla)).error).not.toBeNull();
    expect((await delegar(sesionBenito, deBenito, carla)).error).not.toBeNull();

    expect((await delegar(sesionAna, cierre, benito)).error).toBeNull();
    expect((await delegar(sesionAna, cierre, benito)).error).not.toBeNull();
  });

  it('nadie escribe las columnas de la delegacion por fuera de delegar', async () => {
    const { error } = await sesionAna
      .from('imprevisto')
      .insert({ empleado_id: benito, texto: 'x', vence: hoy(), pedido_por_otro: 'yo', delega_funcion: cierre, delega_periodo: mes() });
    expect(error).not.toBeNull();
  });
});

describe('INV-18: una delegacion vence con su ocurrencia, que todavia no vencio', () => {
  it('delegar con fecha pasada o mas alla del periodo se rechaza', async () => {
    const delegar = (vence: string) =>
      sesionAna.rpc('delegar', { la_funcion: conciliacion, el_periodo: mes(), a_quien: benito, el_vence: vence });
    expect((await delegar(ayer())).error).not.toBeNull();
    expect((await delegar('2099-01-01')).error).not.toBeNull();
  });

  it('un imprevisto sin delegacion sigue sin vencer despues del dia habil siguiente', async () => {
    const lejos = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
    const { error } = await sesionAna.from('imprevisto').insert({ empleado_id: benito, texto: 'x', vence: lejos, pedido_por_otro: 'yo' });
    expect(error).not.toBeNull();
  });
});

describe('INV-25: la marca de quien recibe no cierra la ocurrencia del supervisor', () => {
  it('benito la marca hecha y el cierre sigue abierto hasta que ana marca el suyo', async () => {
    const { data: delegacion } = await sesionBenito.from('imprevisto').select('id').eq('delega_funcion', cierre).single();
    expect((await sesionBenito.rpc('marcar_imprevisto', { el_imprevisto: delegacion!.id, el_resultado: 'hecho', la_razon: null })).error).toBeNull();

    const servicio = comoServicio();
    expect((await servicio.from('marca').select('id').eq('funcion_id', cierre)).data).toEqual([]);

    const { data: suyas } = await sesionAna.rpc('mis_delegaciones');
    expect(suyas.map((d: { resultado: string }) => d.resultado)).toEqual(['hecho']);

    expect((await sesionAna.from('marca').insert({ funcion_id: cierre, periodo: mes(), resultado: 'hecho' })).error).toBeNull();
    expect((await servicio.from('marca').select('resultado').eq('funcion_id', cierre)).data).toEqual([{ resultado: 'hecho' }]);
  });
});

describe('INV-27: devolver un "hecho" exige razon y cuenta en contra', () => {
  it('solo la que delego devuelve, con razon; cuenta en contra en la holgura y ya no se deshace', async () => {
    expect(
      (await sesionAna.rpc('delegar', { la_funcion: conciliacion, el_periodo: mes(), a_quien: benito, el_vence: finDelMes() })).error,
    ).toBeNull();
    const { data: delegacion } = await sesionBenito.from('imprevisto').select('id').eq('delega_funcion', conciliacion).single();
    await sesionBenito.rpc('marcar_imprevisto', { el_imprevisto: delegacion!.id, el_resultado: 'hecho', la_razon: null });

    expect((await sesionBenito.rpc('devolver', { la_delegacion: delegacion!.id, la_razon: 'no' })).error).not.toBeNull();
    expect((await sesionCarla.rpc('devolver', { la_delegacion: delegacion!.id, la_razon: 'no' })).error).not.toBeNull();
    expect((await sesionAna.rpc('devolver', { la_delegacion: delegacion!.id, la_razon: '  ' })).error).not.toBeNull();
    expect((await sesionAna.rpc('devolver', { la_delegacion: delegacion!.id, la_razon: 'faltan los anexos' })).error).toBeNull();

    // Benito no puede borrar la devolucion deshaciendo su marca.
    expect((await sesionBenito.rpc('desmarcar_imprevisto', { el_imprevisto: delegacion!.id })).error).not.toBeNull();

    const { data } = await jefa
      .from('imprevisto')
      .select('vence, resultado, borrado_en, devuelto_en')
      .eq('id', delegacion!.id);
    const filas = (data ?? []).map((i) => ({ vence: i.vence, resultado: i.resultado, borradoEn: i.borrado_en, devueltoEn: i.devuelto_en }));
    const lejos = { desde: '2026-01-01', hasta: '2099-12-31' };
    expect(cumplimientoDeLaHolgura(filas, lejos, '2099-12-31')).toEqual({ esperados: 1, hechos: 0, sinCumplir: 1 });

    // Devuelta, se puede delegar otra vez.
    expect(
      (await sesionAna.rpc('delegar', { la_funcion: conciliacion, el_periodo: mes(), a_quien: benito, el_vence: finDelMes() })).error,
    ).toBeNull();
  });
});
