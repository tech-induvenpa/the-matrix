// El empleado nunca ve un monto. Ve como se reparte su cargo entre lo que
// hace: la ponderacion en porcentaje, sin moneda ni sueldo.
export type TipoDeFuncion = 'entregable' | 'flujo' | 'area' | 'holgura';

export type FuncionDelMes = {
  funcionId: string;
  nombre: string;
  tipo: TipoDeFuncion;
  ponderacion: number;
};

export type Tajada = FuncionDelMes & { porcentaje: number };

// El ultimo carga el redondeo para que la suma de exactamente cien: un
// reparto que suma 99,7 se lee como un error del sistema.
export function repartoDelMes(funciones: readonly FuncionDelMes[]): Tajada[] {
  const total = funciones.reduce((t, f) => t + f.ponderacion, 0);
  if (total <= 0) return [];

  const ordenadas = [...funciones].sort(
    (a, b) => b.ponderacion - a.ponderacion || a.nombre.localeCompare(b.nombre),
  );

  const tajadas = ordenadas.map((f) => ({
    ...f,
    porcentaje: Math.round((f.ponderacion / total) * 100),
  }));

  const ultima = tajadas[tajadas.length - 1]!;
  const sobra = tajadas.reduce((t, f) => t + f.porcentaje, 0) - 100;
  ultima.porcentaje -= sobra;

  return tajadas;
}
