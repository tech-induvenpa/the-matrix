import type { Fecha } from './calendario';

// Las cerradas del mes (CEB-220): lo que una persona marco en el mes en curso,
// ocurrencias e imprevistos juntos. Se abren para leer cada razon en su
// contexto; despues de la marca no se comenta. Un imprevisto borrado no cuenta
// en nada, tampoco aqui.

export type Cerrada<O, I> = { tipo: 'ocurrencia'; tarea: O } | { tipo: 'imprevisto'; tarea: I };

// El mes va del dia 1 a hoy, en UTC como el resto de la aplicacion. Lo mas
// reciente arriba, como en el perfil de la tarea.
export function cerradasDelMes<O extends { marcadaEn: string }, I extends { marcadaEn: string | null; borradoEn: string | null }>(
  ocurrencias: readonly O[],
  imprevistos: readonly I[],
  hoy: Fecha,
): Cerrada<O, I>[] {
  const primero = `${hoy.slice(0, 7)}-01`;
  const esteMes = (instante: string | null) => instante !== null && instante.slice(0, 10) >= primero && instante.slice(0, 10) <= hoy;

  const cuando = (c: Cerrada<O, I>) => c.tarea.marcadaEn ?? '';
  return [
    ...ocurrencias.filter((o) => esteMes(o.marcadaEn)).map((tarea): Cerrada<O, I> => ({ tipo: 'ocurrencia', tarea })),
    ...imprevistos.filter((i) => !i.borradoEn && esteMes(i.marcadaEn)).map((tarea): Cerrada<O, I> => ({ tipo: 'imprevisto', tarea })),
  ].sort((a, b) => cuando(b).localeCompare(cuando(a)));
}
