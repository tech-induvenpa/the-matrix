import { clienteDelServidor } from '@/lib/supabase/servidor';
import { headers } from 'next/headers';

// Sin contraseñas: llega un enlace al correo. Quien no este dado de alta no
// recibe nada, porque el registro publico esta deshabilitado (ADR 0004).
async function pedirEnlace(formulario: FormData) {
  'use server';

  const correo = String(formulario.get('correo') ?? '').trim();
  if (!correo) return;

  const supabase = await clienteDelServidor();
  const origen = (await headers()).get('origin') ?? '';

  await supabase.auth.signInWithOtp({
    email: correo,
    options: { shouldCreateUser: false, emailRedirectTo: `${origen}/auth/confirmar` },
  });
}

export default function Entrar() {
  return (
    <main style={{ maxWidth: 380, margin: '0 auto', padding: '64px 20px' }}>
      <h1 style={{ fontSize: 26, letterSpacing: '-0.02em' }}>Tu semana, en un enlace</h1>
      <p style={{ color: 'var(--gris)', fontSize: 15, lineHeight: 1.5 }}>
        Escribe tu correo y te mandamos el acceso. No hay contraseña que recordar.
      </p>
      <form action={pedirEnlace} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          id="correo"
          name="correo"
          type="email"
          required
          placeholder="tu@correo.com"
          style={{
            height: 48,
            borderRadius: 999,
            border: '1px solid rgba(26,23,19,0.18)',
            padding: '0 18px',
            fontSize: 15,
          }}
        />
        <button
          type="submit"
          style={{
            height: 48,
            borderRadius: 999,
            background: 'var(--tinta)',
            color: '#fff',
            fontWeight: 700,
          }}
        >
          Mándame el enlace
        </button>
      </form>
      <p style={{ color: 'var(--gris)', fontSize: 13, marginTop: 16 }}>
        Si tu correo está dado de alta, el enlace llega en un minuto.
      </p>
    </main>
  );
}
