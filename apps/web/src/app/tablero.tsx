import type { ReactNode } from 'react';
import { MINIMO_DE_DELEGACIONES, VENTANA_DE_DELEGACION, type Barra, type DelegacionRepetida } from '@matriz/dominio';
import { dolares, fechaCorta, sumarDias } from '@/lib/datos';
import type { PersonaDelTablero } from '@/lib/tablero';
import { AZUL, DEVUELTA, FUNCION, VENCIDO } from './colores';
import { GraficaCarga, GraficaDelegadas, GraficaDesdeCuando, GraficaSinCumplir } from './graficas';

// El tablero del equipo (CEB-215): tres cifras arriba y cuatro graficas en una
// cuadricula de dos por dos (una columna en el telefono). Aqui se arma lo que
// cada grafica dice; graficas.tsx solo pinta. El administrador y el supervisor
// ven lo mismo; cambia solo lo que cada uno recibe (ADR 0015).

// Un numero de peso, sin decimales de mas: 12,5 y no 12,5000001.
export const pct = (n: number) => `${Math.round(n * 10) / 10}%`.replace('.', ',');
const uno = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',');

type Linea = { persona: { id: string; nombre: string }; tramos: readonly { funcionId: string; texto: string; periodos: number; desde: string }[] };
type CargaDe = { persona: { id: string; nombre: string }; cotidianidad: number; carga: { enPlazo: number; vencidos: number; total: number } };

// Los abiertos de verdad, no por cada 10%: la cifra de arriba cuenta tareas.
const abiertos = (c: CargaDe) => ({
  vencidos: Math.round((c.carga.vencidos * Math.max(c.cotidianidad, 1)) / 10),
  total: Math.round((c.carga.total * Math.max(c.cotidianidad, 1)) / 10),
});

// Las tres cifras que se leen antes que cualquier grafica.
export function Resumen({
  barras,
  lineas,
  cargas,
  montoDe,
}: {
  barras: readonly Barra<PersonaDelTablero>[];
  lineas: readonly Linea[];
  cargas: readonly CargaDe[];
  montoDe?: (id: string, peso: number) => number | null;
}) {
  const promedio = barras.length ? barras.reduce((t, b) => t + b.total, 0) / barras.length : 0;
  const montos = montoDe ? barras.map((b) => montoDe(b.persona.id, b.total)).filter((m): m is number => m !== null) : [];
  const tramos = lineas.flatMap((l) => l.tramos);
  const masViejo = tramos.map((t) => t.desde).sort()[0];
  const vencidos = cargas.reduce((t, c) => t + abiertos(c).vencidos, 0);
  const total = cargas.reduce((t, c) => t + abiertos(c).total, 0);

  return (
    <div className="cifras">
      <Cifra valor={pct(promedio)} nombre="del cargo sin cumplir" detalle={`en promedio por persona${montos.length ? ` · ${dolares(montos.reduce((t, m) => t + m, 0))} en total` : ''}`} alerta={promedio > 0} />
      <Cifra
        valor={String(tramos.length)}
        nombre={tramos.length === 1 ? 'función arrastra' : 'funciones arrastran'}
        detalle={masViejo ? `la más vieja, desde el ${fechaCorta(masViejo)}` : 'nada arrastra'}
        alerta={tramos.length > 0}
      />
      <Cifra
        valor={String(vencidos)}
        nombre={vencidos === 1 ? 'imprevisto vencido' : 'imprevistos vencidos'}
        detalle={total ? `de ${total} ${total === 1 ? 'abierto' : 'abiertos'}` : 'nada abierto'}
        alerta={vencidos > 0}
      />
    </div>
  );
}

function Cifra({ valor, nombre, detalle, alerta }: { valor: string; nombre: string; detalle: string; alerta: boolean }) {
  return (
    <div style={{ ...GRAFICA, gap: 2 }}>
      <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', color: alerta ? '#9E3322' : 'var(--tinta)' }}>
        {valor}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{nombre}</span>
      <span style={{ fontSize: 12.5, color: 'var(--gris)' }}>{detalle}</span>
    </div>
  );
}

