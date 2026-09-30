import type { ReactNode } from 'react';
import { PISO_DE_COTIDIANIDAD, proponerReparto, type CambioDeReparto } from '@matriz/dominio';

type Fila = { id: string; texto: string; ponderacion: number };

// Todo lo que mueve un peso pasa por la misma regla (ADR 0014), y antes de
// aplicarse se muestra: cada parte con su antes y su despues, la cotidianidad
// incluida, y la cuenta en palabras. Quien aprueba lo pone quien la usa.
//
// Los pesos se calculan aqui y se vuelven a calcular al aplicar con la misma
// funcion del dominio: lo que se aplica es lo que se enseño.
export function Cuenta({
  titulo,
  funciones,
  cambio,
  nombreDeLaNueva,
  children,
}: {
  titulo: string;
  // El reparto publicado de la persona, antes del cambio.
  funciones: readonly Fila[];
  cambio: CambioDeReparto;
  // La que entra no esta en el reparto todavia: su nombre llega aparte.
  nombreDeLaNueva?: string;
  children?: ReactNode;
}) {
  const propuesta = proponerReparto(
    funciones.map((f) => ({ funcionId: f.id, ponderacion: f.ponderacion })),
    cambio,
  );
  const nombre = (id: string) => funciones.find((f) => f.id === id)?.texto ?? nombreDeLaNueva ?? '';
  const antesDe = new Map(funciones.map((f) => [f.id, f.ponderacion]));
  const despuesDe = new Map(propuesta.despues.map((p) => [p.funcionId, p.ponderacion]));
  const ids = [...new Set([...funciones.map((f) => f.id), ...propuesta.despues.map((p) => p.funcionId)])];
  const laQueCambia =
    'sale' in cambio ? cambio.sale : 'entra' in cambio ? cambio.entra.funcionId : 'cambia' in cambio ? cambio.cambia.funcionId : null;

  const filas = [
    ...ids.map((id) => ({ id, texto: nombre(id), antes: antesDe.get(id), despues: despuesDe.get(id), laQueCambia: id === laQueCambia })),
    { id: 'cotidianidad', texto: 'Cotidianidad', antes: propuesta.cotidianidad.antes, despues: propuesta.cotidianidad.despues, laQueCambia: 'cotidianidad' in cambio },
  ];

  return (
    <div style={CAJA}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{titulo}</div>
        {enPalabras(cambio, propuesta, nombre, antesDe).map((frase) => (
          <p key={frase} style={{ fontSize: 13.5, margin: '4px 0 0', lineHeight: 1.45 }}>
            {frase}
          </p>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filas.map((f) => {
          const mueve = f.antes !== f.despues;
          return (
            <div key={f.id} style={{ ...FILA, fontWeight: f.laQueCambia ? 600 : 400, ...(f.id === 'cotidianidad' && CUENTA_COTIDIANIDAD) }}>
              <span style={{ flexGrow: 1, minWidth: 0, fontSize: 13.5 }}>{f.texto}</span>
              <span style={{ fontSize: 13, color: 'var(--gris)', fontVariantNumeric: 'tabular-nums' }}>
                {f.antes === undefined ? '—' : `${f.antes}%`}
              </span>
              <span style={{ fontSize: 13, color: 'var(--gris)' }}>→</span>
              <span style={{ ...DESPUES, color: mueve ? '#8A5A1F' : 'var(--gris)' }}>
                {f.despues === undefined ? 'sale' : `${f.despues}%`}
              </span>
            </div>
          );
        })}
      </div>

      {children}
    </div>
  );
}

const porciento = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1).replace('.', ',')}%`;

function enPalabras(
  cambio: CambioDeReparto,
  p: ReturnType<typeof proponerReparto>,
  nombre: (id: string) => string,
  antesDe: Map<string, number>,
): string[] {
  const frases: string[] = [];
  if ('entra' in cambio) {
    frases.push(
      `Entra ${nombre(cambio.entra.funcionId)} con ${cambio.entra.ponderacion}%. El resto, ${100 - cambio.entra.ponderacion}%, se reparte entre lo que ya había, cotidianidad incluida, en la proporción que tenía.`,
    );
  } else if ('cambia' in cambio) {
    const antes = antesDe.get(cambio.cambia.funcionId) ?? 0;
    const diferencia = Math.abs(cambio.cambia.ponderacion - antes);
    frases.push(
      `${nombre(cambio.cambia.funcionId)} pasa de ${antes}% a ${cambio.cambia.ponderacion}%. Los ${diferencia} puntos que ${cambio.cambia.ponderacion > antes ? 'toma' : 'suelta'} se compensan en proporción entre las demás y la cotidianidad.`,
    );
  } else if ('cotidianidad' in cambio) {
    frases.push(
      `La cotidianidad pasa de ${p.cotidianidad.antes}% a ${p.cotidianidad.despues}%. Las funciones se reparten el resto, ${100 - p.cotidianidad.despues}%, en la proporción que tenían.`,
    );
    return frases;
  } else {
    frases.push(
      `Sale ${nombre(cambio.sale)} (${antesDe.get(cambio.sale) ?? 0}%). Su peso vuelve en proporción a las demás y a la cotidianidad.`,
    );
  }
  if (p.enElPiso) {
    frases.push(
      `La proporción dejaría la cotidianidad en ${porciento(p.proporcional)}, bajo el piso de ${PISO_DE_COTIDIANIDAD}%: queda en ${PISO_DE_COTIDIANIDAD}%, y lo que falta sale de las funciones, también en su proporción.`,
    );
  }
  return frases;
}

const CAJA = {
  background: '#FAF3E2',
  borderLeft: '4px solid #E8A33F',
  borderRadius: 14,
  padding: '18px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
} as const;

const FILA = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: '#fff',
  borderRadius: 10,
  padding: '8px 12px',
} as const;

const CUENTA_COTIDIANIDAD = { background: 'transparent', border: '1.5px dashed rgba(26,23,19,0.18)' } as const;

const DESPUES = {
  fontSize: 13.5,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  minWidth: 42,
  textAlign: 'right',
} as const;
