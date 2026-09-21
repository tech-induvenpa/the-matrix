import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { interpretar } from '@matriz/dominio';
import { tipificadorRemoto } from '../../scripts/tipificador.mts';
import { comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

// INV-9 · El agente propone y nada mas: escribe tipo_generado y
// dia_tope_generado, y ningun texto suyo llega al empleado. Corre contra el
// modelo de verdad, no contra un doble: un doble probaria mi prompt, no el
// invariante.
const env = readFileSync(new URL('../../apps/web/.env.local', import.meta.url), 'utf8');
const v = (c: string) => env.split('\n').find((l) => l.startsWith(`${c}=`))!.slice(c.length + 1).trim();

const agente = tipificadorRemoto({ clave: v('AGENTE_API_KEY'), modelo: v('AGENTE_MODELO'), url: v('AGENTE_URL') });
const TIPOS = ['entregable', 'flujo', 'area', 'holgura'];

describe('INV-9: el agente propone, y solo escribe lo suyo', () => {
  let funcionId: string;

  beforeAll(async () => {
    await vaciar();
    const empleadoId = await sembrarEmpleado('ANA', 'ana@prueba.test');

    funcionId = await sembrarFuncion(empleadoId, {
      hash_identidad: 'agente-1',
      texto: 'CIERRE FINANCIERO AUTO BENGALA (ANTES DEL 3 DE CADA MES)',
      ponderacion: 25,
      importancia: 9,
      periodicidad: 'mensual',
    });
  });

  it('lo que devuelve el modelo real pasa por el mismo esquema cerrado', async () => {
    const veredicto = interpretar(await agente.proponer('CIERRE FINANCIERO AUTO BENGALA (ANTES DEL 3 DE CADA MES)'));

    expect(veredicto.acepta).toBe(true);
    if (veredicto.acepta) {
      expect(TIPOS).toContain(veredicto.tipo);
      expect(veredicto.diaTope).toBe(3);
    }
  });

  it('al aplicarla solo cambian las columnas _generado', async () => {
    const servicio = comoServicio();
    const antes = (await servicio.from('funcion').select('*').eq('id', funcionId).single()).data!;

    const veredicto = interpretar(await agente.proponer(antes.texto as string));
    if (!veredicto.acepta) throw new Error('el modelo no aceptó una función clarísima');

    await servicio
      .from('funcion')
      .update({ tipo_generado: veredicto.tipo, dia_tope_generado: veredicto.diaTope ?? null })
      .eq('id', funcionId);

    const despues = (await servicio.from('funcion').select('*').eq('id', funcionId).single()).data!;

    const cambiadas = Object.keys(despues).filter((c) => JSON.stringify(despues[c]) !== JSON.stringify(antes[c]));
    expect(cambiadas.sort()).toEqual(['dia_tope_generado', 'tipo_generado']);
    expect(despues.tipo_corregido).toBeNull();
  });

  it('la base rechaza cualquier tipo fuera del conjunto, venga de donde venga', async () => {
    const { error } = await comoServicio().from('funcion').update({ tipo_generado: 'lo que sea' }).eq('id', funcionId);

    expect(error).not.toBeNull();
  });

  it('el agente no produce texto: solo un tipo del conjunto y un numero', async () => {
    const propuesta = await agente.proponer('URGENTES (SOLICITAR REINTEGROS, REVISAR CORREOS ETC)');

    expect(TIPOS).toContain(propuesta.tipo);
    expect(propuesta.diaTope === undefined || typeof propuesta.diaTope === 'number').toBe(true);
    expect(Object.keys(propuesta).sort()).toEqual(['confianza', 'diaTope', 'tipo']);
  });
});
