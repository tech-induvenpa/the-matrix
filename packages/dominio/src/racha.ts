import type { Fecha } from './calendario';

// Cuantos dias habiles seguidos, contando hacia atras desde el ultimo, quedaron
// con todo lo que vencia cerrado. Un dia sin vencimientos no suma ni rompe:
// no hubo nada que cerrar, y castigar por eso seria castigar al calendario.
export type DiaDeTrabajo = { fecha: Fecha; total: number; cerradas: number };

export function diasSeguidosCerrando(dias: readonly DiaDeTrabajo[]): number {
  const ordenados = [...dias].sort((a, b) => b.fecha.localeCompare(a.fecha));

  let seguidos = 0;
  for (const dia of ordenados) {
    if (dia.total === 0) continue;
    if (dia.cerradas < dia.total) break;
    seguidos++;
  }

  return seguidos;
}
