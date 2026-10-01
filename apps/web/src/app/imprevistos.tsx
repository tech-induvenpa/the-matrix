import {
  cifrasPor,
  cuadranteDelImprevisto,
  cuandoSePidio,
  emojiDe,
  opcionesDeUrgencia,
  retrasoDe,
  type Calendario,
  type Cifras,
} from '@matriz/dominio';
import { comoVence, fechaConDia, fechaCorta, quienPidio, sumarDias, type FilaImprevisto, type QuienPide } from '@/lib/datos';
import {
  borrarImprevisto,
  desmarcarImprevisto,
  marcarImprevistoHecho,
  marcarImprevistoSinHacer,
  registrarImprevisto,
} from './acciones';
import { Accion } from './accion';
import { Enviar, Redondo } from './boton';
import { PorQue } from './porque';
import { Confirmar } from './confirmar';
import { CIRCULO, COLOR, Check, Numero } from './tarjeta';
import { NuevoMensaje, Titulo, type Perfil } from './perfil';
import { BotonDeHistoria } from './abrir';

// Un imprevisto: trabajo que llego sin estar en el reparto de nadie (ADR 0009).
// Su urgencia se calcula como la de cualquier ocurrencia desde el vencimiento
// que se eligio al anotarlo (ADR 0013). Vencido sin marca sigue aqui, con su
// retraso, y con el dia en que se pidio: puede llevar semanas abierto. Con su
// importancia cae en un cuadrante y toma su color, como una ocurrencia
// (CEB-242), aunque siga en su propio bloque.
export function TarjetaDeImprevisto({
  i,
  hoy,
  calendario,
  quienesPiden,
  puedeBorrar,
  puedeMarcar = true,
  nota,
  perfil,
}: {
  i: FilaImprevisto;
  hoy: string;
  calendario: Calendario;
  quienesPiden: readonly QuienPide[];
  puedeBorrar: boolean;
  puedeMarcar?: boolean;
  // Una linea de mas bajo el texto, como la razon de una devolucion.
  nota?: string;
  perfil?: Perfil;
}) {
  const { urgencia, cuadrante } = cuadranteDelImprevisto(i.importancia, i.vence, hoy, calendario);
  const { velo } = COLOR[cuadrante];
  const retraso = retrasoDe(i.vence, hoy, calendario);
  const pedido = cuandoSePidio(i.pedido_en, hoy);

  return (
    <article style={{ ...TARJETA, ...COLOR[cuadrante], position: 'relative' }}>
      {perfil?.sinLeer && <NuevoMensaje />}
      {/* Del color del texto: un vencido cae en hacer ya, que ya es rojo. */}
      {retraso > 0 && <span style={{ width: 5, alignSelf: 'stretch', borderRadius: 999, background: 'currentColor', flexShrink: 0 }} />}

      <span style={{ ...CIRCULO, background: velo }}>{emojiDe(urgencia)}</span>

      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minWidth: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
          <Titulo perfil={perfil} punto={false}>
            {i.texto}
          </Titulo>
        </span>
        <span style={{ fontSize: 13, opacity: 0.78 }}>
          {/* Una delegacion es trabajo de su supervisor que le toca hacer a el (ADR 0012). */}
          {i.delega_funcion ? 'delegado por' : 'pedido por'} {quienPidio(i, quienesPiden)}{' '}
          {pedido === 'hoy' ? 'hoy' : `el ${fechaCorta(pedido)}`} ·{' '}
          {retraso > 0 ? (
            <strong>
              {retraso} {retraso === 1 ? 'día hábil' : 'días hábiles'} de retraso
            </strong>
          ) : (
            comoVence(i.vence, hoy)
          )}
        </span>
        {nota && <span style={{ fontSize: 12.5, fontWeight: 600 }}>{nota}</span>}
      </span>

      {/* Lo de la derecha va junto: en un telefono la tarjeta baja de linea
          entera, sin dejar un boton suelto abajo. */}
      <span style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center', marginLeft: 'auto' }}>
        <Numero etiqueta="IMP" valor={i.importancia} velo={velo} />
        <Numero etiqueta="URG" valor={urgencia} velo={velo} />

        {puedeMarcar && (
          <span style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
            <Accion accion={marcarImprevistoHecho.bind(null, i.id)}>
              <Redondo titulo="¡Hecho!" color="#2E7D32" tamano={40}>
                <Check />
              </Redondo>
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
          <Confirmar
            accion={borrarImprevisto.bind(null, i.id)}
            titulo="Borrar: lo registré por error"
            pregunta={`¿Borrar «${i.texto}»?`}
            detalle="Al borrar la tarea no impacta en su ponderación y desaparece de su lista."
            si="Borrar"
            estilo={{ ...REDONDO, fontSize: 13 }}
          >
            🗑
          </Confirmar>
        )}
        {perfil && <BotonDeHistoria clave={perfil.clave} velo={velo} />}
      </span>
      {perfil?.contenido}
    </article>
  );
}

