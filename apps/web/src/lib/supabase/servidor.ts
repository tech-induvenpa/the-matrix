import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookiesNuevas = { name: string; value: string; options: CookieOptions }[];
import { cookies } from 'next/headers';

// El cliente del servidor lleva la sesion del empleado en cookies, asi que cada
// consulta llega a Postgres con su identidad y la seguridad por fila aplica sola
// (ADR 0004, ADR 0005). La llave de servicio no se usa aqui.
export async function clienteDelServidor() {
  const almacen = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll: (nuevas: CookiesNuevas) => {
          try {
            nuevas.forEach(({ name, value, options }) => almacen.set(name, value, options));
          } catch {
            // Un Server Component no puede escribir cookies; el middleware ya
            // refresco la sesion, asi que aqui no hay nada que hacer.
          }
        },
      },
    },
  );
}
