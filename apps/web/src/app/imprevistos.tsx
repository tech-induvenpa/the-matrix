import { cifrasPor, emojiDe, retrasoDe, urgenciaDe, type Calendario, type Cifras } from '@matriz/dominio';
import { comoVence, fechaCorta, quienPidio, type FilaImprevisto, type QuienPide } from '@/lib/datos';
import {
  borrarImprevisto,
  desmarcarImprevisto,
  marcarImprevistoHecho,
  marcarImprevistoSinHacer,
  registrarImprevisto,
} from './acciones';
import { Accion } from './accion';
import { Enviar } from './boton';
import { PorQue } from './porque';
import { CIRCULO, Numero } from './tarjeta';

// Un imprevisto: trabajo que llego sin estar en el reparto de nadie (ADR 0009).
// Su urgencia se calcula como la de cualquier ocurrencia, y por eso nace en 8 o
// 9 sin que nadie la escriba. Vencido sin marca sigue aqui, con su retraso.
export function TarjetaDeImprevisto({
  i,
  hoy,
  calendario,
  quienesPiden,
  puedeBorrar,
  puedeMarcar = true,
}: {
  i: FilaImprevisto;
  hoy: string;
  calendario: Calendario;
  quienesPiden: readonly QuienPide[];
  puedeBorrar: boolean;
  puedeMarcar?: boolean;
}) {
  const faltan = calendario.habilesEntre(hoy, i.vence);
  const retraso = retrasoDe(i.vence, hoy, calendario);

  return (
    <article style={TARJETA}>
      {retraso > 0 && <span style={{ width: 5, alignSelf: 'stretch', borderRadius: 999, background: '#D9503A', flexShrink: 0 }} />}

      <span style={{ ...CIRCULO, background: VELO }}>{emojiDe(faltan)}</span>

      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minWidth: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em' }}>{i.texto}</span>
        <span style={{ fontSize: 13, opacity: 0.78 }}>
          pedido por {quienPidio(i, quienesPiden)} ·{' '}
          {retraso > 0 ? (
            <strong style={{ color: '#9E3322' }}>
              {retraso} {retraso === 1 ? 'día hábil' : 'días hábiles'} de retraso
            </strong>
          ) : (
            comoVence(i.vence, hoy)
          )}
        </span>
      </span>

      <Numero etiqueta="URG" valor={urgenciaDe(faltan)} velo={VELO} />

      {puedeMarcar && (
        <span style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <Accion accion={marcarImprevistoHecho.bind(null, i.id)}>
            <Enviar style={BOTON} enviando="Marcando…">
              ¡Hecho!
            </Enviar>
          </Accion>
          <PorQue
            accion={marcarImprevistoSinHacer.bind(null, i.id, 'no_pude')}
            titulo="No pude"
            placeholder="¿Qué pasó?"
            estilo={{ ...REDONDO, color: '#C62828' }}
          >
            ✕
          </PorQue>
          <PorQue
            accion={marcarImprevistoSinHacer.bind(null, i.id, 'no_lo_tome')}
            titulo="No lo tomé"
            placeholder="¿Por qué no lo tomaste?"
            estilo={{ ...REDONDO, fontSize: 13 }}
          >
            🙅
          </PorQue>
        </span>
      )}

      {puedeBorrar && (
        <Accion accion={borrarImprevisto.bind(null, i.id)}>
          <Enviar style={{ ...REDONDO, fontSize: 13 }} enviando="…">
            <span title="Borrar: lo registré por error" aria-label="Borrar">
              🗑
            </span>
          </Enviar>
        </Accion>
      )}
    </article>
  );
}

// Registrar es de un solo paso y va plegado: la pantalla es para trabajar, no
// para llenar formularios. Solo "hoy" o "mañana": lo que se necesita para el
// viernes no es un imprevisto, se planifica.
export function NuevoImprevisto({
  empleadoId,
  quienesPiden,
  pidioPorDefecto,
  rotulo = '＋ Me cayó un imprevisto',
}: {
  empleadoId: string;
  quienesPiden: readonly QuienPide[];
  pidioPorDefecto?: string;
  rotulo?: string;
}) {
  return (
    <details style={{ fontSize: 14 }}>
      <summary style={{ cursor: 'pointer', color: 'var(--gris)', fontWeight: 600 }}>{rotulo}</summary>
      <Accion accion={registrarImprevisto.bind(null, empleadoId)} style={FORMULARIO}>
        <input name="texto" required placeholder="¿Qué te pidieron?" style={{ ...CAMPO, flex: '1 1 220px' }} />
        <select name="plazo" defaultValue="manana" style={CAMPO} aria-label="Para cuándo">
          <option value="hoy">para hoy</option>
          <option value="manana">para mañana</option>
        </select>
        <select name="pidio" defaultValue={pidioPorDefecto ?? 'otro'} style={CAMPO} aria-label="Quién lo pidió">
          {quienesPiden.map((q) => (
            <option key={q.id} value={q.id}>
              lo pidió {q.nombre}
            </option>
          ))}
          <option value="otro">lo pidió otra persona…</option>
        </select>
        <input name="otro" placeholder="¿Quién? (si fue otra persona)" style={{ ...CAMPO, flex: '1 1 180px' }} />
        <Enviar style={BOTON}>Anotar</Enviar>
      </Accion>
    </details>
  );
}