// Cuanto del cargo esta sin cumplir (CEB-221): una barra por persona, de mayor
// a menor ponderacion arrastrada, sobre el cien de su cargo.
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
    <Tarjeta
      titulo="Cuánto del cargo está sin cumplir"
      nota={`Ahora mismo, sobre el 100% de su cargo.${alDia && conAlgo.length ? ` ${alDia} al día.` : ''}`}
      vacio={conAlgo.length === 0 ? 'Nadie tiene nada sin cumplir ahora mismo.' : null}
      leyenda={[
        { color: FUNCION, texto: 'función que arrastra' },
        { color: 'url(#rayado)', texto: 'la desplazó un imprevisto' },
        { color: AZUL, texto: 'cotidianidad' },
      ]}
    >
      <GraficaSinCumplir
        filas={conAlgo.map((b) => {
          const funciones = b.segmentos.filter((s) => s.tipo === 'funcion');
          const cotidianidad = b.segmentos.find((s) => s.tipo === 'cotidianidad');
          const monto = montoDe?.(b.persona.id, b.total) ?? null;
          return {
            nombre: b.persona.nombre,
            enlace: perfilDe(b.persona.id),
            funciones: funciones.map((s) => ({ propio: s.peso - s.desplazado, desplazado: s.desplazado })),
            cotidianidad: cotidianidad?.peso ?? 0,
            detalle: (
              <>
                <strong>{b.persona.nombre}</strong> · {pct(b.total)} sin cumplir{monto !== null && ` · ${dolares(monto)}`}
                {b.segmentos.map((s, n) => (
                  <div key={n} style={{ color: 'var(--gris)' }}>
                    {s.tipo === 'funcion' ? s.texto : 'Cotidianidad'}: {pct(s.peso)}
                    {s.desplazado > 0 && `, ${pct(s.desplazado)} por un imprevisto`}
                  </div>
                ))}
              </>
            ),
          };
        })}
      />
    </Tarjeta>
  );
}

// Desde cuando (CEB-222): cada funcion que arrastra, de su "desde" a hoy. La
// escala es fija, los ultimos noventa dias (o mas, si algo es mas viejo).
export function DesdeCuando({ lineas, hoy, perfilDe }: { lineas: readonly Linea[]; hoy: string; perfilDe: (id: string) => string }) {
  const dia = (f: string) => Date.parse(`${f}T00:00:00Z`) / 864e5;
  const masViejo = lineas.flatMap((l) => l.tramos.map((t) => t.desde)).sort()[0] ?? hoy;
  const dias = Math.max(90, Math.ceil(dia(hoy) - dia(masViejo)) + 1);
  const cuarto = Math.round(dias / 3);

  return (
    <Tarjeta
      titulo="Desde cuándo"
      nota={`Cada función que arrastra, desde que dejó de cumplirse hasta hoy. Últimos ${dias} días.`}
      vacio={lineas.length === 0 ? 'Nada arrastra ahora mismo.' : null}
    >
      <GraficaDesdeCuando
        dias={dias}
        marcas={[0, cuarto, cuarto * 2, dias].map((v) => ({ valor: v, texto: v === dias ? 'hoy' : fechaCorta(sumarDias(hoy, v - dias)) }))}
        filas={lineas.flatMap((l) =>
          l.tramos.map((t) => {
            // El tramo llega hasta el final del dia de hoy: arrastrar desde hoy se ve.
            const inicio = Math.max(0, dias - (dia(hoy) - dia(t.desde)) - 1);
            return {
              nombre: `${l.persona.nombre} · ${t.texto}`,
              enlace: perfilDe(l.persona.id),
              inicio,
              largo: dias - inicio,
              detalle: (
                <>
                  <strong>{t.texto}</strong> · {l.persona.nombre}
                  <div style={{ color: 'var(--gris)' }}>
                    {t.periodos} {t.periodos === 1 ? 'periodo' : 'periodos'}, desde el {fechaCorta(t.desde)}
                  </div>
                </>
              ),
            };
          }),
        )}
      />
    </Tarjeta>
  );
}

