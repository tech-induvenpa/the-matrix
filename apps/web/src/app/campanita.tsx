'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { misNotificaciones, type Notificacion } from './acciones';

// La campanita (CEB-267): los avisos sin ver. Se lee al llegar, al navegar y al
// volver a la pestana; no hay tiempo real. Abrir una tarea (verTarea) apaga su
// aviso, asi que al llegar al perfil la cuenta baja sola.
export function Campanita() {
  const [avisos, setAvisos] = useState<Notificacion[]>([]);
  const [abierta, setAbierta] = useState(false);
  const donde = usePathname();
  const parametros = useSearchParams().toString();

  useEffect(() => {
    let vigente = true;
    const leer = () => misNotificaciones().then((a) => vigente && setAvisos(a)).catch(() => {});
    leer();
    const alVolver = () => document.visibilityState === 'visible' && leer();
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      vigente = false;
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [donde, parametros]);

  useEffect(() => setAbierta(false), [donde, parametros]);

  const total = avisos.length;

  return (
    <div style={{ position: 'relative', marginLeft: 'auto' }}>
      <button
        type="button"
        onClick={() => setAbierta((a) => !a)}
        aria-label={total ? `${total} avisos sin ver` : 'Sin avisos'}
        aria-expanded={abierta}
        style={{ background: 'none', border: 0, padding: 4, cursor: 'pointer', fontSize: 18, position: 'relative', lineHeight: 1 }}
      >
        🔔
        {total > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -6,
              minWidth: 16,
              height: 16,
              borderRadius: 999,
              background: '#2E9E5B',
              color: '#fff',
              fontSize: 10.5,
              fontWeight: 700,
              display: 'grid',
              placeItems: 'center',
              padding: '0 4px',
            }}
          >
            {total}
          </span>
        )}
      </button>

      {abierta && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 34,
            width: 300,
            maxHeight: 360,
            overflowY: 'auto',
            background: 'var(--panel)',
            border: '1px solid rgba(26,23,19,0.12)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(26,23,19,0.12)',
            padding: 6,
            fontWeight: 500,
            fontSize: 13.5,
          }}
        >
          {total === 0 ? (
            <p style={{ margin: 0, padding: '10px 12px', color: 'var(--gris)' }}>Nada nuevo.</p>
          ) : (
            avisos.map((a) => (
              <Link key={a.id} href={a.href} style={{ display: 'block', padding: '8px 12px', color: 'var(--tinta)', textDecoration: 'none' }}>
                <strong>{a.cantidad === 1 ? 'Comentario nuevo' : `${a.cantidad} comentarios nuevos`}</strong>
                <span style={{ display: 'block', color: 'var(--gris)' }}>{a.texto}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
