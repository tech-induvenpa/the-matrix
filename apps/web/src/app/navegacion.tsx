'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Cada rol tiene su menu y ninguno ve el del otro: al administrador, "Esta
// semana" y "El mes" lo mandaban de vuelta al panel, y al empleado no le
// existen estas pantallas.
export function Navegacion({
  entradas,
  salida,
}: {
  entradas: { href: string; texto: string; externo?: boolean }[];
  salida?: () => Promise<void>;
}) {
  const donde = usePathname();

  return (
    <nav
      style={{
        display: 'flex',
        gap: 18,
        alignItems: 'center',
        flexWrap: 'wrap',
        maxWidth: 1180,
        margin: '0 auto',
        padding: '18px 16px 0',
        fontSize: 15,
        fontWeight: 600,
      }}
    >
      {entradas.map((e) => {
        const aqui = donde === e.href;
        const estilo = { color: aqui ? 'var(--tinta)' : 'var(--gris)', textDecoration: 'none' };

        // La descarga no es una pantalla: es un archivo, y Link la trataria
        // como navegacion.
        return e.externo ? (
          <a key={e.href} href={e.href} style={estilo}>
            {e.texto}
          </a>
        ) : (
          <Link key={e.href} href={e.href} style={estilo}>
            {e.texto}
          </Link>
        );
      })}

      {salida && (
        <form action={salida} style={{ marginLeft: 'auto' }}>
          <button
            type="submit"
            style={{ background: 'none', border: 0, padding: 0, color: 'var(--gris)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
          >
            Salir
          </button>
        </form>
      )}
    </nav>
  );
}

export const DEL_EMPLEADO = [
  { href: '/', texto: 'Esta semana' },
  { href: '/mes', texto: 'El mes' },
];

export const DEL_ADMINISTRADOR = [
  { href: '/admin', texto: 'Tu gente' },
  { href: '/admin/reporte', texto: 'Qué se arrastra' },
  { href: '/admin/razones', texto: 'Qué dijeron' },
  { href: '/admin/calendario', texto: 'El calendario' },
  { href: '/admin/descarga', texto: 'Descargar el mes ↓', externo: true },
];
