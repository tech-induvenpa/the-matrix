import type { FilaDelDocumento } from './documento';
import { normalizar } from './documento';

// El documento esta maquetado para que lo lea una persona: bloques con celdas
// combinadas, encabezados repetidos y filas de totales. Toda esa fragilidad
// vive aqui y no pasa de este archivo (ADR 0001).
export type Cuadricula = readonly (readonly string[])[];

export type Lectura = {
  filas: FilaDelDocumento[];
  bloquesDesconocidos: string[];
  bloquesAmbiguos: string[];
};

const INDICADORES = 'INDICADORES';
const COLUMNAS = { ponderacion: 'PONDERACION', importancia: 'IMPORTANCIA', periodicidad: 'URGENTE' };

const esEncabezado = (fila: readonly string[]) => normalizar(fila[0] ?? '') === INDICADORES;

// Un nombre combinado llega como una sola celda con texto en toda la fila.
const esNombreDeBloque = (fila: readonly string[]) =>
  (fila[0] ?? '').trim() !== '' && fila.slice(1).every((c) => (c ?? '').trim() === '');

const numero = (celda: string | undefined) => {
  const limpio = (celda ?? '').trim();
  return limpio === '' ? undefined : Number(limpio);
};

export function leerBloques(cuadricula: Cuadricula, empleadosPorBloque: Record<string, string>): Lectura {
  // Un nombre repetido no se puede resolver: no se sabe de cual Maria es la
  // fila. Ante la duda no se importa nada de ese bloque.
  const nombres = cuadricula.filter(esNombreDeBloque).map((f) => normalizar(f[0] ?? ''));
  const bloquesAmbiguos = [...new Set(nombres.filter((n, i) => nombres.indexOf(n) !== i))];

  const filas: FilaDelDocumento[] = [];
  const desconocidos: string[] = [];

  let bloque: string | undefined;
  let columnas: Record<string, number> = {};

  for (let i = 0; i < cuadricula.length; i++) {
    const fila = cuadricula[i]!;

    if (esEncabezado(fila)) {
      // El nombre es la fila combinada inmediatamente encima del encabezado;
      // un encabezado sin nombre encima es el bloque plantilla.
      const encima = cuadricula[i - 1];
      bloque = encima && esNombreDeBloque(encima) ? normalizar(encima[0] ?? '') : undefined;
      columnas = Object.fromEntries(
        Object.entries(COLUMNAS).map(([clave, titulo]) => [
          clave,
          fila.findIndex((c) => normalizar(c ?? '') === titulo),
        ]),
      );
      continue;
    }

    // Una fila de datos es cualquiera con texto en INDICADORES. La de totales
    // lo deja vacio, asi que se salta sola.
    const nombre = normalizar(fila[0] ?? '');
    if (!nombre || !bloque || esNombreDeBloque(fila)) continue;

    const empleadoId = empleadosPorBloque[bloque];
    if (!empleadoId) {
      if (!desconocidos.includes(bloque)) desconocidos.push(bloque);
      continue;
    }
    if (bloquesAmbiguos.includes(bloque)) continue;

    filas.push({
      empleadoId,
      nombre: (fila[0] ?? '').trim(),
      ponderacion: numero(fila[columnas.ponderacion ?? -1]),
      importancia: numero(fila[columnas.importancia ?? -1]),
      periodicidad: (fila[columnas.periodicidad ?? -1] ?? '').trim() || undefined,
    });
  }

  return { filas, bloquesDesconocidos: desconocidos, bloquesAmbiguos };
}
