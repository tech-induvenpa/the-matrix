// Rangos protegidos del documento (CEB-116, INV-12):
//
//   pnpm proteger              -> dice que protegeria, no toca nada
//   pnpm proteger --confirmar  -> protege lo que puede
//
// La regla es una: cada superficie tiene un solo dueño de escritura. Las hojas
// de funciones las escribe JFS y la aplicacion solo lee; la pestaña de razones
// la escribe la aplicacion y lo que alguien ponga ahi a mano se pierde en la
// siguiente regeneracion. Los rangos protegidos hacen cumplir eso de verdad,
// en vez de fiarlo a que el codigo se porte bien.
//
// Pero la mitad de esto NO puede hacerlo este comando, y esta bien que asi sea:
// Google responde "You can't remove yourself as an editor" cuando la cuenta de
// la aplicacion intenta crear una proteccion que la excluye. Si pudiera
// excluirse tambien podria incluirse, y entonces la proteccion no protegeria de
// nada. La barrera contra la aplicacion tiene que ponerla una persona.
import { credenciales, hojas, protegerHoja } from '../apps/web/src/lib/hoja.ts';
import { entorno } from './entorno.mts';

const confirmar = process.argv.includes('--confirmar');
const RAZONES = 'RAZONES';


const documentoId = entorno('DOCUMENTO_ID');
const dueno = entorno('DUENO_DEL_DOCUMENTO');
const cuenta = credenciales(entorno('GOOGLE_CREDENCIALES'));

const todas = await hojas(documentoId, cuenta);

console.log(`\nDocumento ${documentoId}`);
console.log(`  la aplicación es ${cuenta.client_email}`);
console.log(`  el dueño es ${dueno}\n`);

const aMano: string[] = [];

for (const hoja of todas) {
  if (hoja.protecciones > 0) {
    console.log(`  · ${hoja.titulo.padEnd(16)} ya tiene ${hoja.protecciones} protección(es), no se toca`);
    continue;
  }

  if (hoja.titulo !== RAZONES) {
    aMano.push(hoja.titulo);
    continue;
  }

  console.log(`  ${confirmar ? '✓' : '·'} ${hoja.titulo.padEnd(16)} → solo la aplicación`);
  if (confirmar) {
    await protegerHoja(
      documentoId,
      hoja.id,
      'Proyección del sistema: se regenera entera en cada marca',
      [cuenta.client_email],
      cuenta,
    );
  }
}

if (aMano.length) {
  console.log(`\n  Estas las tiene que proteger ${dueno}, a mano:`);
  for (const titulo of aMano) console.log(`    · ${titulo}`);
  console.log('\n  Datos → Proteger hojas y rangos → la hoja → "Restringir quién puede editar"');
  console.log('  → Personalizado → quitar el visto a la cuenta de la aplicación.');
  console.log('  La aplicación no puede excluirse a sí misma, y ese es justo el punto.');
}

if (!confirmar) console.log('\nNada se protegió. Repite con --confirmar.\n');
else console.log('\nListo.\n');