const COMO_SE_MARCO = { hecho: '✅ hecho', no_pude: '✕ no pude', no_lo_tome: '🙅 no lo tomé' } as const;

// Cifras en palabras. Son conteos, no tasas: el empleado ve hechos, no un
// porcentaje que perseguir (INV-3).
export const enPalabras = (c: Cifras) =>
  [
    `${c.llegados} ${c.llegados === 1 ? 'llegó' : 'llegaron'}`,
    c.hechos && `${c.hechos} hechos`,
    c.noPude && `${c.noPude} no pude`,
    c.noLoTome && `${c.noLoTome} no tomados`,
    c.abiertos && `${c.abiertos} abiertos`,
    c.vencidos && `${c.vencidos} vencidos`,
    c.retrasoPromedio && `${c.retrasoPromedio.toFixed(1)} días hábiles de retraso promedio`,
  ]
    .filter(Boolean)
    .join(' · ');

// El mes del empleado, contado: cuantos le cayeron, de quien, como los marco y
// que previstos vinculo a cuales. Es su defensa en hechos. Sin ponderacion
// desplazada: eso es peso salarial y lo ve el administrador (INV-22).
export function ImprevistosDelMes({
  imprevistos,
  explico,
  quienesPiden,
  hoy,
  calendario,
}: {
  imprevistos: readonly FilaImprevisto[];
  // Por imprevisto, los previstos que el empleado dijo que desplazo.
  explico: ReadonlyMap<string, readonly string[]>;
  quienesPiden: readonly QuienPide[];
  hoy: string;
  calendario: Calendario;
}) {
  if (imprevistos.length === 0) return null;

  const marcadaEn = (i: FilaImprevisto) => ({ ...i, marcadaEn: i.marcada_en, borradoEn: i.borrado_en });
  const total = cifrasPor(imprevistos.map(marcadaEn), () => 'todos', hoy, calendario).get('todos');
  const porQuien = cifrasPor(imprevistos.map(marcadaEn), (i) => quienPidio(i, quienesPiden), hoy, calendario);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 28 }}>
      <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Lo que te cayó este mes</h2>
      {total && <p style={{ fontSize: 14, margin: 0 }}>{enPalabras(total)}</p>}
      <p style={{ fontSize: 13, color: 'var(--gris)', margin: 0 }}>
        {[...porQuien].map(([quien, c]) => `${quien}: ${c.llegados}`).join(' · ')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {imprevistos.map((i) => (
          <div key={i.id} style={FILA}>
            <span style={{ flexGrow: 1, minWidth: 0 }}>
              {i.texto}
              <span style={{ color: 'var(--gris)' }}>
                {' '}
                · {quienPidio(i, quienesPiden)} · {fechaCorta(i.pedido_en.slice(0, 10))}
              </span>
              {(explico.get(i.id) ?? []).length > 0 && (
                <span style={{ display: 'block', fontSize: 12.5, color: '#8A5A3E' }}>
                  desplazó: {explico.get(i.id)!.join(', ')}
                </span>
              )}
            </span>
            <span style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
              {i.resultado ? COMO_SE_MARCO[i.resultado] : retrasoDe(i.vence, hoy, calendario) > 0 ? '🐢 abierto, vencido' : 'abierto'}
            </span>
            {i.resultado && (
              <Accion accion={desmarcarImprevisto.bind(null, i.id)}>
                <Enviar style={{ ...BOTON, height: 28, fontSize: 12.5 }} enviando="…">
                  Deshacer
                </Enviar>
              </Accion>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

const FILA = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: 'var(--suave)',
  borderRadius: 12,
  padding: '8px 14px',
  fontSize: 13.5,
} as const;

const VELO = 'rgba(42,35,19,0.12)';

const TARJETA = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: '#F2C4A8',
  color: '#2A2313',
  borderRadius: 20,
  padding: '10px 12px',
  flexWrap: 'wrap',
} as const;

const BOTON = {
  display: 'flex',
  alignItems: 'center',
  height: 34,
  padding: '0 14px',
  borderRadius: 999,
  background: '#ffffff',
  color: 'var(--tinta)',
  fontSize: 13.5,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
} as const;

const REDONDO = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  borderRadius: 999,
  background: '#ffffff',
  cursor: 'pointer',
} as const;

const FORMULARIO = { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } as const;

const CAMPO = {
  height: 36,
  borderRadius: 999,
  border: '1px solid rgba(26,23,19,0.12)',
  padding: '0 14px',
  fontSize: 14,
  background: '#ffffff',
  minWidth: 0,
} as const;
