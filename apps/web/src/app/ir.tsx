'use client';

import Link, { useLinkStatus } from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

// Los formularios avisan de que estan trabajando desde el principio; los
// enlaces no, y estas pantallas van al servidor en cada clic. Sin esto, pulsar
// "Qué se arrastra" parece no hacer nada hasta que la pagina cambia sola.
//
// useLinkStatus solo funciona dentro del propio Link, asi que el indicador
// tiene que ser un componente aparte.
function Girando() {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return <span className="girando" style={{ marginLeft: 6, width: 11, height: 11, borderWidth: 2 }} aria-hidden />;
}

export function Ir({
  href,
  style,
  title,
  children,
}: {
  href: string;
  style?: CSSProperties;
  title?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} style={{ display: 'inline-flex', alignItems: 'center', ...style }} title={title}>
      {children}
      <Girando />
    </Link>
  );
}
