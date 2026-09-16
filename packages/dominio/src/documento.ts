// El documento es un formulario que se llena a mano: llega con espacios de
// mas, tildes puestas a veces y mayusculas a capricho. Todo eso se normaliza
// antes de decidir si dos filas son la misma funcion.
export type FilaDelDocumento = {
  empleadoId: string;
  nombre: string;
  periodicidad?: string;
  ponderacion?: number;
  importancia?: number;
  diaTope?: number;
};

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .toUpperCase();
}

// ponytail: FNV-1a de 32 bits, sin dependencias. Techo: colisiones a partir
// de decenas de miles de funciones. Si eso pasa, sha256 y a otra cosa.
function huella(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// La identidad sale del id del empleado y del texto, no de la posicion en la
// hoja ni del nombre de la persona: insertar una fila arriba no reescribe el
// historial de nadie, y dos Marias distintas nunca se mezclan.
export function identidadDe(fila: Pick<FilaDelDocumento, 'empleadoId' | 'nombre'>): string {
  return huella(`${fila.empleadoId}|${normalizar(fila.nombre)}`);
}

export type FuncionExistente = {
  identidad: string;
  periodicidad?: string;
  ponderacion?: number;
  importancia?: number;
  diaTope?: number;
};

export type Cambio = { identidad: string; fila: FilaDelDocumento; antes: FuncionExistente };

export type Reconciliacion = {
  altas: FilaDelDocumento[];
  cambios: Cambio[];
  bajas: string[];
};

const MISMOS_DATOS = (a: FuncionExistente, b: FilaDelDocumento) =>
  a.periodicidad === b.periodicidad &&
  a.ponderacion === b.ponderacion &&
  a.importancia === b.importancia &&
  a.diaTope === b.diaTope;

export function reconciliar(
  existentes: readonly FuncionExistente[],
  leidas: readonly FilaDelDocumento[],
): Reconciliacion {
  const porIdentidad = new Map(existentes.map((f) => [f.identidad, f]));
  const vistas = new Set<string>();

  const altas: FilaDelDocumento[] = [];
  const cambios: Cambio[] = [];

  for (const fila of leidas) {
    const identidad = identidadDe(fila);
    vistas.add(identidad);
    const antes = porIdentidad.get(identidad);
    if (!antes) altas.push(fila);
    else if (!MISMOS_DATOS(antes, fila)) cambios.push({ identidad, fila, antes });
  }

  // Lo que desaparecio de la hoja se archiva, nunca se borra: su historial de
  // marcas sigue siendo cierto.
  const bajas = existentes.map((f) => f.identidad).filter((id) => !vistas.has(id));

  return { altas, cambios, bajas };
}
