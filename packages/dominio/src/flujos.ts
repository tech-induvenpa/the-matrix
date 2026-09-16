// Un flujo no se marca: tiene estado, y el vigente es el ultimo evento.
// El estado normal es callado, asi que un flujo sin eventos esta al dia.
export type Estado = 'al_dia' | 'atrasado';

export type EventoFlujo = {
  funcionId: string;
  estado: Estado;
  razon?: string;
  en: string;
};

export function estadosVigentes(eventos: readonly EventoFlujo[]): EventoFlujo[] {
  const vigente = new Map<string, EventoFlujo>();
  for (const e of eventos) {
    const actual = vigente.get(e.funcionId);
    if (!actual || e.en > actual.en) vigente.set(e.funcionId, e);
  }
  return [...vigente.values()];
}
