import { afterAll } from 'vitest';
import { fijarReloj, RELOJ_DE_LAS_PRUEBAS } from './entorno';

// Antes de cada archivo, el reloj de la base a mitad del mes en curso; al
// terminar, vacio, como en produccion (ver RELOJ_DE_LAS_PRUEBAS).
await fijarReloj(RELOJ_DE_LAS_PRUEBAS);

afterAll(async () => {
  await fijarReloj(null);
});
