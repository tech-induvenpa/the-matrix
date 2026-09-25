import { emojiDe, type Cuadrante } from '@matriz/dominio';
import { comoVence } from '@/lib/datos';
import { deshacerMarca, marcarHecho, marcarNoPude } from './acciones';
import { Accion } from './accion';
import { Enviar } from './boton';
import { PorQue } from './porque';

export type Fila = {
  funcionId: string;
  periodo: string;
  texto: string;
  vence: string;
  importancia: number;
  urgencia: number;
  faltan: number;
  cuadrante: Cuadrante;
  // Los imprevistos que podrian explicar un "no pude" de esta ocurrencia.
  vinculables?: readonly { id: string; texto: string }[];
};

// La misma tarjeta en la semana y en el mes: una funcion no cambia de cara
// segun por donde la mires, y dos tarjetas distintas era mantener dos.
export function Tarjeta({ o, hoy }: { o: Fila; hoy: string }) {
  return (
    <article style={{ ...TARJETA, ...COLOR[o.cuadrante] }}>
      <span title={`Vence en ${o.faltan} días hábiles`} style={{ ...CIRCULO, background: COLOR[o.cuadrante].velo }}>
        {emojiDe(o.faltan)}
      </span>

      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minWidth: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em' }}>{o.texto}</span>
        <span style={{ fontSize: 13, opacity: 0.78 }}>{comoVence(o.vence, hoy)}</span>
      </span>

      <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <Numero etiqueta="IMP" valor={o.importancia} velo={COLOR[o.cuadrante].velo} />
        <Numero etiqueta="URG" valor={o.urgencia} velo={COLOR[o.cuadrante].velo} />
      </span>

      <span style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
        <Accion accion={marcarHecho.bind(null, o.funcionId, o.periodo)}>
          <Enviar style={HECHO} enviando="Marcando…">
            <span style={{ color: '#2E7D32', display: 'flex' }}>
              <Check />
            </span>
            ¡Hecho!
          </Enviar>
        </Accion>

        <PorQue
          accion={marcarNoPude.bind(null, o.funcionId, o.periodo, o.vence)}
          opciones={o.vinculables}
          titulo="No pude"
          placeholder="¿Qué pasó? Así lo entendemos luego"
          estilo={{ ...REDONDO, color: '#C62828' }}
        >
          <Equis />
        </PorQue>
      </span>
    </article>
  );
}

export function Numero({ etiqueta, valor, velo }: { etiqueta: string; valor: number; velo: string }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 5,
        padding: '5px 10px',
        borderRadius: 999,
        background: velo,
        fontSize: 13,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', opacity: 0.72 }}>{etiqueta}</span>
      {valor}
    </span>
  );
}

export function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function Equis() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export const COLOR: Record<Cuadrante, { background: string; color: string; velo: string }> = {
  hacer: { background: '#d9503a', color: '#fff4f0', velo: 'rgba(255,244,240,0.18)' },
  agendar: { background: '#1b6e8c', color: '#eef8fc', velo: 'rgba(238,248,252,0.18)' },
  mantener: { background: '#e8ce7a', color: '#2a2313', velo: 'rgba(42,35,19,0.14)' },
};

export const TARJETA = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  minHeight: 58,
  borderRadius: 20,
  padding: '10px 12px',
  boxSizing: 'border-box',
} as const;

export const CIRCULO = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: 999,
  fontSize: 20,
  flexShrink: 0,
} as const;

export const HECHO = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  height: 40,
  padding: '0 16px 0 13px',
  borderRadius: 999,
  background: '#ffffff',
  color: 'var(--tinta)',
  fontSize: 14,
  fontWeight: 600,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
} as const;

export const REDONDO = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: 999,
  background: '#ffffff',
  flexShrink: 0,
  cursor: 'pointer',
} as const;

type Resuelta = { funcionId: string; periodo: string; texto: string };
type Marca = { resultado: string; razon?: string | null };

// Lo ya cerrado, igual en la semana y en el mes: tachado, con lo que se dijo si
// no se pudo, y con Deshacer al lado porque marcar de mas es el error facil.
export function YaResueltas({
  cerradas,
  marcaDe,
}: {
  cerradas: readonly Resuelta[];
  marcaDe: Map<string, Marca>;
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gris)' }}>
          Ya resueltas
        </span>
        <span style={{ flexGrow: 1, height: 1, background: 'rgba(26,23,19,0.10)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {cerradas.map((o) => {
          const marca = marcaDe.get(`${o.funcionId}|${o.periodo}`);
          const pudo = marca?.resultado === 'hecho';

          return (
            <div key={`${o.funcionId}|${o.periodo}`} style={RESUELTA}>
              <span style={{ color: pudo ? '#5E9E62' : '#C97B72', flexShrink: 0, display: 'flex' }}>
                {pudo ? <Check /> : <Equis />}
              </span>
              <span
                style={{
                  flexGrow: 1,
                  minWidth: 0,
                  fontSize: 14,
                  textDecoration: pudo ? 'line-through' : 'none',
                  textDecorationColor: 'rgba(110,101,90,0.55)',
                }}
              >
                {o.texto}
              </span>
              <span style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                {pudo ? 'lista' : `no pude: ${marca?.razon ?? ''}`}
              </span>
              <Accion accion={deshacerMarca.bind(null, o.funcionId, o.periodo)}>
                <Enviar style={DESHACER} enviando="…">
                  Deshacer
                </Enviar>
              </Accion>
            </div>
          );
        })}
      </div>
    </>
  );
}

const RESUELTA = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: 'var(--suave)',
  color: 'var(--gris)',
  minHeight: 40,
  borderRadius: 13,
  padding: '0 12px',
  boxSizing: 'border-box',
} as const;

const DESHACER = {
  display: 'flex',
  alignItems: 'center',
  background: 'rgba(26,23,19,0.06)',
  color: 'var(--gris)',
  padding: '5px 12px',
  borderRadius: 999,
  fontSize: 12.5,
  fontWeight: 600,
  flexShrink: 0,
  cursor: 'pointer',
} as const;
