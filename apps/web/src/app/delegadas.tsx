import type { EstadoDeLaDelegacion } from '@matriz/dominio';
import { comoVence } from '@/lib/datos';
import { devolver, marcarHecho } from './acciones';
import { Accion } from './accion';
import { Enviar } from './boton';
import { PorQue } from './porque';

export type Delegada = {
  id: string;
  funcionId: string;
  periodo: string;
  texto: string;
  nombre: string;
  vence: string;
  estado: EstadoDeLaDelegacion;
  razon: string | null;
};

// Lo que el supervisor delego (ADR 0012). Va debajo de sus tareas y no entre
// ellas: no le quita espacio a lo que tiene que hacer el. Primero lo que espera
// por el -- un "hecho" que revisar, un "no pude" que decidir --, despues lo que
// espera a su gente.
export function Delegadas({ delegadas, hoy }: { delegadas: readonly Delegada[]; hoy: string }) {
  if (delegadas.length === 0) return null;

  const orden = (d: Delegada) => (d.estado === 'esperando' ? 1 : 0);
  const ordenadas = [...delegadas].sort((a, b) => orden(a) - orden(b) || a.vence.localeCompare(b.vence));

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gris)' }}>
          Delegadas
        </span>
        <span style={{ flexGrow: 1, height: 1, background: 'rgba(26,23,19,0.10)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {ordenadas.map((d) => (
          <div key={d.id} style={{ ...FILA, background: d.estado === 'esperando' ? 'var(--suave)' : '#F7E6C4' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{d.texto}</span>
              <span style={{ fontSize: 12.5, color: 'var(--gris)' }}>
                {d.estado === 'para_revisar' && `Hecho por ${d.nombre} · revísalo`}
                {/* La ocurrencia ya volvio a su lista: desde alli la hace, la
                    marca "no pude" o la delega otra vez. */}
                {d.estado === 'no_pudo' && `${d.nombre} no pudo: “${d.razon ?? ''}” · volvió a tu lista`}
                {d.estado === 'esperando' && `Delegada a ${d.nombre} · ${comoVence(d.vence, hoy)}`}
              </span>
            </span>

            {/* Aprobar es la marca de siempre sobre su ocurrencia: es lo unico
                que la cierra (INV-25). */}
            {d.estado === 'para_revisar' && (
              <>
                <Accion accion={marcarHecho.bind(null, d.funcionId, d.periodo)}>
                  <Enviar style={BOTON} enviando="…">
                    Aprobar
                  </Enviar>
                </Accion>
                <PorQue
                  accion={devolver.bind(null, d.id)}
                  titulo="Devolver"
                  placeholder="¿Qué le falta? Lo va a leer"
                  estilo={{ ...BOTON, background: '#ffffff', color: 'var(--tinta)', border: 0 }}
                >
                  Devolver
                </PorQue>
              </>
            )}

          </div>
        ))}
      </div>
    </>
  );
}

const FILA = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minHeight: 48,
  borderRadius: 13,
  padding: '6px 12px',
  boxSizing: 'border-box',
  flexWrap: 'wrap',
} as const;

const BOTON = {
  display: 'flex',
  alignItems: 'center',
  height: 32,
  padding: '0 14px',
  borderRadius: 999,
  background: 'var(--tinta)',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
} as const;
