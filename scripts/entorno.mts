import { readFileSync } from 'node:fs';

// Manda lo que venga en el proceso, y si no, el archivo. Asi lo de siempre es
// local --que es donde uno se equivoca-- y apuntar a produccion es un gesto
// deliberado, escrito en la misma linea del comando:
//
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm razones
export function entorno(clave: string): string {
  const delProceso = process.env[clave];
  if (delProceso) return delProceso;

  const secretos = readFileSync(new URL('../apps/web/.env.local', import.meta.url), 'utf8');
  const linea = secretos.split('\n').find((l) => l.startsWith(`${clave}=`));
  if (!linea) throw new Error(`Falta ${clave}: ni en el proceso ni en apps/web/.env.local`);

  return linea.slice(clave.length + 1).trim();
}
