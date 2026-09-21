import { describe, expect, it } from 'vitest';
import { ADMITE_DIA_TOPE, SE_AGENDA, tipoSegun } from '../src/clases';

const no = { quedaTerminado: false, seAtiendeMientrasHaya: false, nombraUnAmbito: false };

describe('de que clase es una funcion', () => {
  it('lo que se entrega y queda terminado es un entregable', () => {
    expect(tipoSegun({ ...no, quedaTerminado: true })).toBe('entregable');
  });

  it('lo que se atiende mientras haya es un flujo', () => {
    expect(tipoSegun({ ...no, seAtiendeMientrasHaya: true })).toBe('flujo');
  });

  it('lo que nombra un ambito del cargo es un area', () => {
    expect(tipoSegun({ ...no, nombraUnAmbito: true })).toBe('area');
  });

  it('lo que no es nada de eso es holgura: el resto del cargo', () => {
    expect(tipoSegun(no)).toBe('holgura');
  });

  // El caso que hacia dudar a todo el mundo: cuentas por pagar se entrega cada
  // mes Y tiene volumen constante. Entregar gana, porque hay un "ya esta".
  it('entregar gana sobre atender: una funcion con las dos cosas es entregable', () => {
    expect(tipoSegun({ ...no, quedaTerminado: true, seAtiendeMientrasHaya: true })).toBe('entregable');
  });

  it('solo el entregable se agenda; lo demas no vence nunca', () => {
    expect(SE_AGENDA).toEqual({ entregable: true, flujo: false, area: false, holgura: false });
  });

  it('el dia tope solo tiene sentido en lo mensual', () => {
    expect(ADMITE_DIA_TOPE('mensual')).toBe(true);
    expect(ADMITE_DIA_TOPE('semanal')).toBe(false);
  });
});
