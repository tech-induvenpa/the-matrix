'use client';

import { useEffect, useState } from 'react';

// Los avisos viven aqui, en el layout, y no dentro de la tarjeta: al marcar,
// la tarjeta sale del plan y se lleva consigo cualquier cosa que cuelgue de
// ella. El formulario avisa por un evento del navegador y esto lo recoge.
export const CANAL = 'matriz:aviso';

export type Aviso = { mensaje: string; celebra: boolean };

const DURACION = 4500;

export function Avisos() {
  const [avisos, setAvisos] = useState<(Aviso & { id: number })[]>([]);

  useEffect(() => {
    const alRecibir = (evento: Event) => {
      const aviso = (evento as CustomEvent<Aviso>).detail;
      const id = Date.now() + Math.random();

      setAvisos((previos) => [...previos, { ...aviso, id }]);
      setTimeout(() => setAvisos((previos) => previos.filter((a) => a.id !== id)), DURACION);
    };

    window.addEventListener(CANAL, alRecibir);
    return () => window.removeEventListener(CANAL, alRecibir);
  }, []);

  if (!avisos.length) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 'min(360px, calc(100vw - 32px))',
      }}
    >
      {avisos.map((aviso) => (
        <div
          key={aviso.id}
          className="asomando"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderRadius: 16,
            padding: '12px 16px',
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.35,
            color: aviso.celebra ? '#eef8fc' : 'var(--tinta)',
            background: aviso.celebra ? '#1b6e8c' : 'var(--suave)',
            boxShadow: '0 8px 24px rgba(26,23,19,0.16)',
          }}
        >
          <span aria-hidden style={{ fontSize: 18 }}>{aviso.celebra ? '🎉' : '✍️'}</span>
          {aviso.mensaje}
        </div>
      ))}
    </div>
  );
}

// Lo usa cada formulario cuando el servidor le responde.
export function avisar(aviso: Aviso | undefined) {
  if (aviso) window.dispatchEvent(new CustomEvent<Aviso>(CANAL, { detail: aviso }));
}
