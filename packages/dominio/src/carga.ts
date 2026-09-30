import type { Fecha } from './calendario';
import type { Resultado } from './imprevistos';

// Cuanto le cae a alguien para su tamano (CEB-223): sus imprevistos abiertos
// por cada 10% de su cotidianidad, que es por donde pesan (ADR 0014). Veinte
// abiertos con cotidianidad noventa son 2,2 por cada 10%; con diez, son veinte.
// Se parte en en plazo y vencidos: lo que aun se puede hacer y lo que ya se
// atraso. Un borrado no cuenta en ninguna cifra; un marcado ya no esta abierto.
export type Carga = { enPlazo: number; vencidos: number; total: number };

export function cargaDeImprevistos(
  imprevistos: readonly { vence: Fecha; resultado: Resultado | null; borradoEn: string | null }[],
  cotidianidad: number,
  hoy: Fecha,
): Carga {
  const abiertos = imprevistos.filter((i) => !i.resultado && !i.borradoEn);
  const vencidos = abiertos.filter((i) => hoy > i.vence).length;
  // La cotidianidad nunca baja del piso; el uno solo evita dividir por cero.
  const decenas = Math.max(cotidianidad, 1) / 10;
  return {
    enPlazo: (abiertos.length - vencidos) / decenas,
    vencidos: vencidos / decenas,
    total: abiertos.length / decenas,
  };
}
