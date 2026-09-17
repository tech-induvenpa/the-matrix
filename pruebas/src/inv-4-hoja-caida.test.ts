import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { razonesParaElDocumento } from '@matriz/dominio';
import { credenciales, escribirFilas } from '../../apps/web/src/lib/hoja';
import { comoEmpleado, comoServicio, sembrarEmpleado, vaciar } from './entorno';

// INV-4 · Una falla de la hoja nunca pierde ni bloquea una marca. El empleado
// registra su trabajo contra la base; Google es un destino posterior, no un
// requisito. Y como la pestaña se regenera entera desde la base, lo que no
// llego en un intento llega en el siguiente sin llevar cuenta de nada.
//
// Esta prueba no escribe en el documento real a proposito: reescribir la
// pestaña con datos de prueba borraria las razones de verdad. Lo que se
// comprueba es lo que el invariante garantiza: que la marca sobrevive al fallo
// y que la proyeccion se reconstruye completa.
const env = readFileSync(new URL('../../apps/web/.env.local', import.meta.url), 'utf8');
const v = (c: string) => env.split('\n').find((l) => l.startsWith(`${c}=`))!.slice(c.length + 1).trim();

describe('INV-4: la hoja puede caerse; la marca no se pierde', () => {
  let funcionId: string;

  beforeAll(async () => {
    await vaciar();
    const empleadoId = await sembrarEmpleado('ANA', 'ana@prueba.test');

    const { data, error } = await comoServicio()
      .from('funcion')
      .insert({
        empleado_id: empleadoId,
        hash_identidad: 'hoja-1',
        texto: 'Cierre financiero',
        ponderacion: 25,
        importancia: 9,
        periodicidad: 'mensual',
        tipo_generado: 'entregable',
      })
      .select('id')
      .single();
    if (error) throw error;
    funcionId = data.id as string;
  });

  it('escribir en un documento inaccesible falla, como debe', async () => {
    const cuenta = credenciales(v('GOOGLE_CREDENCIALES'));

    await expect(
      escribirFilas('documento-que-no-existe', 'RAZONES!A1', [['x']], cuenta),
    ).rejects.toThrow();
  });

  it('la marca del empleado queda guardada aunque la hoja este caida', async () => {
    const ana = await comoEmpleado('ana@prueba.test');

    // El empleado marca: esto es lo unico que no puede fallar.
    const { error } = await ana
      .from('marca')
      .insert({ funcion_id: funcionId, periodo: '2026-09', resultado: 'no_pude', razon: 'Se cayó el portal del SENIAT' });
    expect(error).toBeNull();

    // Y ahora la hoja falla. La marca sigue donde tiene que estar.
    const cuenta = credenciales(v('GOOGLE_CREDENCIALES'));
    await expect(escribirFilas('documento-que-no-existe', 'RAZONES!A1', [['x']], cuenta)).rejects.toThrow();

    const { data } = await comoServicio().from('marca').select('razon').eq('funcion_id', funcionId);
    expect(data?.map((m) => m.razon)).toEqual(['Se cayó el portal del SENIAT']);
  });

  it('la siguiente proyeccion arrastra la razon que no llego, porque se regenera entera', async () => {
    const servicio = comoServicio();

    // Una segunda razon, como si la primera nunca hubiera llegado a la hoja.
    await servicio
      .from('marca')
      .insert({ funcion_id: funcionId, periodo: '2026-10', resultado: 'no_pude', razon: 'Michell no pasó el cálculo' });

    const { data: marcas } = await servicio.from('marca').select('funcion_id, periodo, resultado, razon, marcada_en').not('razon', 'is', null);

    const razones = razonesParaElDocumento(
      (marcas ?? []).map((m) => ({
        funcionId: m.funcion_id,
        periodo: m.periodo,
        resultado: m.resultado as 'hecho' | 'no_pude',
        razon: m.razon ?? undefined,
        en: m.marcada_en,
      })),
      [],
    );

    // Las dos, no solo la ultima: no hay estado de "pendiente de sincronizar".
    expect(razones.map((r) => r.razon).sort()).toEqual(['Michell no pasó el cálculo', 'Se cayó el portal del SENIAT']);
  });
});
