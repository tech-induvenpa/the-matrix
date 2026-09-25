// Un enlace de entrada para alguien, sin pasar por el correo:
//
//   pnpm enlace douglenis
//   env $(grep -v "^#" apps/web/.env.produccion.local | xargs) pnpm enlace douglenis
//
// Sirve para probar lo que ve una persona concreta, y para entrar cuando el
// correo se demora. Busca por trozo de nombre o de correo, y si hay mas de uno
// no elige: los enseña.
//
// Ojo: gotrue guarda un solo token por usuario, asi que generar este enlace
// invalida el que esa persona tuviera sin usar en su bandeja. No lo pidas
// mientras alguien esta entrando.
import { createClient } from '@supabase/supabase-js';
import { entorno } from './entorno.mts';

const buscado = process.argv[2]?.toLowerCase();
if (!buscado) {
  console.log('\n  pnpm enlace <nombre o correo>\n');
  process.exit(1);
}

const url = entorno('NEXT_PUBLIC_SUPABASE_URL');
const supabase = createClient(url, entorno('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

// El destino sale de donde apunta la base: con las credenciales de produccion
// el enlace es de produccion, sin una variable mas que recordar.
const local = url.includes('127.0.0.1') || url.includes('localhost');
const sitio =
  process.env.SITIO ??
  (local ? 'http://localhost:3000' : 'https://the-matrix-production-dkqpmp.laravel.cloud');

const { data: empleados, error } = await supabase.from('empleado').select('nombre_bloque, correo, auth_user_id');
if (error) throw error;

let hallados = empleados.filter(
  (e) => e.nombre_bloque?.toLowerCase().includes(buscado) || e.correo?.toLowerCase().includes(buscado),
);

// El administrador no es un empleado: existe solo como usuario de auth, y es a
// quien mas falta le hace un enlace a mano. Si no esta entre la gente, se busca
// donde si esta.
if (!hallados.length) {
  const { data: cuentas } = await supabase.auth.admin.listUsers();
  hallados = cuentas.users
    .filter((u) => u.email?.toLowerCase().includes(buscado))
    .map((u) => ({ nombre_bloque: u.email!, correo: u.email!, auth_user_id: u.id }));
}

if (!hallados.length) {
  console.log(`\nNadie se llama "${buscado}". Hay: ${empleados.map((e) => e.nombre_bloque).join(', ')}\n`);
  process.exit(1);
}

if (hallados.length > 1) {
  console.log(`\n"${buscado}" son varios:`);
  for (const e of hallados) console.log(`    · ${e.nombre_bloque} — ${e.correo}`);
  console.log('');
  process.exit(1);
}

const [quien] = hallados;
if (!quien.auth_user_id) {
  console.log(`\n${quien.nombre_bloque} todavia no tiene acceso. Corre: pnpm acceso --confirmar\n`);
  process.exit(1);
}

const { data, error: sinEnlace } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: quien.correo!,
});
if (sinEnlace) throw sinEnlace;

console.log(`\n${quien.nombre_bloque} · ${quien.correo}\n`);
console.log(`${sitio}/auth/confirmar?token_hash=${data.properties.hashed_token}&type=magiclink\n`);
console.log('Vence en una hora y se usa una sola vez.\n');
