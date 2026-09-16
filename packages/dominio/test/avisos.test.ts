import { describe, expect, it } from 'vitest';
import { avisoDe, mostrarResueltas, tramosLlenos } from '../src/avisos';

const nada = {
  sinCobertura: false,
  noHabilesEnLaVentana: 0,
  venceHoyOManana: false,
  diasDelFlujoMasAtrasado: 0,
  hayAtrasoSinConstancia: false,
};

describe('el banner dice lo mas relevante', () => {
  it('elige la primera condicion que se cumple, en orden', () => {
    // Sin calendario cargado las fechas de abajo pueden estar corridas: eso
    // gana a cualquier otra cosa, porque pone en duda todo lo demas.
    expect(avisoDe({ ...nada, sinCobertura: true, noHabilesEnLaVentana: 1 }).clave).toBe('sin_cobertura');
    expect(avisoDe({ ...nada, noHabilesEnLaVentana: 1, venceHoyOManana: true }).clave).toBe('dias_no_habiles');
    expect(avisoDe({ ...nada, venceHoyOManana: true, diasDelFlujoMasAtrasado: 9 }).clave).toBe('vence_pronto');
    expect(avisoDe({ ...nada, diasDelFlujoMasAtrasado: 4, hayAtrasoSinConstancia: true }).clave).toBe('flujo_atrasado');
    expect(avisoDe({ ...nada, hayAtrasoSinConstancia: true }).clave).toBe('recordatorio');
    expect(avisoDe(nada).clave).toBe('avance');
  });

  it('las tres primeras van con color y las dos ultimas sin el', () => {
    expect(avisoDe({ ...nada, venceHoyOManana: true }).registro).toBe('alerta');
    expect(avisoDe({ ...nada, hayAtrasoSinConstancia: true }).registro).toBe('tranquilo');
    expect(avisoDe(nada).registro).toBe('tranquilo');
  });

  it('un flujo atrasado no llega al banner hasta pasar el umbral', () => {
    expect(avisoDe({ ...nada, diasDelFlujoMasAtrasado: 2 }).clave).toBe('avance');
  });
});

describe('el arco', () => {
  it('siempre tiene veinte tramos, se llenen o no', () => {
    expect(tramosLlenos(0, 15)).toBe(0);
    expect(tramosLlenos(13, 15)).toBe(17);
    expect(tramosLlenos(15, 15)).toBe(20);
  });

  it('sin nada asignado no se divide por cero', () => {
    expect(tramosLlenos(0, 0)).toBe(0);
  });
});

describe('lo ya resuelto', () => {
  it('no se muestra hasta atender la mitad de lo que vencia', () => {
    expect(mostrarResueltas(1, 4)).toBe(false);
    expect(mostrarResueltas(2, 4)).toBe(true);
    expect(mostrarResueltas(0, 0)).toBe(false);
  });
});
