import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { Avisos } from './avisos';

export const metadata: Metadata = {
  title: 'Matriz JFS',
  description: 'Lo que tienes que hacer esta semana.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <nav
          style={{
            display: 'flex',
            gap: 18,
            alignItems: 'center',
            maxWidth: 1180,
            margin: '0 auto',
            padding: '18px 16px 0',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          <Link href="/" style={{ color: 'var(--tinta)', textDecoration: 'none' }}>
            Esta semana
          </Link>
          <Link href="/mes" style={{ color: 'var(--gris)', textDecoration: 'none' }}>
            El mes
          </Link>
        </nav>
        {children}
        <Avisos />
      </body>
    </html>
  );
}
