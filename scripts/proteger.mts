// Rangos protegidos del documento (CEB-116, INV-12):
//
//   pnpm proteger              -> dice que protegeria, no toca nada
//   pnpm proteger --confirmar  -> las crea
//
// La regla es una: cada superficie tiene un solo dueño de escritura. Las hojas
// de funciones las escribe JFS y la aplicacion solo lee; la pestaña de razones
// la escribe la aplicacion y lo que alguien ponga ahi a mano se pierde en la
// siguiente regeneracion. Los rangos protegidos hacen cumplir eso de verdad,
// en vez de fiarlo a que el codigo se porte bien.
import { readFileSync } from 'node:fs';
import { credenciales, hojas, protegerHoja } from '../apps/web/src/lib/hoja.ts';

const confirmar = process.argv.includes('--confirmar');
const RAZONES = 'RAZONES';

function entorno(clave: string): string {
  const secretos = readFileSync(new URL('../apps/web/.env.local', import.meta.url), 'utf8');
  const linea = secretos.split('\n').find((l) => l.startsWith(`${clave}=`));
  if (!linea) throw new Error(`Falta ${clave} en apps/web/.env.local`);
  return linea.slice(clave.length + 1).trim();
}

const documentoId = entorno('DOCUMENTO_ID');
const dueno = entorno('DUENO_DEL_DOCUMENTO');
const cuenta = credenciales(entorno('GOOGLE_CREDENCIALES'));

const todas = await hojas(documentoId, cuenta);

console.log(`\nDocumento ${documentoId}`);
console.log(`  la aplicación es ${cuenta.client_email}`);
console.log(`  el dueño es ${dueno}\n`);

for (const hoja of todas) {
  const esDeLaAplicacion = hoja.titulo === RAZONES;
  const editores = esDeLaAplicacion ? [cuenta.client_email] : [dueno];
  const quien = esDeLaAplicacion ? 'solo la aplicación' : 'solo el dueño (la aplicación queda fuera)';

  if (hoja.protecciones > 0) {
    console.log(`  · ${hoja.titulo.padEnd(16)} ya tiene ${hoja.protecciones} protección(es), no se toca`);
    continue;
  }

  console.log(`  ${confirmar ? '✓' : '·'} ${hoja.titulo.padEnd(16)} → ${quien}`);
  if (confirmar) {
    await protegerHoja(
      documentoId,
      hoja.id,
      esDeLaAplicacion ? 'Proyección del sistema: se regenera entera' : 'Formulario de JFS: la aplicación solo lee',
      editores,
      cuenta,
    );
  }
}

if (!confirmar) console.log('\nNada se protegió. Repite con --confirmar.\n');
else console.log('\nListo.\n');
