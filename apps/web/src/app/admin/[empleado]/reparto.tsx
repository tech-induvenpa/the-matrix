'use client';

import { useState } from 'react';
import { PISO_DE_COTIDIANIDAD, proponerReparto } from '@matriz/dominio';
import { Accion } from '../../accion';
import { Enviar } from '../../boton';
import { descartarBorrador, guardarBorrador } from '../acciones';
import { Ir } from '../../ir';

type Fila = { id: string; texto: string; ponderacion: number };

// Repartir el cien de una persona. Nadie cambia el peso de una funcion suelta:
// se redistribuye el todo, y por eso la cuenta esta siempre a la vista (ADR
// 0008). Lo que no pesan las funciones es su cotidianidad, que se calcula y
// nunca baja del piso (ADR 0014).
export function Reparto({
  empleadoId,
  funciones,
  borrador,
}: {
  empleadoId: string;
  funciones: Fila[];
  borrador: { funcionId: string; ponderacion: number }[];
}) {
  const propuesto = new Map(borrador.map((b) => [b.funcionId, b.ponderacion]));
  const hayBorrador = borrador.length > 0;

  const [pesos, setPesos] = useState<Record<string, number>>(
    Object.fromEntries(funciones.map((f) => [f.id, propuesto.get(f.id) ?? f.ponderacion])),
  );

  const suma = Object.values(pesos).reduce((t, p) => t + (Number.isFinite(p) ? p : 0), 0);
  const cotidianidad = 100 - suma;
  const publicable = cotidianidad >= PISO_DE_COTIDIANIDAD;

  // La cotidianidad tambien se ajusta: lo que sube o baja se reparte entre las
  // funciones en proporcion, con la misma regla de todo lo demas (ADR 0014). Se
  // aplica al salir del campo, no con cada tecla: si no, escribir "25" pasaria
  // por "2", que cae bajo el piso.
  const [cotidianidadEscrita, setCotidianidadEscrita] = useState<string | null>(null);
  // Si se pidio menos del piso, se aplica el piso y se dice por que: si no,
  // parece que el campo ignoro lo que se escribio.
  const [quedoEnElPiso, setQuedoEnElPiso] = useState(false);
  const escribiendoBajoElPiso =
    cotidianidadEscrita !== null && cotidianidadEscrita !== '' && Number(cotidianidadEscrita) < PISO_DE_COTIDIANIDAD;
  const ajustarCotidianidad = () => {
    const pedida = Number(cotidianidadEscrita);
    setCotidianidadEscrita(null);
    if (cotidianidadEscrita === null || !Number.isInteger(pedida)) return;
    setQuedoEnElPiso(pedida < PISO_DE_COTIDIANIDAD);
    const { despues } = proponerReparto(
      Object.entries(pesos).map(([funcionId, ponderacion]) => ({ funcionId, ponderacion })),
      { cotidianidad: pedida },
    );
    setPesos(Object.fromEntries(despues.map((p) => [p.funcionId, p.ponderacion])));
  };

  // Los botones son de un formulario, no de un estado, y eso confundia: al
  // publicar seguian ahi igual que antes y parecia que no habia pasado nada.
  // Ahora solo aparecen cuando hay algo que guardar o que publicar.
  const cambiado = funciones.some((f) => (pesos[f.id] ?? 0) !== f.ponderacion);
  const hayQueHacerAlgo = cambiado || hayBorrador;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{cotidianidad}%</span>
        <span style={{ fontSize: 14, color: 'var(--gris)' }}>de cotidianidad</span>
        {!publicable && (
          <span style={{ fontSize: 14, fontWeight: 600, color: '#D9503A' }}>
            bajo el piso de {PISO_DE_COTIDIANIDAD}: sobran {PISO_DE_COTIDIANIDAD - cotidianidad} en las funciones
          </span>
        )}
        <span style={{ fontSize: 12.5, marginLeft: 'auto', color: hayQueHacerAlgo ? '#8A7A3E' : 'var(--gris)' }}>
          {hayBorrador
            ? 'Hay un borrador sin publicar · sigue viendo el reparto anterior'
            : cambiado
              ? 'Cambios sin guardar'
              : 'Publicado · esto es lo que ve ahora mismo'}
        </span>
      </div>

      <Accion accion={guardarBorrador.bind(null, empleadoId)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {funciones.map((f) => (
            <label
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'var(--suave)',
                borderRadius: 12,
                padding: '8px 14px',
              }}
            >
              <span style={{ flexGrow: 1, minWidth: 0, fontSize: 14 }}>{f.texto}</span>
              <input
                name={`peso:${f.id}`}
                type="number"
                min={0}
                max={100}
                value={pesos[f.id] ?? 0}
                onChange={(e) => setPesos({ ...pesos, [f.id]: Number(e.target.value) })}
                style={{
                  width: 64,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid rgba(26,23,19,0.18)',
                  padding: '0 8px',
                  fontSize: 14,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--gris)' }}>%</span>
              {/* Quitarla es archivarla o eliminarla: vive en su panel. */}
              <Ir href={`?editar=${f.id}`} style={{ fontSize: 12.5, color: '#C62828' }}>
                quitar
              </Ir>
            </label>
          ))}

          {/* Es lo que queda, y tambien se puede mover. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              border: '1.5px dashed rgba(26,23,19,0.18)',
              borderRadius: 12,
              padding: '8px 14px',
              color: publicable ? 'var(--gris)' : '#D9503A',
            }}
          >
            <span style={{ flexGrow: 1, minWidth: 0, fontSize: 14 }}>
              Cotidianidad <span style={{ fontSize: 12.5 }}>· lo que queda para lo que le pidan; al cambiarla, las funciones se reacomodan</span>
            </span>
            {/* Sin name: no viaja en el formulario. Se guarda lo que dejan las funciones. */}
            <input
              type="number"
              min={PISO_DE_COTIDIANIDAD}
              max={100}
              aria-label="Cotidianidad"
              value={cotidianidadEscrita ?? cotidianidad}
              onChange={(e) => {
                setCotidianidadEscrita(e.target.value);
                setQuedoEnElPiso(false);
              }}
              onBlur={ajustarCotidianidad}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  ajustarCotidianidad();
                }
              }}
              style={{
                width: 64,
                height: 32,
                borderRadius: 8,
                border: '1px solid rgba(26,23,19,0.18)',
                padding: '0 8px',
                fontSize: 14,
                fontWeight: 700,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                background: '#fff',
              }}
            />
            <span style={{ fontSize: 13 }}>%</span>
          </div>

          {/* Por que existe el piso, dicho donde se choca con el (ADR 0014). */}
          <p role="status" aria-live="polite" style={{ margin: '-2px 0 0', fontSize: 12.5, lineHeight: 1.45, color: '#9E3322', minHeight: 0 }}>
            {(escribiendoBajoElPiso || quedoEnElPiso || !publicable) &&
              `${quedoEnElPiso ? `Quedó en ${PISO_DE_COTIDIANIDAD}%. ` : ''}La cotidianidad no baja de ${PISO_DE_COTIDIANIDAD}%: es la parte del cargo por la que pesa todo lo que le piden fuera de sus funciones. Con menos, ese trabajo casi no contaría en su bono.`}
          </p>

          {hayQueHacerAlgo && (
            <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Enviar style={BOTON} enviando="Guardando…">
                Guardar sin publicar
              </Enviar>
              <span style={{ fontSize: 12, color: 'var(--gris)' }}>
                Lo dejas a medias y vuelves; nadie lo ve todavía.
              </span>
            </div>
          )}

          {/* Publicar viaja en el mismo formulario: publica lo que esta en
              pantalla, no el ultimo borrador guardado. Antes publicaba lo
              guardado, y con cambios sin guardar decia "suma 0" mostrando 100. */}
          {hayQueHacerAlgo && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Enviar
                name="publicar"
                value="si"
                style={{ ...BOTON, background: publicable ? 'var(--tinta)' : 'rgba(26,23,19,0.25)', color: '#fff' }}
                enviando="Publicando…"
              >
                Publicar
              </Enviar>
              <span style={{ fontSize: 12, color: 'var(--gris)' }}>
                {publicable
                  ? 'Desde ese momento es lo que ve en su pantalla.'
                  : `Su cotidianidad tiene que quedar en ${PISO_DE_COTIDIANIDAD} o más para poder publicar.`}
              </span>
            </div>
          )}
        </div>
      </Accion>

      {hayQueHacerAlgo && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>

          {hayBorrador && (
            <Accion accion={descartarBorrador.bind(null, empleadoId)}>
              <Enviar style={{ ...BOTON, background: 'none', color: 'var(--gris)' }} enviando="…">
                Descartar el borrador
              </Enviar>
            </Accion>
          )}
        </div>
      )}
    </div>
  );
}

const BOTON = {
  padding: '9px 18px',
  borderRadius: 999,
  background: 'rgba(26,23,19,0.06)',
  color: 'var(--tinta)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
} as const;
