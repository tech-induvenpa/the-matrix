import { MINIMO_DE_DELEGACIONES, VENTANA_DE_DELEGACION, type Barra, type DelegacionRepetida } from '@matriz/dominio';
import { dolares, fechaCorta } from '@/lib/datos';
import type { PersonaDelTablero } from '@/lib/tablero';

// Las graficas del tablero del equipo (CEB-215). Se dibujan en el servidor, en
// SVG en linea y sin libreria: cada una es poco mas que unos rectangulos. Los
// anchos van en porcentaje, asi la grafica se estira al ancho que haya -- en
// un telefono tambien -- sin scroll horizontal. El administrador y el
// supervisor ven las mismas; cambia solo lo que cada uno recibe.

// Un numero de peso, sin decimales de mas: 12,5 y no 12,5000001.
export const pct = (n: number) => `${Math.round(n * 10) / 10}%`.replace('.', ',');

// Cuanto del cargo esta sin cumplir (CEB-221): una barra por persona, de mayor
// a menor ponderacion arrastrada. Un segmento por funcion con arrastre y uno de
// cotidianidad; lo que desplazo un imprevisto vinculado, rayado dentro del
// suyo. La escala es el cargo entero: la barra llena es el cien.
export function SinCumplir({
  barras,
  perfilDe,
  montoDe,
}: {
  barras: readonly Barra<PersonaDelTablero>[];
  perfilDe: (id: string) => string;
  // Solo el administrador: el supervisor no ve montos (ADR 0015).
  montoDe?: (id: string, peso: number) => number | null;
}) {
  const conAlgo = barras.filter((b) => b.total > 0);
  const alDia = barras.length - conAlgo.length;

  return (
    <section style={GRAFICA}>
      <header>
        <h2 style={TITULO}>Cuánto del cargo está sin cumplir</h2>
        <p style={NOTA}>
          Ahora mismo, por persona: cada tramo es una función que arrastra o la cotidianidad sin cumplir del mes. La barra entera
          es todo su cargo.
        </p>
      </header>

      <Leyenda
        items={[
          { muestra: <rect width="14" height="10" rx="2" fill={FUNCION} />, texto: 'una función que arrastra' },
          { muestra: <rect width="14" height="10" rx="2" fill={COTIDIANIDAD} />, texto: 'cotidianidad sin cumplir' },
          {
            muestra: (
              <>
                <rect width="14" height="10" rx="2" fill={FUNCION} />
                <rect width="14" height="10" rx="2" fill="url(#rayado)" />
              </>
            ),
            texto: 'lo desplazó un imprevisto',
          },
        ]}
      />

      {conAlgo.length === 0 && <p style={NADA}>Nadie tiene nada sin cumplir ahora mismo.</p>}

      <ol style={LISTA}>
        {conAlgo.map((b) => {
          const monto = montoDe?.(b.persona.id, b.total) ?? null;
          let x = 0;
          return (
            <li key={b.persona.id}>
              <a href={perfilDe(b.persona.id)} style={ENLACE} aria-label={`${b.persona.nombre}: ${pct(b.total)} de su cargo sin cumplir`}>
                <span style={ETIQUETA}>
                  <strong style={{ fontSize: 14 }}>{b.persona.nombre}</strong>
                  <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{pct(b.total)} sin cumplir</span>
                  {b.desplazado > 0 && <span style={{ fontSize: 12.5, color: 'var(--gris)' }}>{pct(b.desplazado)} lo desplazó lo no planificado</span>}
                  {monto !== null && <span style={{ fontSize: 12.5, color: 'var(--gris)', fontVariantNumeric: 'tabular-nums' }}>{dolares(monto)}</span>}
                </span>
                <svg width="100%" height="16" role="img" aria-hidden style={{ display: 'block' }}>
                  <rect x="0" y="0" width="100%" height="16" rx="4" fill={PISTA} />
                  {b.segmentos.map((s, n) => {
                    const desde = x;
                    x += s.peso;
                    const nombre = s.tipo === 'funcion' ? s.texto : 'Cotidianidad';
                    return (
                      <g key={n}>
                        <title>{`${nombre}: ${pct(s.peso)}${s.desplazado > 0 ? `, ${pct(s.desplazado)} desplazado por un imprevisto` : ''}`}</title>
                        <rect x={`${desde}%`} y="0" width={`${s.peso}%`} height="16" fill={s.tipo === 'funcion' ? FUNCION : COTIDIANIDAD} stroke="#fff" strokeWidth="2" />
                        {s.desplazado > 0 && (
                          <rect x={`${desde + s.peso - s.desplazado}%`} y="0" width={`${s.desplazado}%`} height="16" fill="url(#rayado)" stroke="#fff" strokeWidth="2" />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </a>
            </li>
          );
        })}
      </ol>

      {alDia > 0 && conAlgo.length > 0 && (
        <p style={NADA}>
          {alDia} {alDia === 1 ? 'persona está al día' : 'personas están al día'}: están en la lista de abajo.
        </p>
      )}
    </section>
  );
}

// Desde cuando (CEB-222): una linea de tiempo por persona, un tramo por
// funcion que arrastra, desde que empezo hasta hoy. La escala va del arrastre
// mas viejo del equipo a hoy, asi lo mas viejo es lo que mas salta.
export function DesdeCuando({
  lineas,
  hoy,
  perfilDe,
}: {
  lineas: readonly { persona: { id: string; nombre: string }; tramos: readonly { funcionId: string; texto: string; periodos: number; desde: string }[] }[];
  hoy: string;
  perfilDe: (id: string) => string;
}) {
  const inicio = lineas.reduce((m, l) => (l.tramos[0]!.desde < m ? l.tramos[0]!.desde : m), hoy);
  const dia = (f: string) => Date.parse(`${f}T00:00:00Z`) / 864e5;
  const largo = Math.max(1, dia(hoy) - dia(inicio));
  const x = (f: string) => ((dia(f) - dia(inicio)) / largo) * 100;

  return (
    <section style={GRAFICA}>
      <header>
        <h2 style={TITULO}>Desde cuándo</h2>
        <p style={NOTA}>Cada tramo es una función que arrastra, desde que dejó de cumplirse hasta hoy. Quien no arrastra nada no aparece.</p>
      </header>

      {lineas.length === 0 ? (
        <p style={NADA}>Nada arrastra ahora mismo.</p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gris)' }}>
            <span>{fechaCorta(inicio)}</span>
            <span>hoy</span>
          </div>
          <ol style={LISTA}>
            {lineas.map((l) => (
              <li key={l.persona.id}>
                <a href={perfilDe(l.persona.id)} style={ENLACE}>
                  <strong style={{ fontSize: 14 }}>{l.persona.nombre}</strong>
                  {l.tramos.map((t) => (
                    <span key={t.funcionId} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 12.5, color: 'var(--gris)', overflowWrap: 'anywhere' }}>
                        {t.texto} · {t.periodos} {t.periodos === 1 ? 'periodo' : 'periodos'}, desde el {fechaCorta(t.desde)}
                      </span>
                      <svg width="100%" height="10" aria-hidden style={{ display: 'block' }}>
                        <title>{`${t.texto}: desde el ${fechaCorta(t.desde)}`}</title>
                        <rect x="0" y="0" width="100%" height="10" rx="3" fill={PISTA} />
                        <rect x={`${x(t.desde)}%`} y="0" width={`${Math.max(0.8, 100 - x(t.desde))}%`} height="10" rx="3" fill={FUNCION} />
                      </svg>
                    </span>
                  ))}
                </a>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

// Cuanto le cae para su tamano (CEB-223): los imprevistos abiertos de cada
// persona por cada 10% de su cotidianidad, partidos en en plazo y vencidos. La
// escala es la persona mas cargada del equipo.
export function Carga({
  cargas,
  perfilDe,
}: {
  cargas: readonly { persona: { id: string; nombre: string }; cotidianidad: number; carga: { enPlazo: number; vencidos: number; total: number } }[];
  perfilDe: (id: string) => string;
}) {
  const mayor = Math.max(1, ...cargas.map((c) => c.carga.total));
  const uno = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',');

  return (
    <section style={GRAFICA}>
      <header>
        <h2 style={TITULO}>Cuánto le cae para su tamaño</h2>
        <p style={NOTA}>
          Imprevistos abiertos por cada 10% de su cotidianidad, que es por donde pesan: veinte con cotidianidad 90% son 2,2; con 10%,
          son 20.
        </p>
      </header>

      <Leyenda
        items={[
          { muestra: <rect width="14" height="10" rx="2" fill={COTIDIANIDAD} />, texto: 'en plazo' },
          { muestra: <rect width="14" height="10" rx="2" fill={VENCIDO} />, texto: 'vencidos' },
        ]}
      />

      {cargas.length === 0 && <p style={NADA}>Nadie tiene imprevistos abiertos.</p>}

      <ol style={LISTA}>
        {cargas.map((c) => (
          <li key={c.persona.id}>
            <a href={perfilDe(c.persona.id)} style={ENLACE}>
              <span style={ETIQUETA}>
                <strong style={{ fontSize: 14 }}>{c.persona.nombre}</strong>
                <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{uno(c.carga.total)} por cada 10%</span>
                <span style={{ fontSize: 12.5, color: 'var(--gris)' }}>
                  {Math.round((c.carga.total * Math.max(c.cotidianidad, 1)) / 10)} abiertos, cotidianidad {c.cotidianidad}%
                  {c.carga.vencidos > 0 && ` · ${uno(c.carga.vencidos)} vencidos por cada 10%`}
                </span>
              </span>
              <svg width="100%" height="14" aria-hidden style={{ display: 'block' }}>
                <title>{`${c.persona.nombre}: ${uno(c.carga.enPlazo)} en plazo y ${uno(c.carga.vencidos)} vencidos por cada 10%`}</title>
                <rect x="0" y="0" width="100%" height="14" rx="4" fill={PISTA} />
                <rect x="0" y="0" width={`${(c.carga.enPlazo / mayor) * 100}%`} height="14" fill={COTIDIANIDAD} stroke="#fff" strokeWidth="2" />
                <rect
                  x={`${(c.carga.enPlazo / mayor) * 100}%`}
                  y="0"
                  width={`${(c.carga.vencidos / mayor) * 100}%`}
                  height="14"
                  fill={VENCIDO}
                  stroke="#fff"
                  strokeWidth="2"
                />
              </svg>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Las mas delegadas (CEB-224): las funciones cuyas ocurrencias mas se
// delegaron en los ultimos noventa dias, en proporcion y no en veces, con lo
// devuelto en otro tono y quien delega en la etiqueta. Una delegacion que se
// repite es un traspaso que nadie ha hecho.
export function MasDelegadas({ repetidas, perfilDe }: { repetidas: readonly DelegacionRepetida[]; perfilDe?: (funcionId: string) => string | null }) {
  return (
    <section style={GRAFICA}>
      <header>
        <h2 style={TITULO}>Las más delegadas</h2>
        <p style={NOTA}>
          La parte de las ocurrencias de cada función que se delegó en los últimos {VENTANA_DE_DELEGACION} días. Solo las delegadas{' '}
          {MINIMO_DE_DELEGACIONES} veces o más: una sola vez no es repetirse.
        </p>
      </header>

      <Leyenda
        items={[
          { muestra: <rect width="14" height="10" rx="2" fill={COTIDIANIDAD} />, texto: 'delegada' },
          { muestra: <rect width="14" height="10" rx="2" fill={DEVUELTA} />, texto: 'de eso, devuelta' },
        ]}
      />

      {repetidas.length === 0 && <p style={NADA}>Ninguna función se está delegando seguido.</p>}

      <ol style={LISTA}>
        {repetidas.map((r) => {
          const contenido = (
            <>
              <span style={ETIQUETA}>
                <strong style={{ fontSize: 14 }}>{r.texto}</strong>
                <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{pct(r.proporcion * 100)} de sus ocurrencias</span>
                <span style={{ fontSize: 12.5, color: 'var(--gris)' }}>
                  delega {r.supervisor} · {delegadaVeces(r)}
                </span>
              </span>
              <svg width="100%" height="14" aria-hidden style={{ display: 'block' }}>
                <title>{`${r.texto}: ${pct(r.proporcion * 100)} delegada, ${pct(r.proporcionDevuelta * 100)} devuelta`}</title>
                <rect x="0" y="0" width="100%" height="14" rx="4" fill={PISTA} />
                <rect x="0" y="0" width={`${(r.proporcion - r.proporcionDevuelta) * 100}%`} height="14" fill={COTIDIANIDAD} stroke="#fff" strokeWidth="2" />
                <rect
                  x={`${(r.proporcion - r.proporcionDevuelta) * 100}%`}
                  y="0"
                  width={`${r.proporcionDevuelta * 100}%`}
                  height="14"
                  fill={DEVUELTA}
                  stroke="#fff"
                  strokeWidth="2"
                />
              </svg>
            </>
          );
          const enlace = perfilDe?.(r.funcionId);
          return (
            <li key={r.funcionId}>
              {enlace ? (
                <a href={enlace} style={ENLACE}>
                  {contenido}
                </a>
              ) : (
                <span style={ENLACE}>{contenido}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// "delegada 3 veces (1 devuelta)": igual en la grafica y en la fila de la funcion.
export const delegadaVeces = (r: Pick<DelegacionRepetida, 'delegadas' | 'devueltas'>) =>
  `delegada ${r.delegadas} ${r.delegadas === 1 ? 'vez' : 'veces'}${r.devueltas > 0 ? ` (${r.devueltas} ${r.devueltas === 1 ? 'devuelta' : 'devueltas'})` : ''}`;

// El patron del rayado, una vez por pagina. Va en su propio svg para que
// cualquier grafica lo use por su id.
export function Patrones() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: 'absolute' }}>
      <defs>
        <pattern id="rayado" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="rgba(255,255,255,0)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" />
        </pattern>
      </defs>
    </svg>
  );
}

export function Leyenda({ items }: { items: readonly { muestra: React.ReactNode; texto: string }[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12.5, color: 'var(--gris)' }}>
      {items.map((i) => (
        <li key={i.texto} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="10" aria-hidden>
            {i.muestra}
          </svg>
          {i.texto}
        </li>
      ))}
    </ul>
  );
}

// Lo previsto en el tono de "hacer ya"; lo imprevisto, en el de "ponle fecha".
export const FUNCION = '#d9503a';
export const COTIDIANIDAD = '#1b6e8c';
export const PISTA = 'rgba(26,23,19,0.06)';
export const VENCIDO = '#9e3322';
export const DEVUELTA = '#e8ce7a';

export const GRAFICA = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  background: 'var(--panel)',
  borderRadius: 18,
  padding: '18px 20px',
  minWidth: 0,
} as const;

export const TITULO = { fontSize: 17, fontWeight: 700, margin: 0 } as const;
export const NOTA = { fontSize: 13, color: 'var(--gris)', margin: '4px 0 0', maxWidth: 640 } as const;
export const NADA = { fontSize: 13.5, color: 'var(--gris)', margin: 0 } as const;
export const LISTA = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 } as const;
export const ENLACE = { display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--tinta)', textDecoration: 'none' } as const;
export const ETIQUETA = { display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '2px 10px' } as const;