// Cuanto le cae para su tamano (CEB-223): imprevistos abiertos por cada 10% de
// su cotidianidad.
export function Carga({ cargas, perfilDe }: { cargas: readonly CargaDe[]; perfilDe: (id: string) => string }) {
  return (
    <Tarjeta
      titulo="Cuánto le cae para su tamaño"
      nota="Imprevistos abiertos por cada 10% de su cotidianidad."
      vacio={cargas.length === 0 ? 'Nadie tiene imprevistos abiertos.' : null}
      leyenda={[
        { color: AZUL, texto: 'en plazo' },
        { color: VENCIDO, texto: 'vencidos' },
      ]}
    >
      <GraficaCarga
        filas={cargas.map((c) => ({
          nombre: c.persona.nombre,
          enlace: perfilDe(c.persona.id),
          enPlazo: c.carga.enPlazo,
          vencidos: c.carga.vencidos,
          detalle: (
            <>
              <strong>{c.persona.nombre}</strong> · {uno(c.carga.total)} por cada 10%
              <div style={{ color: 'var(--gris)' }}>
                {abiertos(c).total} abiertos ({abiertos(c).vencidos} vencidos) con cotidianidad {c.cotidianidad}%
              </div>
            </>
          ),
        }))}
      />
    </Tarjeta>
  );
}

// Las mas delegadas (CEB-224): la parte de sus ocurrencias que se delego en la
// ventana, en proporcion y no en veces. Una delegacion que se repite es un
// traspaso que nadie ha hecho.
export function MasDelegadas({ repetidas, perfilDe }: { repetidas: readonly DelegacionRepetida[]; perfilDe?: (funcionId: string) => string | null }) {
  return (
    <Tarjeta
      titulo="Las más delegadas"
      nota={`Parte de sus ocurrencias delegada en ${VENTANA_DE_DELEGACION} días; desde ${MINIMO_DE_DELEGACIONES} delegaciones.`}
      vacio={repetidas.length === 0 ? 'Ninguna función se está delegando seguido.' : null}
      leyenda={[
        { color: AZUL, texto: 'delegada' },
        { color: DEVUELTA, texto: 'de eso, devuelta' },
      ]}
    >
      <GraficaDelegadas
        filas={repetidas.map((r) => ({
          nombre: r.texto,
          enlace: perfilDe?.(r.funcionId) ?? null,
          delegada: (r.proporcion - r.proporcionDevuelta) * 100,
          devuelta: r.proporcionDevuelta * 100,
          detalle: (
            <>
              <strong>{r.texto}</strong> · {pct(r.proporcion * 100)} de sus ocurrencias
              <div style={{ color: 'var(--gris)' }}>
                delega {r.supervisor} · {delegadaVeces(r)}
              </div>
            </>
          ),
        }))}
      />
    </Tarjeta>
  );
}

// "delegada 3 veces (1 devuelta)": igual en la grafica y en la fila de la funcion.
export const delegadaVeces = (r: Pick<DelegacionRepetida, 'delegadas' | 'devueltas'>) =>
  `delegada ${r.delegadas} ${r.delegadas === 1 ? 'vez' : 'veces'}${r.devueltas > 0 ? ` (${r.devueltas} ${r.devueltas === 1 ? 'devuelta' : 'devueltas'})` : ''}`;

// La caja de cada grafica. Vacia, se encoge a una linea con su tilde: una
// grafica sin nada que decir no ocupa lo mismo que una que si.
function Tarjeta({
  titulo,
  nota,
  vacio,
  leyenda,
  children,
}: {
  titulo: string;
  nota: string;
  vacio: string | null;
  leyenda?: readonly { color: string; texto: string }[];
  children: ReactNode;
}) {
  return (
    <section style={GRAFICA}>
      <header>
        <h2 style={TITULO}>{titulo}</h2>
        {!vacio && <p style={NOTA}>{nota}</p>}
      </header>
      {vacio ? (
        <p style={NADA}>✓ {vacio}</p>
      ) : (
        <>
          {leyenda && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12, color: 'var(--gris)' }}>
              {leyenda.map((l) => (
                <li key={l.texto} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 12,
                      height: 10,
                      borderRadius: 2,
                      background: l.color.startsWith('url') ? `repeating-linear-gradient(45deg, ${FUNCION} 0 3px, rgba(255,255,255,0.75) 3px 5px)` : l.color,
                    }}
                  />
                  {l.texto}
                </li>
              ))}
            </ul>
          )}
          {children}
        </>
      )}
    </section>
  );
}

const GRAFICA = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  background: 'var(--panel)',
  borderRadius: 18,
  padding: '16px 18px',
  minWidth: 0,
} as const;

const TITULO = { fontSize: 16, fontWeight: 700, margin: 0 } as const;
const NOTA = { fontSize: 12.5, color: 'var(--gris)', margin: '3px 0 0' } as const;
const NADA = { fontSize: 13.5, color: 'var(--gris)', margin: 0 } as const;
