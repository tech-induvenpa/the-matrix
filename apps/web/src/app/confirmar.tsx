'use client';

import { useRef, type CSSProperties, type ReactNode } from 'react';
import { avisar, type Aviso } from './avisos';
import { Enviar } from './boton';

// Lo que no se deshace pide un segundo si. Un <dialog> nativo: trae el fondo,
// el foco atrapado y Escape para cerrar sin escribir nada de eso.
export function Confirmar({
  accion,
  titulo,
  pregunta,
  detalle,
  si,
  enviando = 'Borrando…',
  estilo,
  children,
}: {
  accion: (formulario: FormData) => Promise<Aviso | undefined>;
  titulo: string;
  pregunta: string;
  // Texto, o lo que haga falta para ver el impacto (la cuenta de un reparto).
  detalle?: ReactNode;
  si: string;
  enviando?: string;
  estilo: CSSProperties;
  children: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" title={titulo} aria-label={titulo} onClick={() => dialogo.current?.showModal()} style={estilo}>
        {children}
      </button>

      <dialog
        ref={dialogo}
        // Un clic en el fondo cierra: el fondo es el propio <dialog>.
        onClick={(evento) => evento.target === dialogo.current && dialogo.current.close()}
        style={DIALOGO}
      >
        <form
          action={async (formulario) => {
            avisar(await accion(formulario));
            dialogo.current?.close();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{pregunta}</p>
          {typeof detalle === 'string' ? <p style={{ margin: 0, fontSize: 14, color: 'var(--gris)' }}>{detalle}</p> : detalle}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" autoFocus onClick={() => dialogo.current?.close()} style={{ ...BOTON, background: 'rgba(26,23,19,0.06)', color: 'var(--tinta)' }}>
              Cancelar
            </button>
            <Enviar style={{ ...BOTON, background: '#C62828', color: '#fff' }} enviando={enviando}>
              {si}
            </Enviar>
          </div>
        </form>
      </dialog>
    </>
  );
}

const DIALOGO = {
  border: 'none',
  borderRadius: 20,
  padding: '22px 24px',
  width: 'min(480px, calc(100vw - 32px))',
  color: 'var(--tinta)',
  boxShadow: '0 20px 50px rgba(26,23,19,0.25)',
} as const;

const BOTON = {
  display: 'flex',
  alignItems: 'center',
  height: 38,
  padding: '0 16px',
  borderRadius: 999,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
} as const;
