'use client';

import { useState } from 'react';
import { Accion } from '../../accion';
import { Enviar } from '../../boton';
import { descartarBorrador, guardarBorrador, publicarReparto } from '../acciones';

type Fila = { id: string; texto: string; ponderacion: number };

// Repartir el cien de una persona. Nadie cambia el peso de una funcion suelta:
// se redistribuye el todo, y por eso la suma esta siempre a la vista (ADR 0008).
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
  const falta = 100 - suma;

  // Los botones son de un formulario, no de un estado, y eso confundia: al
  // publicar seguian ahi igual que antes y parecia que no habia pasado nada.
  // Ahora solo aparecen cuando hay algo que guardar o que publicar.
  const cambiado = funciones.some((f) => (pesos[f.id] ?? 0) !== f.ponderacion);
  const hayQueHacerAlgo = cambiado || hayBorrador;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{suma}</span>
        <span style={{ fontSize: 14, color: 'var(--gris)' }}>de 100</span>
        {falta !== 0 && (
          <span style={{ fontSize: 14, fontWeight: 600, color: '#D9503A' }}>
            {falta > 0 ? `faltan ${falta}` : `sobran ${-falta}`}
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
            </label>
          ))}

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
        </div>
      </Accion>

      {hayQueHacerAlgo && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Accion accion={publicarReparto.bind(null, empleadoId)}>
            <Enviar
              style={{ ...BOTON, background: falta === 0 ? 'var(--tinta)' : 'rgba(26,23,19,0.25)', color: '#fff' }}
              enviando="Publicando…"
            >
              Publicar
            </Enviar>
          </Accion>

          <span style={{ fontSize: 12, color: 'var(--gris)' }}>
            {falta === 0 ? 'Desde ese momento es lo que ve en su pantalla.' : 'Tiene que sumar 100 para poder publicar.'}
          </span>

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
