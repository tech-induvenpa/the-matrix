import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Refresca la sesion en cada navegacion y manda a /entrar a quien no la tenga.
type CookiesNuevas = { name: string; value: string; options: CookieOptions }[];

export async function middleware(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (nuevas: CookiesNuevas) => {
          nuevas.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          nuevas.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const ruta = request.nextUrl.pathname;
  const publica = ruta.startsWith('/entrar') || ruta.startsWith('/auth');

  if (!data.user && !publica) {
    // Una accion de formulario (un "no pude", un imprevisto) llega por fetch:
    // un 307 se seguiria solo y devolveria el HTML de /entrar, que el cliente
    // no sabe leer y muestra como "unexpected response". A una accion se le
    // contesta como contesta Next un redirect() dentro de ella, y el cliente
    // navega a /entrar. Pasa cuando la sesion vence con la pestaña abierta.
    if (request.method === 'POST' && request.headers.has('next-action')) {
      return new NextResponse(null, { status: 200, headers: { 'x-action-redirect': '/entrar;replace' } });
    }

    const destino = request.nextUrl.clone();
    destino.pathname = '/entrar';
    return NextResponse.redirect(destino);
  }

  return respuesta;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
