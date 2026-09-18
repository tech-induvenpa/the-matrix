// El banner siempre dice algo, pero el color se reserva para lo excepcional:
// si todo grita, el naranja deja de significar nada.
export type Registro = 'alerta' | 'tranquilo';

export type ClaveDeAviso =
  | 'sin_cobertura'
  | 'dias_no_habiles'
  | 'vence_pronto'
  | 'flujo_atrasado'
  | 'recordatorio'
  | 'avance';

export type Aviso = { clave: ClaveDeAviso; registro: Registro };

export type EstadoDeLaSemana = {
  sinCobertura: boolean;
  noHabilesEnLaVentana: number;
  venceHoyOManana: boolean;
  diasDelFlujoMasAtrasado: number;
  hayAtrasoSinConstancia: boolean;
};

// ponytail: un umbral, en un solo sitio. Se afina con uso real.
export const UMBRAL_DE_ATRASO = 3;

export function avisoDe(estado: EstadoDeLaSemana, umbral = UMBRAL_DE_ATRASO): Aviso {
  if (estado.sinCobertura) return { clave: 'sin_cobertura', registro: 'alerta' };
  if (estado.noHabilesEnLaVentana > 0) return { clave: 'dias_no_habiles', registro: 'alerta' };
  if (estado.venceHoyOManana) return { clave: 'vence_pronto', registro: 'alerta' };
  if (estado.diasDelFlujoMasAtrasado >= umbral) return { clave: 'flujo_atrasado', registro: 'alerta' };
  if (estado.hayAtrasoSinConstancia) return { clave: 'recordatorio', registro: 'tranquilo' };
  return { clave: 'avance', registro: 'tranquilo' };
}

// Veinte tramos fijos, sea cual sea el total: es progreso, no un contador.
export const TRAMOS = 20;

export function tramosLlenos(cerradas: number, asignadas: number, tramos = TRAMOS): number {
  if (asignadas <= 0) return 0;
  return Math.round((cerradas / asignadas) * tramos);
}

// Mientras queda mucho por hacer, un muro de logros estorba.
export function mostrarResueltas(atendidas: number, meta: number): boolean {
  return meta > 0 && atendidas * 2 >= meta;
}

// Como se siente el mes avanzando. La pantalla pone las palabras; aqui solo
// esta el corte de cada etapa.
export type Etapa = 'arranque' | 'hielo' | 'ritmo' | 'mitad' | 'casi' | 'completo';

export function etapaDe(cerradas: number, asignadas: number): Etapa {
  // Cero de cero daria 100%: celebrar ahi es celebrar la nada.
  if (asignadas <= 0 || cerradas <= 0) return 'arranque';

  const parte = cerradas / asignadas;
  if (parte >= 1) return 'completo';
  if (parte >= 0.8) return 'casi';
  if (parte >= 0.5) return 'mitad';
  if (parte >= 1 / 3) return 'ritmo';
  return 'hielo';
}
