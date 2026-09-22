'use client';

import { usePathname } from 'next/navigation';
import { Ir } from './ir';

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
    // Una banda de verdad, de borde a borde. Sin ella el menu quedaba flotando
    // sobre el blanco, mas adentro que el contenido y sin nada que lo sujetara.
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--panel)',
        borderBottom: '1px solid rgba(26,23,19,0.08)',
      }}
    >
      <nav
        style={{
          display: 'flex',
          gap: 18,
          alignItems: 'center',
          flexWrap: 'wrap',
          maxWidth: 1440,
          margin: '0 auto',
          padding: '12px 34px',
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
            <Ir key={e.href} href={e.href} style={estilo}>
              {e.texto}
            </Ir>
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
    </div>
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
