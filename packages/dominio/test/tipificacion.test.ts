import { describe, expect, it } from 'vitest';
import { interpretar } from '../src/tipificacion';

describe('lo que propone el agente', () => {
  it('se acepta cuando viene completo y coherente', () => {
    expect(interpretar({ tipo: 'entregable', diaTope: 15, confianza: 0.9 })).toEqual({
      acepta: true,
      tipo: 'entregable',
      diaTope: 15,
    });
  });

  it('se descarta si inventa un tipo que no existe', () => {
    expect(interpretar({ tipo: 'urgente', confianza: 0.99 })).toEqual({
      acepta: false,
      motivo: 'tipo_desconocido',
    });
  });

  it('se descarta si el dia tope no cabe en un mes', () => {
    expect(interpretar({ tipo: 'entregable', diaTope: 47, confianza: 0.9 })).toEqual({
      acepta: false,
      motivo: 'dia_tope_imposible',
    });
  });

  it('se descarta cuando el propio agente duda: eso lo revisa una persona', () => {
    expect(interpretar({ tipo: 'flujo', confianza: 0.3 })).toEqual({
      acepta: false,
      motivo: 'poca_confianza',
    });
  });

  it('un area o una holgura no llevan dia tope: no se agendan', () => {
    expect(interpretar({ tipo: 'area', diaTope: 10, confianza: 0.9 })).toEqual({
      acepta: true,
      tipo: 'area',
      diaTope: undefined,
    });
  });
});
