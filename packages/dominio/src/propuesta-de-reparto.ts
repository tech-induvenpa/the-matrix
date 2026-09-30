import { PISO_DE_COTIDIANIDAD, reescalarA, sumaDe, type Peso } from './reparto-de-un-cargo';

// Una sola regla para todo lo que mueve un peso -- dar de alta, cambiar,
// archivar, eliminar o traspasar una funcion (ADR 0014): lo que entra o sale se
// compensa en proporcion entre todo el resto, cotidianidad incluida. Si esa
// cuenta deja la cotidianidad bajo el piso, queda en el piso y lo que falta
// sale de las funciones. El sistema lo propone y el administrador lo aprueba:
// por eso devuelve tambien lo necesario para contar la cuenta.

export type CambioDeReparto = { entra: Peso } | { cambia: Peso } | { sale: string };

export type PropuestaDeReparto = {
  despues: Peso[];
  cotidianidad: { antes: number; despues: number };
  // La cotidianidad que habria dado la proporcion, sin redondear: si quedo
  // bajo el piso, es la que la confirmacion explica.
  proporcional: number;
  enElPiso: boolean;
};

const COTIDIANIDAD = 'cotidianidad';

export function proponerReparto(funciones: readonly Peso[], cambio: CambioDeReparto): PropuestaDeReparto {
  const antes = 100 - sumaDe(funciones);
  const movida = 'sale' in cambio ? null : 'entra' in cambio ? cambio.entra : cambio.cambia;
  const fuera = 'sale' in cambio ? cambio.sale : movida!.funcionId;

  const resto = funciones.filter((p) => p.funcionId !== fuera);
  const objetivo = 100 - (movida?.ponderacion ?? 0);

  // La cotidianidad entra a la proporcion como una parte mas.
  const partes = [...resto, { funcionId: COTIDIANIDAD, ponderacion: Math.max(antes, 0) }];
  const total = sumaDe(partes);
  const proporcional = total === 0 ? objetivo : (Math.max(antes, 0) * objetivo) / total;

  let despues: Peso[];
  let cotidianidad: number;
  const enElPiso = proporcional < PISO_DE_COTIDIANIDAD;
  if (enElPiso) {
    cotidianidad = PISO_DE_COTIDIANIDAD;
    despues = reescalarA(resto, objetivo - PISO_DE_COTIDIANIDAD);
  } else {
    const escaladas = reescalarA(partes, objetivo);
    cotidianidad = escaladas.find((p) => p.funcionId === COTIDIANIDAD)!.ponderacion;
    despues = escaladas.filter((p) => p.funcionId !== COTIDIANIDAD);
  }

  // En su lugar: la funcion que cambia no se mueve al final de la lista.
  const orden = new Map(funciones.map((p, i) => [p.funcionId, i]));
  const conLaMovida = movida ? [...despues, { ...movida }] : despues;
  conLaMovida.sort((a, b) => (orden.get(a.funcionId) ?? Infinity) - (orden.get(b.funcionId) ?? Infinity));

  return { despues: conLaMovida, cotidianidad: { antes, despues: cotidianidad }, proporcional, enElPiso };
}
