// El reparto: las funciones de una persona con sus ponderaciones y su
// cotidianidad, tomadas como un todo que suma cien. Nadie cambia el peso de una
// funcion suelta -- se redistribuye el cien de alguien (ADR 0008). La
// cotidianidad no se guarda: es lo que queda, y nunca baja del piso (ADR 0014).

export type Peso = { funcionId: string; ponderacion: number };

export type Veredicto =
  | { publicable: true }
  | { publicable: false; motivo: 'bajo_el_piso'; suma: number; sobra: number }
  | { publicable: false; motivo: 'peso_imposible' };

// Todo imprevisto pesa por la cotidianidad de su empleado, asi que siempre
// tiene que haber algo: diez es la decision de negocio (ADR 0014).
export const PISO_DE_COTIDIANIDAD = 10;

export const sumaDe = (pesos: readonly Peso[]) => pesos.reduce((t, p) => t + p.ponderacion, 0);

export const cotidianidadDe = (pesos: readonly Peso[]) => 100 - sumaDe(pesos);

// Publicar es lo que hace vigente un reparto. Guardar no: quien reparte
// diecisiete funciones necesita poder dejarlo a medias e irse a almorzar, y si
// la pantalla no dejara guardar sin cuadrar, la aritmetica se haria en Excel.
// Un cargo sin funciones es todo cotidianidad, y eso tambien se publica.
export function sePuedePublicar(pesos: readonly Peso[]): Veredicto {
  if (pesos.some((p) => !Number.isInteger(p.ponderacion) || p.ponderacion < 0 || p.ponderacion > 100))
    return { publicable: false, motivo: 'peso_imposible' };

  const suma = sumaDe(pesos);
  const tope = 100 - PISO_DE_COTIDIANIDAD;
  if (suma > tope) return { publicable: false, motivo: 'bajo_el_piso', suma, sobra: suma - tope };

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
export const reescalarACien = (pesos: readonly Peso[]) => reescalarA(pesos, 100);

// Quien recibe una funcion tambien tiene que hacerle sitio. Cuanto sitio lo
// decide el administrador -- eso el sistema no lo puede calcular sin saber lo
// que gana esa persona --, pero repartir lo que queda entre sus demas
// funciones si es aritmetica: conservan sus proporciones dentro de lo que
// sobra.
export function reescalarA(pesos: readonly Peso[], objetivo: number): Peso[] {
  const suma = sumaDe(pesos);
  if (pesos.length === 0) return [];
  if (suma === 0 || suma === objetivo) return pesos.map((p) => ({ ...p }));

  const escalados = pesos.map((p) => ({ ...p, ponderacion: Math.round((p.ponderacion * objetivo) / suma) }));

  const sobra = objetivo - sumaDe(escalados);
  if (sobra !== 0) {
    const mayor = escalados.reduce((a, b) => (b.ponderacion > a.ponderacion ? b : a));
    mayor.ponderacion += sobra;
  }

  return escalados;
}
