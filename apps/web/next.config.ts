import type { NextConfig } from 'next';

const config: NextConfig = {
  // El dominio se compila desde el monorepo, no desde node_modules.
  transpilePackages: ['@matriz/dominio'],
  // Un build de verificacion escribe en otro directorio: si usa el mismo que
  // `next dev`, le deja los chunks colgando al servidor que este corriendo.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default config;
