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

// El mismo boton, redondo y sin texto: en el listado del mes las filas son
// compactas y no cabe "¡Hecho!".
export function Redondo({
  children,
  titulo,
  color,
  tamano = 30,
}: {
  children: ReactNode;
  titulo: string;
  color: string;
  tamano?: number;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      title={titulo}
      aria-label={titulo}
      disabled={pending}
      aria-busy={pending}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: tamano,
        height: tamano,
        borderRadius: 999,
        background: '#ffffff',
        color,
        flexShrink: 0,
        cursor: pending ? 'progress' : 'pointer',
        opacity: pending ? 0.75 : 1,
      }}
    >
      {pending ? <span className="girando" aria-hidden /> : children}
    </button>
  );
}
