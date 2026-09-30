import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Para las pruebas que pasan por una accion del servidor (INV-32).
  resolve: { alias: { '@': new URL('../apps/web/src', import.meta.url).pathname } },
  test: {
    // Estas pruebas hablan con Postgres, con Google y con el modelo: los
    // tiempos son de red, no de calculo.
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Comparten una sola base: en paralelo se pisarian los datos.
    fileParallelism: false,
    // El reloj de la base, fijo a mitad de mes en todas (ADR 0017).
    setupFiles: ['./src/reloj.ts'],
  },
});
