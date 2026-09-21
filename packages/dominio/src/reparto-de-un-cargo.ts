// El reparto: las funciones de una persona con sus ponderaciones, tomadas como
// un todo que suma cien. Nadie cambia el peso de una funcion suelta -- se
// redistribuye el cien de alguien (ADR 0008).

export type Peso = { funcionId: string; ponderacion: number };

export type Veredicto =
  | { publicable: true }
  | { publicable: false; motivo: 'no_suma_cien'; suma: number; falta: number }
  | { publicable: false; motivo: 'peso_imposible' }
  | { publicable: false; motivo: 'cargo_vacio' };

export const sumaDe = (pesos: readonly Peso[]) => pesos.reduce((t, p) => t + p.ponderacion, 0);

// Publicar es lo que hace vigente un reparto. Guardar no: quien reparte
// diecisiete funciones necesita poder dejarlo a medias e irse a almorzar, y si
// la pantalla no dejara guardar sin cuadrar, la aritmetica se haria en Excel.
export function sePuedePublicar(pesos: readonly Peso[]): Veredicto {
  if (pesos.length === 0) return { publicable: false, motivo: 'cargo_vacio' };

  if (pesos.some((p) => !Number.isInteger(p.ponderacion) || p.ponderacion < 0 || p.ponderacion > 100))
    return { publicable: false, motivo: 'peso_imposible' };

  const suma = sumaDe(pesos);
  if (suma !== 100) return { publicable: false, motivo: 'no_suma_cien', suma, falta: 100 - suma };

  return { publicable: true };
}

// Cuando una funcion se va del cargo, las demas no cambian de valor: cambia el
// total. Reescalar conserva cada proporcion, que es lo que el administrador
// decidio, en vez de pedirle que reconstruya a mano una aritmetica que no
// eligio (ADR 0007).
//
// El redondeo se cobra en la funcion que mas pesa: repartir el sobrante entre
// todas movería pesos que nadie toco, y en la mas grande un punto se nota
// menos que en una de dos.
export function reescalarACien(pesos: readonly Peso[]): Peso[] {
  const suma = sumaDe(pesos);
  if (suma === 0 || suma === 100) return pesos.map((p) => ({ ...p }));

  const escalados = pesos.map((p) => ({ ...p, ponderacion: Math.round((p.ponderacion * 100) / suma) }));

  const sobra = 100 - sumaDe(escalados);
  if (sobra !== 0) {
    const mayor = escalados.reduce((a, b) => (b.ponderacion > a.ponderacion ? b : a));
    mayor.ponderacion += sobra;
  }

  return escalados;
}
