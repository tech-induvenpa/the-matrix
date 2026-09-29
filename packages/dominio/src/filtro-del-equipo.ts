import { normalizar } from './documento';

// El filtro del equipo (CEB-184): de quien se muestra que, por empresa, sede y
// texto. Todas las pantallas filtran con esto y ninguna repite sus dos reglas:
// sin sede es todas las sedes de su empresa, y el texto no distingue mayusculas
// ni tildes.

type Nombrado = { id: string; nombre: string };

export type Filtrable = { nombre: string; empresa: Nombrado | null; sede: Nombrado | null };
export type FiltroDelEquipo = { empresa?: string; sede?: string; texto?: string };

// Las filas de una persona que se muestran, o null si la persona no entra.
// Si el texto coincide con la persona (nombre, empresa o sede), van todas sus
// filas; si solo coincide con algunas filas, van esas.
export function delFiltro<F>(
  persona: Filtrable,
  filas: F[],
  textoDe: (fila: F) => string,
  filtro: FiltroDelEquipo,
): F[] | null {
  if (filtro.empresa && persona.empresa?.id !== filtro.empresa) return null;
  if (filtro.sede && persona.sede && persona.sede.id !== filtro.sede) return null;

  const buscado = normalizar(filtro.texto ?? '');
  if (!buscado) return filas;

  const contiene = (t: string) => normalizar(t).includes(buscado);
  if ([persona.nombre, persona.empresa?.nombre, persona.sede?.nombre].some((t) => t && contiene(t))) return filas;

  const coinciden = filas.filter((f) => contiene(textoDe(f)));
  return coinciden.length > 0 ? coinciden : null;
}

export type Opcion = { valor: string; etiqueta: string };

// Un solo desplegable para empresa y sede: cada empresa, y debajo sus sedes.
// Asi no se puede elegir una sede de otra empresa, ni hace falta JavaScript
// para que el segundo desplegable siga al primero.
export function opcionesDePertenencia(empresas: Nombrado[], sedes: (Nombrado & { empresa: string })[]): Opcion[] {
  return empresas.flatMap((e) => [
    { valor: e.id, etiqueta: e.nombre },
    ...sedes
      .filter((s) => s.empresa === e.id)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((s) => ({ valor: `${e.id}/${s.id}`, etiqueta: `${e.nombre} · ${s.nombre}` })),
  ]);
}

export function leerPertenencia(valor: string | undefined): { empresa?: string; sede?: string } {
  if (!valor) return {};
  const [empresa, sede] = valor.split('/');
  return sede ? { empresa, sede } : { empresa };
}
