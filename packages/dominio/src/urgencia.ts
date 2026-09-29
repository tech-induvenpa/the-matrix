// La urgencia no la escribe nadie: sale de los dias habiles que faltan para
// vencer (ADR 0003). Esta tabla es configuracion de pantalla, lo unico que
// tiene sentido recalibrar: dias de margen que admite cada nivel. La recorren
// en los dos sentidos urgenciaDe (dias -> urgencia) y el imprevisto que elige
// su vencimiento (urgencia -> dias, ADR 0013).
export const MARGEN = [29, 21, 17, 14, 9, 7, 4, 2, 1, 0] as const;

export function urgenciaDe(diasHabilesRestantes: number): number {
  for (let urgencia = 9; urgencia >= 0; urgencia--) {
    const margen = MARGEN[urgencia];
    if (margen !== undefined && diasHabilesRestantes <= margen) return urgencia;
  }
  return 0;
}

// Una sola escala en toda la pantalla: el emoji sale de la urgencia, no de los
// dias, para que una tarea y un imprevisto con el mismo numero se vean igual.
export function emojiDe(urgencia: number): string {
  if (urgencia >= 8) return '🔥';
  if (urgencia >= 6) return '💣';
  if (urgencia >= 4) return '🧠';
  return '🍃';
}
