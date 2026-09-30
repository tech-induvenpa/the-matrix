// El empleado nunca ve un monto. Ve como se reparte su cargo entre lo que
// hace: la ponderacion en porcentaje, sin moneda ni sueldo.
export type TipoDeFuncion = 'entregable' | 'flujo' | 'area';

export type FuncionDelMes = {
  funcionId: string;
  nombre: string;
  // La cotidianidad es una porcion del cargo, no un tipo de funcion (ADR 0014).
  tipo: TipoDeFuncion | 'cotidianidad';
  ponderacion: number;
};

export type Tajada = FuncionDelMes & { porcentaje: number };

// Cada funcion vale su ponderacion, y lo que no pesan las funciones es la
// cotidianidad, que completa el cien (ADR 0014). Sin funciones, todo el cargo
// es cotidianidad.
// ponytail: si las funciones suman mas de cien -- datos de antes del piso --,
// no hay cotidianidad y el total pasa de cien; la base ya no lo permite.
export function repartoDelMes(funciones: readonly FuncionDelMes[]): Tajada[] {
  const suma = funciones.reduce((t, f) => t + f.ponderacion, 0);
  const cotidianidad: FuncionDelMes[] =
    suma < 100 ? [{ funcionId: 'cotidianidad', nombre: 'Cotidianidad', tipo: 'cotidianidad', ponderacion: 100 - suma }] : [];

  return [...funciones, ...cotidianidad]
    .sort((a, b) => b.ponderacion - a.ponderacion || a.nombre.localeCompare(b.nombre))
    .map((f) => ({ ...f, porcentaje: f.ponderacion }));
}
