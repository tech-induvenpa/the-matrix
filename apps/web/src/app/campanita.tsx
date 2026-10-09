'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { marcarTodasVistas, misNotificaciones, type Notificacion } from './acciones';

const TITULO: Record<string, (n: number) => string> = {
  comentario: (n) => (n === 1 ? 'Comentario nuevo' : `${n} comentarios nuevos`),
  imprevisto: () => 'Te pidieron algo',
  delegacion_marcada: () => 'Marcaron lo que delegaste',
  delegacion_devuelta: () => 'Te devolvieron una delegación',
};

// La campanita (CEB-267): los avisos sin ver. Se lee al llegar, al navegar y al
// volver a la pestana; no hay tiempo real. Abrir una tarea (verTarea) apaga su
// aviso, asi que al llegar al perfil la cuenta baja sola.
export function Campanita() {
  const [avisos, setAvisos] = useState<Notificacion[]>([]);
  const [abierta, setAbierta] = useState(false);
  const donde = usePathname();
  const parametros = useSearchParams().toString();

  const leer = () => misNotificaciones().then(setAvisos).catch(() => {});

  useEffect(() => {
    let vigente = true;
    const traer = () => misNotificaciones().then((a) => vigente && setAvisos(a)).catch(() => {});
    traer();
    const alVolver = () => document.visibilityState === 'visible' && traer();
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      vigente = false;
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [donde, parametros]);

  useEffect(() => setAbierta(false), [donde, parametros]);

  const sinVer = avisos.filter((a) => !a.vista);
  const total = sinVer.length;

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
          {avisos.length === 0 ? (
            <p style={{ margin: 0, padding: '10px 12px', color: 'var(--gris)' }}>Nada nuevo.</p>
          ) : (
            <>
              {total > 0 && (
                <button
                  type="button"
                  onClick={() => marcarTodasVistas().then(leer)}
                  style={{ background: 'none', border: 0, padding: '6px 12px', color: 'var(--gris)', fontSize: 12.5, cursor: 'pointer' }}
                >
                  Marcar todas como vistas
                </button>
              )}
              {avisos.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  style={{ display: 'block', padding: '8px 12px', color: 'var(--tinta)', textDecoration: 'none', opacity: a.vista ? 0.55 : 1 }}
                >
                  <strong>{(TITULO[a.tipo] ?? (() => 'Aviso'))(a.cantidad)}</strong>
                  <span style={{ display: 'block', color: 'var(--gris)' }}>{a.texto}</span>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
