'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { avisar, type Aviso } from './avisos';
import { Enviar } from './boton';

// Decir "no pude" o "me atrasé" exige escribir por qué, y eso pide un sitio
// donde escribirlo. Va anclado a su propio botón —antes se posicionaba respecto
// a la página y se montaba sobre la otra columna— y se cierra al guardar.
export function PorQue({
  accion,
  titulo,
  placeholder,
  estilo,
  opciones = [],
  children,
}: {
  accion: (formulario: FormData) => Promise<Aviso | undefined>;
  titulo: string;
  placeholder: string;
  estilo: CSSProperties;
  // Los imprevistos que se pueden vincular (intromision). Opcional: la razon
  // se escribe igual, con o sin ellos.
  opciones?: readonly { id: string; texto: string }[];
  children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        title={titulo}
        aria-label={titulo}
        aria-expanded={abierto}
        onClick={() => setAbierto((estaba) => !estaba)}
        style={estilo}
      >
        {children}
      </button>

      {abierto && (
        <form
          action={async (formulario) => {
            avisar(await accion(formulario));
            setAbierto(false);
          }}
          onKeyDown={(evento) => {
            if (evento.key === 'Escape') setAbierto(false);
          }}
          style={{ ...PANEL, flexDirection: 'column' }}
        >
          {opciones.length > 0 && (
            <fieldset style={OPCIONES}>
              <legend style={{ fontSize: 12, color: 'var(--gris)', padding: 0, marginBottom: 4 }}>
                ¿Te lo impidió algún imprevisto?
              </legend>
              {opciones.map((o) => (
                <label key={o.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                  <input type="checkbox" name="imprevisto" value={o.id} />
                  {o.texto}
                </label>
              ))}
            </fieldset>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <input name="razon" required autoFocus placeholder={placeholder} style={CAMPO} />
            <Enviar style={BOTON}>Guardar</Enviar>
          </div>
        </form>
      )}
    </div>
  );
}

const PANEL = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  zIndex: 20,
  display: 'flex',
  gap: 6,
  padding: 8,
  borderRadius: 18,
  background: '#ffffff',
  boxShadow: '0 10px 30px rgba(26,23,19,0.18)',
} as const;

const OPCIONES = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  border: 'none',
  margin: 0,
  padding: '4px 8px',
  maxHeight: 180,
  overflowY: 'auto',
  color: 'var(--tinta)',
} as const;

const CAMPO = {
  height: 38,
  borderRadius: 999,
  border: '1px solid rgba(26,23,19,0.12)',
  padding: '0 16px',
  fontSize: 14,
  width: 260,
  maxWidth: '50vw',
} as const;

const BOTON = {
  display: 'flex',
  alignItems: 'center',
  height: 38,
  padding: '0 16px',
  borderRadius: 999,
  background: 'var(--tinta)',
  color: '#ffffff',
  fontSize: 14,
  fontWeight: 600,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
} as const;
