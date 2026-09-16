import type { Calendario, Fecha } from './calendario';

// Todo lo que calcula el sistema depende de saber que dias se trabaja. Si la
// lista se acaba, el error no se ve: las fechas salen corridas y nadie se
// entera. Por eso se avisa con margen y, por debajo del horizonte, no se
// calcula nada.
export type EstadoDeCobertura = 'ok' | 'aviso_60' | 'aviso_30' | 'sin_cobertura';

// Un mes de dias habiles: lo que necesita el ciclo mas largo para calcular
// su proxima fecha. Por debajo de eso el sistema ya no sabe lo que dice.
export const HORIZONTE = 22;
const AVISO_CERCANO = 30;
const AVISO_TEMPRANO = 60;

export type Cobertura = {
  estado: EstadoDeCobertura;
  habilesRestantes: number;
  calculaHasta: Fecha;
};

export function coberturaDe(calendario: Calendario, hoy: Fecha, ultimoDiaCargado: Fecha): Cobertura {
  const habilesRestantes = calendario.habilesEntre(hoy, ultimoDiaCargado);
  const estado: EstadoDeCobertura =
    habilesRestantes < HORIZONTE
      ? 'sin_cobertura'
      : habilesRestantes <= AVISO_CERCANO
        ? 'aviso_30'
        : habilesRestantes <= AVISO_TEMPRANO
          ? 'aviso_60'
          : 'ok';

  return { estado, habilesRestantes, calculaHasta: ultimoDiaCargado };
}
