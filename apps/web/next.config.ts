import type { NextConfig } from 'next';

const config: NextConfig = {
  // El dominio se compila desde el monorepo, no desde node_modules.
  transpilePackages: ['@matriz/dominio'],
};

export default config;
