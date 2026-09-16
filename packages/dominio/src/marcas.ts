// Una marca cierra una ocurrencia, y una ocurrencia es (funcion, periodo).
// Da igual si fue "hecho" o "no pude": las dos liberan el lugar en el plan.
export type Marca = { funcionId: string; periodo: string };

const llave = (m: Marca) => `${m.funcionId}|${m.periodo}`;

export function pendientes<T extends Marca>(ocurrencias: readonly T[], marcas: readonly Marca[]): T[] {
  const cerradas = new Set(marcas.map(llave));
  return ocurrencias.filter((o) => !cerradas.has(llave(o)));
}
