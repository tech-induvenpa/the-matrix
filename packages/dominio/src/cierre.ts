// El cierre nunca senala a la persona: agrupa por funcion y muestra las razones
// tal como se escribieron. Agrupar por causa pediria un modelo de lenguaje.
export type PeriodoCumplido = {
  funcionId: string;
  periodo: string;
  cumplida: boolean;
  razon?: string;
};

export type FlujoDelMes = { funcionId: string; atrasosEnElMes: number; razones: string[] };

export type Patron = { funcionId: string; periodos: string[]; razones: string[] };

// Cuenta el "no pude" y tambien lo que vencio sin marcar: si solo contara el
// primero, callarse saldria mas barato que explicar.
const ATRASOS_QUE_HACEN_PATRON = 2;

export function patronesDelMes(
  historial: readonly PeriodoCumplido[],
  flujos: readonly FlujoDelMes[],
): Patron[] {
  const porFuncion = new Map<string, PeriodoCumplido[]>();
  for (const p of historial) {
    porFuncion.set(p.funcionId, [...(porFuncion.get(p.funcionId) ?? []), p]);
  }

  const patrones: Patron[] = [];

  for (const [funcionId, periodos] of porFuncion) {
    const ordenados = [...periodos].sort((a, b) => a.periodo.localeCompare(b.periodo));
    for (let i = 0; i + 1 < ordenados.length; i++) {
      const primero = ordenados[i]!;
      const segundo = ordenados[i + 1]!;
      if (!primero.cumplida && !segundo.cumplida) {
        patrones.push({
          funcionId,
          periodos: [primero.periodo, segundo.periodo],
          // La misma razon dos veces no dice mas que una vez.
          razones: [...new Set([primero.razon, segundo.razon].filter((r): r is string => Boolean(r)))],
        });
        break;
      }
    }
  }

  for (const f of flujos) {
    if (f.atrasosEnElMes >= ATRASOS_QUE_HACEN_PATRON) {
      patrones.push({ funcionId: f.funcionId, periodos: [], razones: [...new Set(f.razones)] });
    }
  }

  return patrones;
}

// Si no hay patrones, ese lugar lo ocupa un logro.
export function rachaMasLarga(periodos: readonly { periodo: string; cumplida: boolean }[]): number {
  let mejor = 0;
  let actual = 0;
  for (const p of [...periodos].sort((a, b) => a.periodo.localeCompare(b.periodo))) {
    actual = p.cumplida ? actual + 1 : 0;
    mejor = Math.max(mejor, actual);
  }
  return mejor;
}