// Registrar es de un solo paso y va plegado: la pantalla es para trabajar, no
// para llenar formularios. Se elige para cuando con la misma escala de urgencia
// que ya se ve en las tareas (ADR 0013); por defecto 8, manana, como siempre. Y
// cuan importante es, de 0 a 9; por defecto 5 (CEB-241).
export function NuevoImprevisto({
  empleadoId,
  quienesPiden,
  pidioPorDefecto,
  hoy,
  calendario,
  rotulo = '＋ Me cayó un imprevisto',
  fila = false,
}: {
  empleadoId: string;
  quienesPiden: readonly QuienPide[];
  pidioPorDefecto?: string;
  hoy: string;
  calendario: Calendario;
  rotulo?: string;
  // Como una fila mas, en gris, al final de la lista.
  fila?: boolean;
}) {
  const cuando = (vence: string) => (vence === hoy ? 'hoy' : vence === sumarDias(hoy, 1) ? 'mañana' : fechaConDia(vence));

  return (
    <details className={fila ? 'nuevo-item' : undefined} style={{ fontSize: 14 }}>
      <summary style={{ cursor: 'pointer', color: 'var(--gris)', fontWeight: 600 }}>{rotulo}</summary>
      <Accion accion={registrarImprevisto.bind(null, empleadoId)} style={FORMULARIO}>
        <input name="texto" required placeholder="¿Qué hay que hacer?" style={{ ...CAMPO, flex: '1 1 220px' }} />
        <select name="urgencia" defaultValue="8" style={CAMPO} aria-label="Urgencia: para cuándo">
          {opcionesDeUrgencia(hoy, calendario).map((o) => (
            <option key={o.urgencia} value={o.urgencia}>
              {o.emoji} {o.urgencia} · {cuando(o.vence)}
            </option>
          ))}
        </select>
        {/* Cuan importante es, como la importancia de una funcion. No se edita
            despues: si esta mal, se borra y se anota otro. */}
        <select name="importancia" defaultValue="5" style={CAMPO} aria-label="Importancia">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <option key={n} value={n}>
              IMP {n}
            </option>
          ))}
        </select>
        {/* "¿Quien?" solo aparece si lo pidio otra persona (ver globals.css). El
            contenedor no ocupa lugar: los campos siguen en la misma fila. */}
        <div className="quien-pidio" style={{ display: 'contents' }}>
          <select name="pidio" defaultValue={pidioPorDefecto ?? 'otro'} style={CAMPO} aria-label="Quién lo pidió">
            {quienesPiden.map((q) => (
              <option key={q.id} value={q.id}>
                lo pidió {q.nombre}
              </option>
            ))}
            <option value="otro">lo pidió otra persona…</option>
          </select>
          <input name="otro" placeholder="¿Quién?" style={{ ...CAMPO, flex: '1 1 180px' }} />
        </div>
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
    c.devueltos && `${c.devueltos} devueltos`,
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
  perfilDe,
}: {
  imprevistos: readonly FilaImprevisto[];
  // Por imprevisto, los previstos que el empleado dijo que desplazo.
  explico: ReadonlyMap<string, readonly string[]>;
  quienesPiden: readonly QuienPide[];
  hoy: string;
  calendario: Calendario;
  perfilDe?: (i: FilaImprevisto) => Perfil;
}) {
  if (imprevistos.length === 0) return null;

  const marcadaEn = (i: FilaImprevisto) => ({ ...i, marcadaEn: i.marcada_en, borradoEn: i.borrado_en, devueltoEn: i.devuelto_en });
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
        {imprevistos.map((i) => {
          const perfil = perfilDe?.(i);
          return (
            <div key={i.id} style={{ ...FILA, flexWrap: perfil?.contenido ? 'wrap' : undefined }}>
              <span style={{ flexGrow: 1, minWidth: 0 }}>
                <Titulo perfil={perfil}>{i.texto}</Titulo>
                <span style={{ color: 'var(--gris)' }}>
                  {' '}
                  · {quienPidio(i, quienesPiden)} · {fechaCorta(i.pedido_en.slice(0, 10))}
                </span>
                {i.devuelto_razon && (
                  <span style={{ display: 'block', fontSize: 12.5, color: '#9E3322' }}>
                    te lo devolvió: “{i.devuelto_razon}”
                  </span>
                )}
                {(explico.get(i.id) ?? []).length > 0 && (
                  <span style={{ display: 'block', fontSize: 12.5, color: '#8A5A3E' }}>
                    desplazó: {explico.get(i.id)!.join(', ')}
                  </span>
                )}
              </span>
              <span style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                {i.devuelto_en
                  ? '↩ devuelto'
                  : i.resultado
                    ? COMO_SE_MARCO[i.resultado]
                    : retrasoDe(i.vence, hoy, calendario) > 0
                      ? '🐢 abierto, vencido'
                      : 'abierto'}
              </span>
              {/* Una devolucion no se deshace: la decidio el supervisor. */}
              {i.resultado && !i.devuelto_en && (
                <Accion accion={desmarcarImprevisto.bind(null, i.id)}>
                  <Enviar style={{ ...BOTON, height: 28, fontSize: 12.5 }} enviando="…">
                    Deshacer
                  </Enviar>
                </Accion>
              )}
              {perfil?.contenido}
            </div>
          );
        })}
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

const TARJETA = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
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
