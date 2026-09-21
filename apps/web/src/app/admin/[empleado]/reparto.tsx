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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{suma}</span>
        <span style={{ fontSize: 14, color: 'var(--gris)' }}>de 100</span>
        {falta !== 0 && (
          <span style={{ fontSize: 14, fontWeight: 600, color: '#D9503A' }}>
            {falta > 0 ? `faltan ${falta}` : `sobran ${-falta}`}
          </span>
        )}
        {hayBorrador && (
          <span style={{ fontSize: 12.5, color: '#8A7A3E', marginLeft: 'auto' }}>
            Sin publicar · tu equipo sigue viendo lo anterior
          </span>
        )}
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

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <Enviar style={BOTON} enviando="Guardando…">
              Guardar sin publicar
            </Enviar>
          </div>
        </div>
      </Accion>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Accion accion={publicarReparto.bind(null, empleadoId)}>
          <Enviar
            style={{ ...BOTON, background: falta === 0 ? 'var(--tinta)' : 'rgba(26,23,19,0.25)', color: '#fff' }}
            enviando="Publicando…"
          >
            Publicar
          </Enviar>
        </Accion>

        {hayBorrador && (
          <Accion accion={descartarBorrador.bind(null, empleadoId)}>
            <Enviar style={{ ...BOTON, background: 'none', color: 'var(--gris)' }} enviando="…">
              Descartar el borrador
            </Enviar>
          </Accion>
        )}
      </div>
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
