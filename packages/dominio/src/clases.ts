import type { TipoDeFuncion } from './reparto';

// La frontera entre flujo y area es discutible, y sin un criterio escrito en un
// solo lugar cada funcion dudosa se vuelve una conversacion. Ese lugar era el
// prompt del agente (ADR 0002); ahora es esto, que la pantalla lee en voz alta
// cada vez que alguien crea una funcion (ADR 0006).
//
// No se elige entre cuatro sustantivos: se responden tres preguntas sobre el
// trabajo, y el tipo sale de ahi.
export type Respuestas = {
  // "¿Se entrega algo concreto y queda terminado?"
  quedaTerminado: boolean;
  // "¿Se atiende mientras haya, sin que exista un 'ya esta'?"
  seAtiendeMientrasHaya: boolean;
  // "¿Nombra un ambito del cargo mas que un acto?"
  nombraUnAmbito: boolean;
};

// El orden importa y no es arbitrario: lo que se entrega gana sobre lo que se
// atiende, porque una funcion con entrega y volumen es un entregable con
// trabajo detras, no un flujo. La holgura es el resto: lo que no se entrega, no
// se atiende y no nombra nada es lo que se guarda para lo no planificado.
export function tipoSegun(r: Respuestas): TipoDeFuncion {
  if (r.quedaTerminado) return 'entregable';
  if (r.seAtiendeMientrasHaya) return 'flujo';
  if (r.nombraUnAmbito) return 'area';
  return 'holgura';
}

// Solo lo que se agenda tiene fecha: un area y una holgura no vencen nunca, asi
// que pedir su dia tope seria pedir un dato que no significa nada.
export const SE_AGENDA: Record<TipoDeFuncion, boolean> = {
  entregable: true,
  flujo: false,
  area: false,
  holgura: false,
};

// Una funcion mensual puede tener dia tope; las demas lo toman de su propio
// periodo. Si JFS escribe los dos, la pantalla lo avisa y no elige por ella.
export const ADMITE_DIA_TOPE = (periodicidad: string) => periodicidad === 'mensual';
