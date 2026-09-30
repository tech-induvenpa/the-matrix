import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { comoAdministrador, comoEmpleado, comoServicio, empresa, leerHoja, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-45 · La nomina cuadra al centavo y coincide con la descarga (CEB-230,
// CEB-233, ADR 0016). Una persona con entregables cumplidos e incumplidos, un
// flujo atrasado y cotidianidad con imprevistos sin cumplir, en agosto de
// 2026, ya cerrado. Todo pasa por el cableado real: la nomina que lee la web y
// las dos rutas de descarga, con la sesion de la administradora. Solo se
// sustituyen las cookies de Next.
const next = await vi.hoisted(async () => {
  const { createRequire } = await import('node:module');
  const web = createRequire(new URL('../../apps/web/package.json', import.meta.url));
  return { sesion: null as SupabaseClient | null, servidor: web.resolve('next/server') };
});
vi.mock('@/lib/supabase/servidor', () => ({ clienteDelServidor: async () => next.sesion }));

const { nominaDelMes } = await import('../../apps/web/src/lib/nomina');
const { GET: descargar } = await import('../../apps/web/src/app/admin/descarga/route');
const { GET: descargarNomina } = await import('../../apps/web/src/app/admin/nomina/route');
const { NextRequest } = (await import(next.servidor)) as typeof import('next/server');

const MES = '2026-08';
const BONO = 777.77;
// Un punto y coma en el nombre: no puede descuadrar ninguno de los dos archivos.
const CAJA = 'Cierre de caja; sede Valencia';

let ana: string;
let toyota: string;
let jefa: SupabaseClient;

const funcion = (texto: string, extra: Record<string, unknown> = {}) => ({
  hash_identidad: `h-${texto}`,
  texto,
  importancia: 5,
  periodicidad: 'mensual',
  tipo_generado: 'entregable',
  fecha_alta: '2026-01-01',
  ...extra,
});

const centavos = (d: number) => Math.round(d * 100);

beforeAll(async () => {
  await vaciar();
  const servicio = comoServicio();
  toyota = await empresa('Toyota');
  ana = await sembrarEmpleado('ANA', 'ana@prueba.test', { empresa_id: toyota });
  // Sin bono: no aparece en el archivo de su empresa.
  await sembrarEmpleado('BENITO', 'benito@prueba.test', { empresa_id: toyota });
  jefa = await comoAdministrador('jefa@prueba.test');
  const quien = (await jefa.auth.getUser()).data.user!.id;

  await servicio.from('bono').insert({ empleado_id: ana, monto: BONO, rige_desde: '2026-01-01' });

  // Caja, semanal: unas cumplidas, un "no pude" y el resto vencido sin marcar.
  const caja = await sembrarFuncion(ana, { ...funcion(CAJA, { periodicidad: 'semanal' }), ponderacion: 40 });
  // Pagos, mensual, cumplida: no descuenta.
  const pagos = await sembrarFuncion(ana, { ...funcion('Pagos'), ponderacion: 10 });
  // Conciliacion, flujo: atrasada del lunes 10 al jueves 13 de agosto.
  const conciliacion = await sembrarFuncion(ana, { ...funcion('Conciliación', { periodicidad: 'diaria', tipo_generado: 'flujo' }), ponderacion: 20 });

  const { error } = await servicio.from('marca').insert([
    { funcion_id: caja, periodo: '2026-08-03', resultado: 'hecho' },
    { funcion_id: caja, periodo: '2026-08-10', resultado: 'no_pude', razon: 'sin efectivo' },
    { funcion_id: caja, periodo: '2026-08-17', resultado: 'hecho' },
    { funcion_id: pagos, periodo: MES, resultado: 'hecho' },
  ]);
  if (error) throw error;
  await servicio.from('evento_flujo').insert([
    { funcion_id: conciliacion, estado: 'atrasado', razon: 'sin extracto', en: '2026-08-10T12:00:00Z' },
    { funcion_id: conciliacion, estado: 'al_dia', en: '2026-08-13T12:00:00Z' },
  ]);

  // Cotidianidad: tres hechos y un "no pude".
  const imprevisto = (texto: string, resultado: string) => ({
    empleado_id: ana,
    texto,
    vence: '2026-08-20',
    pedido_en: '2026-08-18T12:00:00Z',
    pedido_por_otro: 'el banco',
    registrado_por: quien,
    resultado,
    razon: resultado === 'hecho' ? null : 'no alcanzo',
    marcada_en: '2026-08-20T12:00:00Z',
  });
  const { error: sinImprevistos } = await servicio
    .from('imprevisto')
    .insert([imprevisto('Uno', 'hecho'), imprevisto('Dos', 'hecho'), imprevisto('Tres', 'hecho'), imprevisto('Cuatro', 'no_pude')]);
  if (sinImprevistos) throw sinImprevistos;
});

describe('INV-45: la nomina cuadra al centavo y coincide con la descarga', () => {
  it('el total es el bono menos los descuentos, al centavo, y lo cumplido no descuenta', async () => {
    next.sesion = jefa;
    const { nomina } = await nominaDelMes(ana, MES);

    expect(nomina!.bono).toBe(BONO);
    expect(nomina!.lineas.map((l) => l.parte)).toEqual([CAJA, 'Conciliación', 'Cotidianidad']);
    expect(centavos(nomina!.total)).toBe(centavos(BONO) - nomina!.lineas.reduce((t, l) => t + centavos(l.descuento), 0));
    // Tres dias habiles atrasados, un imprevisto de cuatro sin cumplir.
    expect(nomina!.lineas.find((l) => l.tipo === 'flujo')).toMatchObject({ sinCumplir: 3 });
    expect(nomina!.lineas.find((l) => l.tipo === 'cotidianidad')).toMatchObject({ sinCumplir: 1, veces: 4 });
  });

  it('cada descuento es la suma del monto no cumplido de sus filas en la descarga del mismo mes', async () => {
    next.sesion = jefa;
    const { nomina } = await nominaDelMes(ana, MES);
    const respuesta = await descargar(new NextRequest(`http://localhost/admin/descarga?mes=${MES}&persona=${ana}`));
    const { filas } = leerHoja(await respuesta.text());

    const suma = (funcion: string) =>
      Math.round(filas.filter((f) => f.FUNCION === funcion).reduce((t, f) => t + Number(f['MONTO NO CUMPLIDO']), 0) * 100) / 100;
    for (const l of nomina!.lineas) expect(suma(l.parte)).toBe(l.descuento);
    // Pagos sale en la descarga, cumplida, y no suma nada.
    expect(filas.some((f) => f.FUNCION === 'Pagos')).toBe(true);
    expect(suma('Pagos')).toBe(0);
  });

  it('la descarga "Nomina del mes" trae el mismo total, y quien no tiene bono no aparece', async () => {
    next.sesion = jefa;
    const { nomina } = await nominaDelMes(ana, MES);
    const respuesta = await descargarNomina(new NextRequest(`http://localhost/admin/nomina?mes=${MES}&empresa=${toyota}`));
    const { cabecera, filas } = leerHoja(await respuesta.text());

    expect(cabecera).toEqual(['PERSONA', 'CONCEPTO', 'MONTO']);
    expect(filas.map((f) => f.PERSONA)).not.toContain('BENITO');
    const deAna = filas.filter((f) => f.PERSONA === 'ANA');
    expect(deAna[0]!.CONCEPTO).toBe('Bono de agosto');
    expect(deAna.at(-1)).toEqual({ PERSONA: 'ANA', CONCEPTO: 'Total a pagar', MONTO: nomina!.total.toFixed(2).replace('.', ',') });
    // El punto y coma de la funcion queda dentro de su concepto.
    expect(deAna.some((f) => String(f.CONCEPTO).startsWith(`${CAJA} (40%)`))).toBe(true);
    // Bono menos descuentos, leidos del archivo, es el total del archivo.
    const monto = (f: Record<string, string | number>) => centavos(Number(String(f.MONTO).replace(',', '.')));
    expect(deAna.slice(0, -1).reduce((t, f) => t + monto(f), 0)).toBe(monto(deAna.at(-1)!));
  });

  it('el mes en curso no se descarga, y solo el administrador la baja', async () => {
    next.sesion = jefa;
    const esteMes = new Date().toISOString().slice(0, 7);
    expect((await descargarNomina(new NextRequest(`http://localhost/admin/nomina?mes=${esteMes}&empresa=${toyota}`))).status).toBe(409);

    next.sesion = await comoEmpleado('ana@prueba.test');
    expect((await descargarNomina(new NextRequest(`http://localhost/admin/nomina?mes=${MES}&empresa=${toyota}`))).status).toBe(404);
  });
});
