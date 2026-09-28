// El bono: la parte variable de lo que gana alguien, la que el cumplimiento
// mueve y la ponderacion reparte (ADR 0010). Es el unico monto que el sistema
// conoce; el sueldo base no existe aqui. Siempre en dolares.

// Un mes, 'YYYY-MM'. Se comparan como texto, igual que las fechas.
export type Mes = string;
export type CambioDeBono = { rigeDesde: Mes; monto: number };

// Un cambio rige desde un mes y se mantiene hasta el siguiente. Antes del
// primero no hay bono, que no es lo mismo que un bono de cero.
export function bonoDelMes(historial: readonly CambioDeBono[], mes: Mes): number | null {
  let vigente: CambioDeBono | null = null;
  for (const c of historial) {
    if (c.rigeDesde <= mes && (!vigente || c.rigeDesde > vigente.rigeDesde)) vigente = c;
  }
  return vigente?.monto ?? null;
}

const aCentavos = (d: number) => Math.round(d * 100);

// Cuanto de su bono vale cada tajada del reparto. Se trabaja en centavos para
// no arrastrar decimales, y la ultima carga el ajuste para que la suma sea el
// bono exacto, igual que el reparto carga el redondeo del cien.
export function enDolares<T extends { porcentaje: number }>(tajadas: readonly T[], bono: number): (T & { dolares: number })[] {
  const total = aCentavos(bono);
  const centavos = tajadas.map((t) => Math.round((total * t.porcentaje) / 100));
  const sobra = centavos.reduce((a, b) => a + b, 0) - total;
  if (centavos.length) centavos[centavos.length - 1]! -= sobra;
  return tajadas.map((t, i) => ({ ...t, dolares: centavos[i]! / 100 }));
}

// El peso no cumplido de una fila de la descarga, en dolares.
export const montoNoCumplido = (pesoNoCumplido: number, bono: number): number =>
  Math.round(pesoNoCumplido * bono) / 100;
