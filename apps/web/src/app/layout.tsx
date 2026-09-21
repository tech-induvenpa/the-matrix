import type { Metadata } from 'next';
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
        {children}
        <Avisos />
      </body>
    </html>
  );
}
