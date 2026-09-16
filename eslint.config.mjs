import js from '@eslint/js';
import ts from 'typescript-eslint';

// La frontera que sostiene la arquitectura (ADR 0005): el dominio no conoce
// infraestructura, y los componentes no tocan adaptadores.
export default ts.config(
  { ignores: ['**/node_modules/**', '**/.next*/**', '**/dist/**', '**/next-env.d.ts'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['packages/dominio/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['next', 'next/*', 'react', 'react-*', '@supabase/*', '@matriz/web', '@/*'],
              message: 'El dominio no conoce infraestructura ni interfaz (ADR 0005).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/componentes/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/supabase/*'],
              message: 'Los componentes no importan adaptadores: eso lo arman las rutas de servidor.',
            },
          ],
        },
      ],
    },
  },
);
