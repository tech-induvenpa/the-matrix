// La urgencia no la escribe nadie: sale de los dias habiles que faltan para
// vencer (ADR 0003). Esta tabla es configuracion de pantalla, lo unico que
// tiene sentido recalibrar: dias de margen que admite cada nivel.
const MARGEN = [29, 21, 17, 14, 9, 7, 4, 2, 1, 0];

export function urgenciaDe(diasHabilesRestantes: number): number {
  for (let urgencia = 9; urgencia >= 0; urgencia--) {
    const margen = MARGEN[urgencia];
    if (margen !== undefined && diasHabilesRestantes <= margen) return urgencia;
  }
  return 0;
}

export function emojiDe(diasHabilesRestantes: number): string {
  if (diasHabilesRestantes <= 1) return '🔥';
  if (diasHabilesRestantes <= 3) return '💣';
  if (diasHabilesRestantes <= 7) return '🧠';
  return '🍃';
}
