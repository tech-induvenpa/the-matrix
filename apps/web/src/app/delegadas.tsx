import type { EstadoDeLaDelegacion } from '@matriz/dominio';
import { comoVence, type FilaPedido } from '@/lib/datos';
import { devolver, marcarHecho } from './acciones';
import { Accion } from './accion';
import { Enviar } from './boton';
import { PorQue } from './porque';
import { Titulo, type Perfil } from './perfil';

export type Delegada = {
  id: string;
  funcionId: string;
  periodo: string;
  texto: string;
  empleadoId: string;
  nombre: string;
  vence: string;
  estado: EstadoDeLaDelegacion;
  razon: string | null;
};

// Lo que el supervisor delego (ADR 0012). Va debajo de sus tareas y no entre
// ellas: no le quita espacio a lo que tiene que hacer el. Primero lo que espera
// por el -- un "hecho" que revisar, un "no pude" que decidir --, despues lo que
// espera a su gente.
export function Delegadas({
  delegadas,
  hoy,
  gente,
  perfilDe,
}: {
  delegadas: readonly Delegada[];
  hoy: string;
  // A quien se le puede devolver: su gente de hoy.
  gente: readonly { id: string; nombre: string }[];
  perfilDe?: (d: Delegada) => Perfil;
}) {
  if (delegadas.length === 0) return null;

  const orden = (d: Delegada) => (d.estado === 'esperando' ? 1 : 0);
  const ordenadas = [...delegadas].sort((a, b) => orden(a) - orden(b) || a.vence.localeCompare(b.vence));

  return (
    <>
      <Separador>Delegadas</Separador>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {ordenadas.map((d) => (
          <div key={d.id} style={{ ...FILA, background: d.estado === 'esperando' ? 'var(--suave)' : '#F7E6C4' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                <Titulo perfil={perfilDe?.(d)}>{d.texto}</Titulo>
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--gris)' }}>
                {d.estado === 'para_revisar' && `Hecho por ${d.nombre} · revísalo`}
                {/* La ocurrencia ya volvio a su lista: desde alli la hace, la
                    marca "no pude" o la delega otra vez. */}
                {d.estado === 'no_pudo' && `${d.nombre} no pudo: “${d.razon ?? ''}” · volvió a tu lista`}
                {d.estado === 'no_tomada' && `${d.nombre} no la tomó: “${d.razon ?? ''}” · volvió a tu lista`}
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
                  extra={
                    <select name="aQuien" defaultValue={d.empleadoId} aria-label="A quién" style={SELECTOR}>
                      {gente.map((p) => (
                        <option key={p.id} value={p.id}>
                          devolvérsela a {p.nombre}
                        </option>
                      ))}
                      <option value="">me la quedo yo</option>
                    </select>
                  }
                >
                  Devolver
                </PorQue>
              </>
            )}
            {perfilDe?.(d).contenido}
          </div>
        ))}
      </div>
    </>
  );
}

// Lo que un supervisor le pidio a gente de otros equipos y sigue abierto
// (CEB-198). Calcado de delegadas: lo sigue y lo comenta desde su perfil.
export function LoQuePedi({ pedidos, hoy, perfilDe }: { pedidos: readonly FilaPedido[]; hoy: string; perfilDe: (p: FilaPedido) => Perfil }) {
  if (pedidos.length === 0) return null;

  return (
    <>
      <Separador>Lo que pedí</Separador>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {pedidos.map((p) => {
          const perfil = perfilDe(p);
          return (
            <div key={p.id} style={{ ...FILA, background: 'var(--suave)' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  <Titulo perfil={perfil}>{p.texto}</Titulo>
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--gris)' }}>
                  Se lo pediste a {p.nombre} · {comoVence(p.vence, hoy)}
                </span>
              </span>
              {perfil.contenido}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Separador({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gris)' }}>
        {children}
      </span>
      <span style={{ flexGrow: 1, height: 1, background: 'rgba(26,23,19,0.10)' }} />
    </div>
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

const SELECTOR = {
  height: 36,
  borderRadius: 999,
  border: '1px solid rgba(26,23,19,0.12)',
  padding: '0 12px',
  fontSize: 14,
  background: '#ffffff',
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
