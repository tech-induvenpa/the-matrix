// La aplicacion solo escribe una pestana del documento, y solo esto: lo que
// el empleado escribio con sus palabras. Ningun numero calculado vuelve a la
// hoja; si volviera, el documento dejaria de ser el formulario de entrada.
export type MarcaConRazon = {
  funcionId: string;
  periodo: string;
  resultado: 'hecho' | 'no_pude';
  razon?: string;
  en: string;
};

export type EventoConRazon = {
  funcionId: string;
  estado: 'al_dia' | 'atrasado';
  razon?: string;
  en: string;
};

export type RazonEnElDocumento = {
  funcionId: string;
  periodo: string;
  razon: string;
  en: string;
};

// Un flujo no tiene periodo: se atrasa un dia concreto, no un tramo.
export function razonesParaElDocumento(
  marcas: readonly MarcaConRazon[],
  eventos: readonly EventoConRazon[],
): RazonEnElDocumento[] {
  const deMarcas = marcas
    .filter((m) => m.razon)
    .map((m) => ({ funcionId: m.funcionId, periodo: m.periodo, razon: m.razon!, en: m.en.slice(0, 10) }));

  const deFlujos = eventos
    .filter((e) => e.razon)
    .map((e) => ({ funcionId: e.funcionId, periodo: '', razon: e.razon!, en: e.en.slice(0, 10) }));

  return [...deMarcas, ...deFlujos].sort((a, b) => b.en.localeCompare(a.en));
}

// El puerto: el dominio no sabe que del otro lado hay una hoja de calculo.
export type LibretaDeRazones = {
  escribir(razones: readonly RazonEnElDocumento[]): Promise<void>;
};
