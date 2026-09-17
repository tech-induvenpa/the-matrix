'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

// El boton sabe si su formulario se esta enviando. Sin esto, un clic en una
// accion de servidor no da ninguna señal hasta que la pagina se refresca, y la
// gente vuelve a pulsar pensando que no funciono. Deshabilitado mientras
// espera, ademas, no hay segundo envio.
export function Enviar({
  children,
  style,
  enviando = 'Guardando…',
}: {
  children: ReactNode;
  style?: CSSProperties;
  enviando?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      style={{
        ...style,
        gap: 8,
        opacity: pending ? 0.75 : 1,
        cursor: pending ? 'progress' : style?.cursor,
      }}
    >
      {pending && <span className="girando" aria-hidden />}
      {pending ? enviando : children}
    </button>
  );
}
