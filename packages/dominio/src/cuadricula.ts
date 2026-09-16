import type { FilaDelDocumento } from './documento';
import { normalizar } from './documento';

// El documento esta maquetado para que lo lea una persona: una columna vacia a
// la izquierda, bloques con celdas combinadas, encabezados repetidos, etiquetas
// sueltas a la derecha del nombre y filas de totales. Toda esa fragilidad vive
// aqui y no pasa de este archivo (ADR 0001).
export type Cuadricula = readonly (readonly string[])[];

export type Lectura = {
  filas: FilaDelDocumento[];
  bloquesDesconocidos: string[];
  bloquesAmbiguos: string[];
};

// Ni una sola posicion fija: todo se ubica por el texto del encabezado, porque
// el ancho de los bloques cambia dentro del mismo documento.
const TITULOS = {
  indicador: 'INDICADORES',
  ponderacion: 'PONDERACION',
  importancia: 'IMPORTANTE',
  periodicidad: 'URGENTE',
} as const;

type Columnas = { indicador: number; ponderacion: number; importancia: number; periodicidad: number };

const dondeDice = (fila: readonly string[], titulo: string) =>
  fila.findIndex((c) => normalizar(c ?? '') === titulo);

function columnasDe(fila: readonly string[]): Columnas | undefined {
  const indicador = dondeDice(fila, TITULOS.indicador);
  if (indicador < 0) return undefined;
  return {
    indicador,
    ponderacion: dondeDice(fila, TITULOS.ponderacion),
    importancia: dondeDice(fila, TITULOS.importancia),
    periodicidad: dondeDice(fila, TITULOS.periodicidad),
  };
}

const celda = (fila: readonly string[] | undefined, columna: number) =>
  columna < 0 ? '' : (fila?.[columna] ?? '').trim();

const numero = (texto: string) => (texto === '' ? undefined : Number(texto.replace(/[^\d.-]/g, '')));

// El nombre es la fila justo encima del encabezado. Lleva etiquetas sueltas a
// su derecha, asi que no sirve pedir que el resto este vacio; lo que nunca
// tiene es ponderacion, y eso lo distingue de una fila de datos.
function nombreEncima(fila: readonly string[] | undefined, columnas: Columnas): string | undefined {
  const texto = celda(fila, columnas.indicador);
  if (!texto || celda(fila, columnas.ponderacion)) return undefined;
  return normalizar(texto);
}

export function leerBloques(cuadricula: Cuadricula, empleadosPorBloque: Record<string, string>): Lectura {
  // Un nombre repetido no se puede resolver: no se sabe de cual Maria es la
  // fila. Ante la duda no se importa nada de ese bloque.
  const nombres = cuadricula
    .map((fila, i) => {
      const columnas = columnasDe(fila);
      return columnas ? nombreEncima(cuadricula[i - 1], columnas) : undefined;
    })
    .filter((n): n is string => Boolean(n));
  const bloquesAmbiguos = [...new Set(nombres.filter((n, i) => nombres.indexOf(n) !== i))];

  const filas: FilaDelDocumento[] = [];
  const desconocidos: string[] = [];

  let bloque: string | undefined;
  let columnas: Columnas | undefined;

  for (let i = 0; i < cuadricula.length; i++) {
    const fila = cuadricula[i]!;

    const encabezado = columnasDe(fila);
    if (encabezado) {
      // Un encabezado sin nombre encima es el bloque plantilla: se descarta.
      columnas = encabezado;
      bloque = nombreEncima(cuadricula[i - 1], encabezado);
      continue;
    }

    if (!columnas) continue;

    // Una fila de datos es cualquiera con texto en INDICADORES. La de totales
    // lo deja vacio, asi que se salta sola.
    const texto = celda(fila, columnas.indicador);
    if (!texto || !bloque) continue;

    // Si debajo viene un encabezado, esta fila es el nombre del bloque que
    // empieza, no una funcion del que termina. Pasa en cada bloque pegado.
    if (columnasDe(cuadricula[i + 1] ?? [])) continue;

    const empleadoId = empleadosPorBloque[bloque];
    if (!empleadoId) {
      if (!desconocidos.includes(bloque)) desconocidos.push(bloque);
      continue;
    }
    if (bloquesAmbiguos.includes(bloque)) continue;

    filas.push({
      empleadoId,
      nombre: texto,
      ponderacion: numero(celda(fila, columnas.ponderacion)),
      importancia: numero(celda(fila, columnas.importancia)),
      periodicidad: celda(fila, columnas.periodicidad) || undefined,
    });
  }

  return { filas, bloquesDesconocidos: desconocidos, bloquesAmbiguos };
}
