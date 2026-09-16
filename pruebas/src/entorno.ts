import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Las claves del Supabase local no se escriben en ningun sitio: se le preguntan
// al CLI cada vez. Asi nadie confunde las de local con las del proyecto real.
function delCli(): Record<string, string> {
  const salida = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
    cwd: new URL('../..', import.meta.url).pathname,
    encoding: 'utf8',
  });

  return Object.fromEntries(
    salida
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => {
        const [clave, ...resto] = l.split('=');
        return [clave!.trim(), resto.join('=').trim().replace(/^"|"$/g, '')];
      }),
  );
}

const env = delCli();
export const URL_LOCAL = env.API_URL ?? 'http://127.0.0.1:54321';
const ANON = env.ANON_KEY!;
const SERVICIO = env.SERVICE_ROLE_KEY!;

// El cliente que se salta la seguridad por fila. Solo para montar el escenario
// y para comprobar desde fuera lo que deberia haber quedado.
export const comoServicio = (): SupabaseClient =>
  createClient(URL_LOCAL, SERVICIO, { auth: { persistSession: false } });

// Un empleado de verdad, con su sesion: es lo unico que prueba la seguridad por
// fila. Un cliente de servicio disfrazado no probaria nada.
export async function comoEmpleado(correo: string): Promise<SupabaseClient> {
  const servicio = comoServicio();
  const clave = `prueba-${correo}`;

  const { data: creado, error } = await servicio.auth.admin.createUser({
    email: correo,
    password: clave,
    email_confirm: true,
  });
  if (error && !error.message.includes('already been registered')) throw error;

  // vaciar() limpia las tablas pero no los usuarios de auth, asi que en la
  // segunda corrida createUser no devuelve nada: hay que ir a buscarlo. Sin
  // esto el empleado se queda sin auth_user_id y no ve ni lo suyo.
  let usuario = creado?.user ?? null;
  if (!usuario) {
    const { data } = await servicio.auth.admin.listUsers();
    usuario = data.users.find((u) => u.email === correo) ?? null;
  }
  if (!usuario) throw new Error(`No se pudo resolver el usuario de ${correo}`);

  // El vinculo se rehace siempre: la fila del empleado es nueva en cada prueba.
  const { error: sinVinculo } = await servicio
    .from('empleado')
    .update({ auth_user_id: usuario.id })
    .eq('correo', correo);
  if (sinVinculo) throw sinVinculo;

  const cliente = createClient(URL_LOCAL, ANON, { auth: { persistSession: false } });
  const { error: fallo } = await cliente.auth.signInWithPassword({ email: correo, password: clave });
  if (fallo) throw fallo;

  return cliente;
}

// Cada prueba monta su escenario desde cero: nada de datos heredados.
export async function vaciar(): Promise<void> {
  const servicio = comoServicio();
  for (const tabla of ['evento_flujo', 'marca', 'funcion', 'empleado']) {
    await servicio.from(tabla).delete().not('id', 'is', null);
  }
}

export async function sembrarEmpleado(nombreBloque: string, correo: string): Promise<string> {
  const servicio = comoServicio();
  const { data, error } = await servicio
    .from('empleado')
    .insert({ nombre_bloque: nombreBloque, correo })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}
