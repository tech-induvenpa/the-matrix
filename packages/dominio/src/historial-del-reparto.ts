// El historial del reparto (ADR 0017): cada cambio publicado de las
// ponderaciones de una persona queda guardado con quien, cuando, que
// movimiento y los pesos antes y despues. La base los guarda en el mismo acto
// que publica; aqui se arman para leerlos parte por parte.

export type Movimiento = 'alta' | 'cambio' | 'archivo' | 'eliminacion' | 'traspaso' | 'cotidianidad';

// Un peso como lo guarda la base: la cotidianidad no es una funcion y va sin id.
export type PesoDeUnaParte = { funcionId: string | null; parte: string; ponderacion: number };

export type ParteDelHistorial = {
  funcionId: string | null;
  parte: string;
  // La que entra no tenia peso antes; la que sale no lo tiene despues.
  antes: number | null;
  despues: number | null;
  cambio: boolean;
};

// Primero las que quedan, en el orden de despues; luego las que salieron; la
// cotidianidad, siempre al final.
export function parteAParte(antes: readonly PesoDeUnaParte[], despues: readonly PesoDeUnaParte[]): ParteDelHistorial[] {
  const funciones = (pesos: readonly PesoDeUnaParte[]) => pesos.filter((p) => p.funcionId !== null);
  const cotidianidad = (pesos: readonly PesoDeUnaParte[]) => pesos.find((p) => p.funcionId === null)?.ponderacion ?? null;
  const pesoAntes = (id: string | null) => antes.find((p) => p.funcionId === id)?.ponderacion ?? null;

  const quedan = funciones(despues).map((p) => ({ funcionId: p.funcionId, parte: p.parte, antes: pesoAntes(p.funcionId), despues: p.ponderacion }));
  const salen = funciones(antes)
    .filter((p) => !despues.some((d) => d.funcionId === p.funcionId))
    .map((p) => ({ funcionId: p.funcionId, parte: p.parte, antes: p.ponderacion, despues: null }));
  const resto = { funcionId: null, parte: 'Cotidianidad', antes: cotidianidad(antes), despues: cotidianidad(despues) };

  return [...quedan, ...salen, resto].map((p) => ({ ...p, cambio: p.antes !== p.despues }));
}
