import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Estas pruebas hablan con Postgres, con Google y con el modelo: los
    // tiempos son de red, no de calculo.
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Comparten una sola base: en paralelo se pisarian los datos.
    fileParallelism: false,
  },
});
