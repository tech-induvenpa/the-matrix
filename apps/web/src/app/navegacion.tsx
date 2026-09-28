'use client';

import { usePathname } from 'next/navigation';
import { Ir } from './ir';

// Cada rol tiene su menu y ninguno ve el del otro: al administrador, "Esta
// semana" y "El mes" lo mandaban de vuelta al panel, y al empleado no le
// existen estas pantallas.
export function Navegacion({
  entradas,
  salida,
}: {
  entradas: { href: string; texto: string; externo?: boolean; porMes?: boolean }[];
  salida?: () => Promise<void>;
}) {
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
                <form action={e.href} method="get" style={PANEL}>
                  <label style={{ fontSize: 12.5, color: 'var(--gris)', fontWeight: 500 }}>
                    ¿Qué mes?
                    <select name="mes" defaultValue={MESES[0]!.valor} style={SELECTOR}>
                      {MESES.map((m) => (
                        <option key={m.valor} value={m.valor}>
                          {m.texto}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" style={BOTON}>
                    Descargar
                  </button>
                </form>
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

export const DEL_EMPLEADO = [
  { href: '/', texto: 'Esta semana' },
  { href: '/mes', texto: 'El mes' },
];

export const DEL_ADMINISTRADOR = [
  { href: '/admin', texto: 'Tu gente' },
  { href: '/admin/reporte', texto: 'Qué se arrastra' },
  { href: '/admin/razones', texto: 'Qué dijeron' },
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
