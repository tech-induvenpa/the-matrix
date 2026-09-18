import { clienteDelServidor } from '@/lib/supabase/servidor';
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

// Detras del proxy de Cloud, request.nextUrl.origin es la direccion interna del
// contenedor: el enlace del correo canjeaba bien la sesion y despues mandaba a
// localhost. Un Location relativo lo resuelve el navegador contra la URL que
// pidio, que es siempre la buena, sin configurar nada del proxy.
const seguir = (a: string) => new NextResponse(null, { status: 307, headers: { Location: a } });

// Donde aterriza el enlace del correo: canjea el token por sesion y sigue.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await clienteDelServidor();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return seguir('/');
  }

  return seguir('/entrar');
}
