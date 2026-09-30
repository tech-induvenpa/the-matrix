'use client';

import { usePathname } from 'next/navigation';
import { Ir } from './ir';
import { Accion } from './accion';
import type { Aviso } from './avisos';
import type { MesDelCierre } from '@/lib/cierre-del-mes';

// Cada rol tiene su menu y ninguno ve el del otro: al administrador, "Esta
// semana" y "El mes" lo mandaban de vuelta al panel, y al empleado no le
// existen estas pantallas.
export function Navegacion({
  entradas,
  salida,
  personas = [],
  cierre,
}: {
  entradas: { href: string; texto: string; externo?: boolean; porMes?: boolean }[];
  salida?: () => Promise<void>;
  // Quienes pueden elegirse en la descarga. Solo el administrador las recibe.
  personas?: readonly { id: string; nombre: string }[];
  // Los meses con su cierre, y reabrir y cerrar (CEB-229). Solo el administrador.
  cierre?: {
    meses: readonly MesDelCierre[];
    // Para la descarga "Nomina del mes", una por empresa (CEB-233).
    empresas: readonly { id: string; nombre: string }[];
    reabrir: (formulario: FormData) => Promise<Aviso | undefined>;
    cerrar: (mes: string) => Promise<Aviso | undefined>;
  };
}) {
  const meses = cierre?.meses ?? MESES;

  const donde = usePathname();

  return (
    // Una banda de verdad, de borde a borde. Sin ella el menu quedaba flotando
    // sobre el blanco, mas adentro que el contenido y sin nada que lo sujetara.
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--panel)',
        borderBottom: '1px solid rgba(26,23,19,0.08)',
      }}
    >
      <nav
        style={{
          display: 'flex',
          gap: 18,
          alignItems: 'center',
          flexWrap: 'wrap',
          maxWidth: 1440,
          margin: '0 auto',
          padding: '12px 34px',
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {entradas.map((e) => {
          const aqui = donde === e.href;
          const estilo = { color: aqui ? 'var(--tinta)' : 'var(--gris)', textDecoration: 'none' };

          // La descarga se pide por mes: el menu se despliega al hacer clic y
          // pide confirmar con el boton. `details` nativo, sin JavaScript de por
          // medio; el formulario GET baja el archivo.
          if (e.porMes) {
            return (
              <details key={e.href} style={{ position: 'relative' }}>
                <summary style={{ ...estilo, cursor: 'pointer', listStyle: 'none' }}>{e.texto}</summary>
                <div style={PANEL}>
                  <form action={e.href} method="get" style={COLUMNA}>
                    <label style={{ fontSize: 12.5, color: 'var(--gris)', fontWeight: 500 }}>
                      ¿Qué mes?
                      <select name="mes" defaultValue={meses[0]!.valor} style={SELECTOR}>
                        {meses.map((m) => (
                          <option key={m.valor} value={m.valor}>
                            {m.texto}
                            {'estado' in m && ` · ${ESTADO[m.estado.estado]}${m.hasta ? ` hasta el ${m.hasta}` : ''}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    {personas.length > 0 && (
                      <fieldset style={PERSONAS}>
                        <legend style={{ fontSize: 12.5, color: 'var(--gris)', fontWeight: 500, padding: 0, marginBottom: 4 }}>
                          ¿De quién? <span style={{ fontWeight: 400 }}>Sin marcar, de todos.</span>
                        </legend>
                        {personas.map((p) => (
                          <label key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5, fontWeight: 500 }}>
                            <input type="checkbox" name="persona" value={p.id} />
                            {p.nombre}
                          </label>
                        ))}
                      </fieldset>
                    )}
                    <button type="submit" style={BOTON}>
                      Descargar
                    </button>
                  </form>
                  {cierre && <LaNomina meses={cierre.meses} empresas={cierre.empresas} />}
                  {cierre && <ElCierre {...cierre} />}
                </div>
              </details>
            );
          }

          // La descarga no es una pantalla: es un archivo, y Link la trataria
          // como navegacion.
          return e.externo ? (
            <a key={e.href} href={e.href} style={estilo}>
              {e.texto}
            </a>
          ) : (
            <Ir key={e.href} href={e.href} style={estilo}>
              {e.texto}
            </Ir>
          );
        })}

        {salida && (
          <form action={salida} style={{ marginLeft: 'auto' }}>
            <button
              type="submit"
              style={{ background: 'none', border: 0, padding: 0, color: 'var(--gris)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
            >
              Salir
            </button>
          </form>
        )}
      </nav>
    </div>
  );
}

// "Nomina del mes", para finanzas (CEB-233): un archivo por empresa, y solo de
// meses cerrados, porque el mes en curso es provisional. La descarga de
// siempre, arriba, no cambia.
function LaNomina({ meses, empresas }: { meses: readonly MesDelCierre[]; empresas: readonly { id: string; nombre: string }[] }) {
  const cerrados = meses.filter((m) => m.estado.estado === 'cerrado');
  if (!cerrados.length || !empresas.length) return null;

  return (
    <form action="/admin/nomina" method="get" style={{ ...CIERRE, gap: 6 }}>
      <span style={{ fontSize: 12.5, color: 'var(--gris)', fontWeight: 500 }}>Nómina del mes, para finanzas</span>
      <select name="mes" defaultValue={cerrados[0]!.valor} aria-label="Qué mes" style={SELECTOR}>
        {cerrados.map((m) => (
          <option key={m.valor} value={m.valor}>
            {m.texto}
          </option>
        ))}
      </select>
      <select name="empresa" defaultValue={empresas[0]!.id} aria-label="Qué empresa" style={SELECTOR}>
        {empresas.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre}
          </option>
        ))}
      </select>
      <button type="submit" style={SECUNDARIO}>
        Descargar la nómina
      </button>
    </form>
  );
}

// Reabrir y volver a cerrar, donde se elige el mes para descargar (CEB-229).
// Son formularios aparte, debajo del de la descarga: un formulario no va
// dentro de otro.
function ElCierre({ meses, reabrir, cerrar }: Omit<NonNullable<Parameters<typeof Navegacion>[0]['cierre']>, 'empresas'>) {
  const cerrados = meses.filter((m) => m.estado.estado === 'cerrado');
  const reabiertos = meses.filter((m) => m.estado.estado === 'reabierto');
  if (!cerrados.length && !reabiertos.length) return null;

  return (
    <div style={CIERRE}>
      <span style={{ fontSize: 12.5, color: 'var(--gris)', fontWeight: 500 }}>
        El mes se cierra solo a las 23:59 de su último día hábil.
      </span>
      {reabiertos.map((m) => (
        <Accion key={m.valor} accion={() => cerrar(m.valor)} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
          <span style={{ flexGrow: 1 }}>
            {m.texto}: reabierto hasta el {m.hasta}
          </span>
          <button type="submit" style={SECUNDARIO}>
            Cerrarlo ya
          </button>
        </Accion>
      ))}
      {cerrados.length > 0 && (
        <Accion accion={reabrir} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <select name="mes" defaultValue={cerrados[0]!.valor} style={SELECTOR}>
            {cerrados.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.texto}
              </option>
            ))}
          </select>
          <textarea name="razon" required rows={2} placeholder="¿Por qué se reabre?" style={RAZON} />
          <button type="submit" style={SECUNDARIO}>
            Reabrir para todos
          </button>
        </Accion>
      )}
    </div>
  );
}

const ESTADO = { abierto: 'abierto', cerrado: 'cerrado', reabierto: 'reabierto' } as const;

export const DEL_EMPLEADO = [
  { href: '/', texto: 'Esta semana' },
  { href: '/mes', texto: 'El mes' },
];

// Un supervisor es un empleado con gente a cargo (CEB-145): su menu es el de
// cualquiera, mas su equipo. En pantalla se dice "responsable" y "equipo"; en
// el modelo, supervisor y su gente.
export const DEL_SUPERVISOR = [...DEL_EMPLEADO, { href: '/equipo', texto: 'El equipo' }];

export const DEL_ADMINISTRADOR = [
  { href: '/admin', texto: 'El equipo' },
  { href: '/admin/calendario', texto: 'El calendario' },
  { href: '/admin/descarga', texto: 'Descargar ↓', porMes: true },
];

// Los ultimos doce meses, del mas reciente al mas viejo, como "septiembre de
// 2026". El valor viaja como AAAA-MM.
// ponytail: calculado al cargar el modulo; si la pestaña queda abierta de un mes
// a otro, el nuevo aparece al recargar.
const MESES = Array.from({ length: 12 }, (_, i) => {
  const hoy = new Date();
  const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
  return {
    valor: d.toISOString().slice(0, 7),
    texto: new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d),
  };
});

const PANEL = {
  position: 'absolute',
  top: 'calc(100% + 10px)',
  left: 0,
  zIndex: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 12,
  borderRadius: 16,
  background: '#ffffff',
  boxShadow: '0 10px 30px rgba(26,23,19,0.18)',
  minWidth: 220,
} as const;

const COLUMNA = { display: 'flex', flexDirection: 'column', gap: 10 } as const;

const CIERRE = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  borderTop: '1px solid rgba(26,23,19,0.10)',
  paddingTop: 10,
  maxWidth: 280,
} as const;

const RAZON = {
  borderRadius: 12,
  border: '1px solid rgba(26,23,19,0.12)',
  padding: '8px 12px',
  fontSize: 13.5,
  fontFamily: 'inherit',
  resize: 'vertical',
} as const;

const SECUNDARIO = {
  height: 32,
  padding: '0 14px',
  borderRadius: 999,
  border: '1px solid rgba(26,23,19,0.18)',
  background: '#ffffff',
  color: 'var(--tinta)',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
} as const;

const PERSONAS = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  border: 'none',
  margin: 0,
  padding: 0,
  maxHeight: 220,
  overflowY: 'auto',
  color: 'var(--tinta)',
} as const;

const SELECTOR = {
  display: 'block',
  width: '100%',
  marginTop: 4,
  height: 34,
  borderRadius: 999,
  border: '1px solid rgba(26,23,19,0.12)',
  padding: '0 12px',
  fontSize: 14,
  color: 'var(--tinta)',
  background: '#ffffff',
} as const;

const BOTON = {
  height: 34,
  borderRadius: 999,
  border: 0,
  background: 'var(--tinta)',
  color: '#ffffff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
} as const;
