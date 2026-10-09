'use client';

import type { ReactNode } from 'react';
import { avisar, type Aviso } from './avisos';

// Envuelve un formulario de accion de servidor para que, cuando la respuesta
// llegue, salga el aviso. Se despacha antes de que la pagina se redibuje con
// los datos nuevos, asi que da igual que la tarjeta desaparezca despues.
export function Accion({
  accion,
  children,
  style,
  className,
}: {
  accion: (formulario: FormData) => Promise<Aviso | undefined>;
  children: ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <form
      className={className}
      style={style}
      action={async (formulario) => {
        avisar(await accion(formulario));
      }}
    >
      {children}
    </form>
  );
}
