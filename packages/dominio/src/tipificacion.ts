import type { TipoDeFuncion } from './reparto';

// El agente propone, no decide: lo que escribe se guarda aparte de lo que
// corrija una persona. Aqui solo se valida que lo propuesto sea posible.
export type Propuesta = { tipo: string; diaTope?: number; confianza: number };

export type Motivo = 'tipo_desconocido' | 'dia_tope_imposible' | 'poca_confianza';

export type Veredicto =
  | { acepta: true; tipo: TipoDeFuncion; diaTope: number | undefined }
  | { acepta: false; motivo: Motivo };

// El puerto: el dominio no sabe que hay un modelo de lenguaje al otro lado.
export type Tipificador = {
  proponer(texto: string): Promise<Propuesta>;
};

const TIPOS: readonly string[] = ['entregable', 'flujo', 'area', 'holgura'];
const SE_AGENDAN: readonly string[] = ['entregable', 'flujo'];

// Por debajo de esto no se guarda nada: una persona escribe el tipo a mano.
const CONFIANZA_MINIMA = 0.6;

export function interpretar(propuesta: Propuesta): Veredicto {
  if (!TIPOS.includes(propuesta.tipo)) return { acepta: false, motivo: 'tipo_desconocido' };
  if (propuesta.diaTope !== undefined && (propuesta.diaTope < 1 || propuesta.diaTope > 31))
    return { acepta: false, motivo: 'dia_tope_imposible' };
  if (propuesta.confianza < CONFIANZA_MINIMA) return { acepta: false, motivo: 'poca_confianza' };

  return {
    acepta: true,
    tipo: propuesta.tipo as TipoDeFuncion,
    diaTope: SE_AGENDAN.includes(propuesta.tipo) ? propuesta.diaTope : undefined,
  };
}
