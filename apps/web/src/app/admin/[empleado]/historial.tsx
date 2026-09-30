import type { Movimiento } from '@matriz/dominio';
import type { VersionDelReparto } from '@/lib/administrador';
import { enCaracas } from '@/lib/cierre-del-mes';

const QUE: Record<Movimiento, string> = {
  alta: 'Alta',
  cambio: 'Cambio de pesos',
  archivo: 'Archivo',
  eliminacion: 'Eliminación',
  traspaso: 'Traspaso',
  cotidianidad: 'Ajuste de la cotidianidad',
};

// El historial del reparto (ADR 0017), plegado debajo de "Su reparto": cada
// cambio publicado, del mas reciente al mas viejo, con quien, cuando y cada
// parte antes y despues. Lo que no cambio va en gris.
export function HistorialDelReparto({ versiones }: { versiones: VersionDelReparto[] }) {
  if (versiones.length === 0) return null;

  // En un traspaso, si la funcion entro o salio de este reparto.
  const direccion = (v: VersionDelReparto) => {
    const suya = v.partes.find((p) => p.funcionId !== null && p.funcionId === v.funcionId);
    if (v.movimiento !== 'traspaso' || !suya) return '';
    return suya.antes === null ? ' (la recibe)' : suya.despues === null ? ' (la entrega)' : '';
  };

  return (
    <details className="acordeon" style={{ background: 'var(--suave)', borderRadius: 14 }}>
      <summary style={RESUMEN}>
        <span style={{ flexGrow: 1 }}>Historial del reparto</span>
        <span style={{ fontSize: 12.5, fontWeight: 400, color: 'var(--gris)' }}>
          {versiones.length} {versiones.length === 1 ? 'cambio' : 'cambios'}
        </span>
        <span className="chevron" aria-hidden style={{ display: 'inline-flex' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </summary>
      <ol style={LISTA}>
        {versiones.map((v) => (
          <li key={v.id} style={VERSION}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', alignItems: 'baseline' }}>
              <strong style={{ fontSize: 13.5 }}>
                {QUE[v.movimiento]}
                {v.funcion ? ` · ${v.funcion}${direccion(v)}` : ''}
              </strong>
              <span style={{ fontSize: 12, color: 'var(--gris)' }}>
                {enCaracas(v.en)} · {v.quien}
              </span>
            </div>
            <ul style={PARTES}>
              {v.partes.map((p) => (
                <li key={p.funcionId ?? 'cotidianidad'} style={{ display: 'flex', gap: 8, color: p.cambio ? 'var(--tinta)' : 'var(--gris)' }}>
                  <span style={{ flexGrow: 1, minWidth: 0 }}>{p.parte}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontWeight: p.cambio ? 600 : 400 }}>
                    {p.antes === null ? '—' : `${p.antes}%`} → {p.despues === null ? '—' : `${p.despues}%`}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </details>
  );
}

const RESUMEN = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  cursor: 'pointer',
  listStyle: 'none',
  fontSize: 14,
  fontWeight: 600,
} as const;

const LISTA = { listStyle: 'none', margin: 0, padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 12 } as const;

const VERSION = { display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 10, borderTop: '1px solid rgba(26, 23, 19, 0.08)' } as const;

const PARTES = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12.5 } as const;
