'use client';

import { useEffect, useState, type ReactNode } from 'react';

// Cerrar la meta se recuerda por semana, en este navegador: el banner no
// vuelve a bajar. La semana que viene se celebra otra
// vez. Sin almacenamiento (ventana privada), se recuerda solo mientras dure la
// pagina.
const META = 'matriz:meta:';
const AL_CERRAR = 'matriz:meta-cerrada';

const yaSeCerro = (semana: string) => {
  try {
    return localStorage.getItem(META + semana) !== null;
  } catch {
    return false;
  }
};

function useMetaCerrada(semana: string) {
  // Hasta montar no se sabe: el servidor no ve el almacenamiento del navegador.
  const [cerrada, setCerrada] = useState<boolean | null>(null);

  useEffect(() => {
    setCerrada(yaSeCerro(semana));
    const alCerrar = () => setCerrada(true);
    window.addEventListener(AL_CERRAR, alCerrar);
    return () => window.removeEventListener(AL_CERRAR, alCerrar);
  }, [semana]);

  const cerrar = () => {
    try {
      localStorage.setItem(META + semana, '1');
    } catch {
      // Sin almacenamiento: se cierra igual en esta pagina.
    }
    window.dispatchEvent(new Event(AL_CERRAR));
  };

  return [cerrada, cerrar] as const;
}

// El cierre de la semana baja desde arriba y se puede cerrar. Al cerrarlo
// vuelve la cabecera de siempre: la celebracion no deja a nadie sin su pantalla.
export function CierreDeSemana({ cabecera, nota, semana }: { cabecera: ReactNode; nota: string; semana: string }) {
  const [cerrado, cerrar] = useMetaCerrada(semana);

  if (cerrado !== false) return <>{cabecera}</>;

  return (
    <div className="bajando" style={BANNER}>
      <div style={{ fontSize: 58, lineHeight: 1 }}>🎉</div>
      <p style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', margin: 0, textAlign: 'center' }}>
        ¡Meta de la semana lista!
      </p>
      <p style={{ fontSize: 15, opacity: 0.8, margin: 0, textAlign: 'center' }}>{nota}</p>

      <button title="Cerrar" aria-label="Cerrar" onClick={cerrar} style={CERRAR}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

const BANNER = {
  position: 'relative',
  background: '#d9503a',
  color: '#fff4f0',
  minHeight: 244,
  borderRadius: '0 0 30px 30px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  padding: '32px 40px',
  boxSizing: 'border-box',
} as const;

const CERRAR = {
  position: 'absolute',
  top: 18,
  right: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 38,
  height: 38,
  borderRadius: 999,
  background: 'rgba(255,244,240,0.18)',
  color: '#fff4f0',
  cursor: 'pointer',
} as const;
