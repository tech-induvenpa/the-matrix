'use client';

import { useState, type ReactNode } from 'react';

// El cierre de la semana baja desde arriba y se puede cerrar. Al cerrarlo
// vuelve la cabecera de siempre: la celebracion no deja a nadie sin su pantalla.
export function CierreDeSemana({ cabecera, nota }: { cabecera: ReactNode; nota: string }) {
  const [cerrado, setCerrado] = useState(false);

  if (cerrado) return <>{cabecera}</>;

  return (
    <div className="bajando" style={BANNER}>
      <div style={{ fontSize: 58, lineHeight: 1 }}>🎉</div>
      <p style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', margin: 0, textAlign: 'center' }}>
        ¡Meta de la semana lista!
      </p>
      <p style={{ fontSize: 15, opacity: 0.8, margin: 0, textAlign: 'center' }}>{nota}</p>

      <button title="Cerrar" aria-label="Cerrar" onClick={() => setCerrado(true)} style={CERRAR}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// Las dos salidas, y las dos estan bien: seguir o parar. Parar no se disculpa.
export function Adelantar({
  logros,
  extras,
  cuantas,
}: {
  logros: ReactNode;
  extras: ReactNode;
  cuantas: number;
}) {
  const [estado, setEstado] = useState<'preguntando' | 'siguiendo' | 'parado'>('preguntando');

  // Al seguir trabajando se van las dos cosas: los logros y la pregunta. Dejar
  // las estadisticas entre las tarjetas parte la lista por la mitad.
  if (estado === 'siguiendo') return <>{extras}</>;

  return (
    <>
      {logros}

      {estado === 'parado' ? (
        <p style={{ fontSize: 14, color: 'var(--gris)', margin: '4px 0 0' }}>
          Perfecto. Lo de la semana está cerrado; el resto puede esperar.
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {cuantas > 0 && (
            <button onClick={() => setEstado('siguiendo')} style={SEGUIR}>
              Me provoca adelantar, tráeme {cuantas} más
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          )}
          <button onClick={() => setEstado('parado')} style={PARAR}>
            Por hoy está bien 🙂
          </button>
        </div>
      )}
    </>
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

const SEGUIR = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  background: 'var(--tinta)',
  color: '#ffffff',
  height: 54,
  flexGrow: 1,
  borderRadius: 999,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
} as const;

const PARAR = {
  background: 'rgba(26,23,19,0.06)',
  color: 'var(--tinta)',
  height: 54,
  padding: '0 22px',
  borderRadius: 999,
  fontSize: 14,
  flexShrink: 0,
  cursor: 'pointer',
} as const;
