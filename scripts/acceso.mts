// Dar acceso a los empleados que aun no lo tienen:
//
//   pnpm acceso            -> quien puede entrar y quien no
//   pnpm acceso --confirmar
//
// Un empleado sin auth_user_id existe en la base pero no ve nada: la seguridad
// por fila cuelga de ese vinculo (ADR 0004). Esto crea el usuario y lo ata.
// No hay contrasenas: se entra por el enlace del correo.
import { createClient } from '@supabase/supabase-js';
import { entorno } from './entorno.mts';

const confirmar = process.argv.includes('--confirmar');

const supabase = createClient(entorno('NEXT_PUBLIC_SUPABASE_URL'), entorno('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

const { data: empleados, error } = await supabase
  .from('empleado')
  .select('correo, auth_user_id')
  .is('auth_user_id', null)
  .order('correo');
if (error) throw error;

if (!empleados.length) {
  console.log('\nTodos los empleados pueden entrar.\n');
  process.exit(0);
}

console.log(`\n${empleados.length} empleados sin acceso:`);
for (const e of empleados) console.log(`    · ${e.correo}`);

if (!confirmar) {
  console.log('\nNada se guardó. Repite con --confirmar para darles acceso.\n');
  process.exit(0);
}

// createUser no devuelve nada si el usuario ya existia, asi que se busca. Sin
// esto el vinculo se queda sin hacer y el empleado sigue sin ver lo suyo.
const { data: yaHabia } = await supabase.auth.admin.listUsers();
const porCorreo = new Map(yaHabia.users.map((u) => [u.email, u.id]));

for (const { correo } of empleados) {
  let id = porCorreo.get(correo);

  if (!id) {
    const { data, error: fallo } = await supabase.auth.admin.createUser({ email: correo, email_confirm: true });
    if (fallo) throw fallo;
    id = data.user!.id;
  }

  const { error: sinVinculo } = await supabase.from('empleado').update({ auth_user_id: id }).eq('correo', correo);
  if (sinVinculo) throw sinVinculo;
  console.log(`    ✓ ${correo}`);
}

console.log(`\nListo: ${empleados.length} empleados pueden entrar.\n`);
