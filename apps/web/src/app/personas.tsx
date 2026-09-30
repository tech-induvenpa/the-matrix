import type { ReactNode } from 'react';
import { Punto } from './abrir';
import { Ir } from './ir';

// Lo que comparten "El equipo" del administrador y el del supervisor: las dos
// pestanas y el acordeon de cada persona. Una sola pieza, para que las dos
// pantallas no se separen.

// Personas primero; el tablero, segundo. La pestana viaja en la URL.
export function Pestanas({ vista, enlaceA }: { vista: 'equipo' | 'tablero'; enlaceA: (v: 'equipo' | 'tablero') => string }) {
  return (
    <nav aria-label="Vistas del equipo" style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(26,23,19,0.10)' }}>
      {(
        [
          ['equipo', 'Personas'],
          ['tablero', 'Tablero'],
        ] as const
      ).map(([v, texto]) => (
        <Ir
          key={v}
          href={enlaceA(v)}
          style={{
            padding: '8px 14px',
            fontSize: 15,
            fontWeight: 600,
            textDecoration: 'none',
            color: vista === v ? 'var(--tinta)' : 'var(--gris)',
            borderBottom: `2px solid ${vista === v ? 'var(--tinta)' : 'transparent'}`,
            marginBottom: -1,
          }}
        >
          {texto}
        </Ir>
      ))}
    </nav>
  );
}

// La pestana pedida en la URL: Personas si no dice nada.
export const vistaDe = (pedida: string | undefined) => (pedida === 'tablero' ? 'tablero' : 'equipo');

// Los enlaces de las pestanas conservan el filtro; Personas no lleva parametro.
export const enlacesDe = (parametros: Record<string, string | undefined>) => (v: 'equipo' | 'tablero') =>
  `?${new URLSearchParams(
    Object.fromEntries(Object.entries({ ...parametros, vista: v === 'tablero' ? v : undefined }).filter(([, x]) => x !== undefined)) as Record<string, string>,
  )}`;

// Una persona: el rol al principio, lo que cada pantalla quiera decir de ella
// al medio, y al final el chevron que abre sus tareas y el atajo a su perfil.
export function AcordeonDePersona({
  nombre,
  empresa,
  sinLeer,
  aCargo,
  responsable,
  abierto,
  perfil,
  tareasAbiertas,
  datos,
  children,
}: {
  nombre: string;
  empresa: string;
  sinLeer: boolean;
  // Cuantos tiene a cargo: con alguno, es responsable (CEB-145).
  aCargo: number;
  // De quien depende, si es empleado y se sabe.
  responsable?: string;
  abierto: boolean;
  perfil: string;
  tareasAbiertas: number;
  // Lo que va al medio, distinto en cada pantalla.
  datos: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="acordeon" open={abierto} style={{ background: 'var(--suave)', borderRadius: 14 }}>
      <summary style={FILA}>
        <span
          title={aCargo ? `Responsable de ${aCargo} ${aCargo === 1 ? 'persona' : 'personas'}` : `Empleado${responsable ? `, a cargo de ${responsable}` : ''}`}
          style={{ ...ICONO, background: aCargo ? 'var(--tinta)' : '#fff', color: aCargo ? '#fff' : 'var(--gris)' }}
        >
          {aCargo ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-label="Responsable">
              <circle cx="9" cy="8" r="3.5" />
              <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
              <circle cx="17" cy="9" r="2.5" />
              <path d="M17 14c2.6 0 4.5 1.9 4.5 4.8" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-label="Empleado">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
            </svg>
          )}
        </span>
        <span style={{ flexGrow: 1, minWidth: 0, fontSize: 15, fontWeight: 600 }}>
          {nombre}
          {/* Comentarios sin leer en alguna de sus tareas abiertas (CEB-198). */}
          {sinLeer && <Punto />}
          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--gris)', marginLeft: 10 }}>{empresa}</span>
        </span>
        {datos}
        <span style={{ fontSize: 13, color: 'var(--gris)', whiteSpace: 'nowrap' }}>
          {tareasAbiertas} {tareasAbiertas === 1 ? 'tarea abierta' : 'tareas abiertas'}
        </span>
        <span className="chevron" aria-hidden style={ICONO}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
        <Ir href={perfil} title={`Ver el perfil de ${nombre}`} style={{ ...ICONO, background: '#fff', color: 'var(--tinta)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-label={`Ver el perfil de ${nombre}`}>
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </Ir>
      </summary>
      {/* Las mismas tarjetas que en su perfil: el titulo abre su historia. */}
      <div style={{ padding: '0 12px 12px' }}>{children}</div>
    </details>
  );
}

const FILA = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '4px 14px',
  padding: '10px 12px 10px 16px',
  cursor: 'pointer',
  listStyle: 'none',
} as const;

const ICONO = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 999,
  background: 'rgba(26,23,19,0.06)',
  color: 'var(--gris)',
  flexShrink: 0,
} as const;
