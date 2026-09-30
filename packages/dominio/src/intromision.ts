import type { Fecha } from './calendario';

// La intromision es el vinculo que el empleado declara entre un incumplimiento
// de lo previsto y los imprevistos que lo causaron. Solo vale con imprevistos
// pedidos antes del vencimiento de esa ocurrencia -- en un flujo, desde que
// estuvo al dia por ultima vez --: un imprevisto viejo no puede excusar
// cualquier cosa (regla 3 de CEB-146).
export type ImprevistoVinculable = { id: string; pedidoEn: string; borradoEn: string | null };

export type Limite =
  | { vence: Fecha } // una ocurrencia
  | { alDiaDesde: string | null }; // un flujo: el ultimo "al dia", o nunca

export function vinculables<T extends ImprevistoVinculable>(imprevistos: readonly T[], limite: Limite): T[] {
  const cabe =
    'vence' in limite
      ? (i: T) => i.pedidoEn.slice(0, 10) <= limite.vence
      : (i: T) => limite.alDiaDesde === null || i.pedidoEn >= limite.alDiaDesde;

  return imprevistos.filter((i) => !i.borradoEn && cabe(i));
}
