import { notFound, redirect } from 'next/navigation';
import { esAdministrador } from '@/lib/administrador';
import { fechaCorta } from '@/lib/datos';
import { loDeMiGente, type ComoVaUnaFuncion, type PersonaACargo } from '@/lib/supervisor';
import { DEL_SUPERVISOR, Navegacion } from '../navegacion';
import { salir } from '../acciones';
import { NuevoImprevisto, TarjetaDeImprevisto } from '../imprevistos';

// El equipo (CEB-145): lo que un supervisor necesita para actuar el mismo dia.
// Que arrastra y desde cuando, que se atraso, que razones dieron y que les
// esta cayendo. Sin pesos, tasas ni bonos: eso es conversacion de sueldo, y es
// del administrador (INV-3).
export default async function TuGente() {
  if (await esAdministrador()) redirect('/admin');

  const { hoy, calendario, gente, quienesPiden, yo } = await loDeMiGente();
  // Quien no supervisa no tiene esta pantalla: un 404, como en /admin.
  if (gente.length === 0) notFound();

  return (
    <>
      <Navegacion entradas={DEL_SUPERVISOR} salida={salir} />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>El equipo 👥</h1>

        {gente.map((p) => {
          const abiertos = p.imprevistos.filter((i) => !i.resultado).sort((a, b) => a.vence.localeCompare(b.vence));
          return (
            // Un acordeon por persona: `details` nativo, sin JavaScript. Cerrado,
            // el resumen ya dice si hay algo que mirar.
            <details key={p.id} style={ACORDEON}>
              <summary style={RESUMEN}>
                <span style={{ fontSize: 20, fontWeight: 700, marginRight: 12 }}>{p.nombre}</span>
                <span style={{ fontSize: 13, ...(pendientes(p) ? { color: '#9E3322', fontWeight: 600 } : { color: 'var(--gris)' }) }}>
                  {resumenDe(p, abiertos.length)}
                </span>
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {p.funciones.map((f) => (
                  <div key={f.id} style={FILA}>
                    <span style={{ flexGrow: 1, minWidth: 0 }}>{f.texto}</span>
                    <span style={{ whiteSpace: 'nowrap', fontSize: 13, ...colorDe(f) }}>{comoVa(f)}</span>
                  </div>
                ))}
                {p.funciones.length === 0 && <p style={NADA}>Todavía no tiene funciones publicadas.</p>}
              </div>

              <h3 style={SUBTITULO}>Lo que le cayó</h3>
              {abiertos.map((i) => (
                <TarjetaDeImprevisto
                  key={i.id}
                  i={i}
                  hoy={hoy}
                  calendario={calendario}
                  quienesPiden={quienesPiden}
                  puedeMarcar={false}
                  puedeBorrar={false}
                />
              ))}
              {abiertos.length === 0 && <p style={NADA}>Nada abierto.</p>}
              <NuevoImprevisto empleadoId={p.id} quienesPiden={quienesPiden} pidioPorDefecto={yo} rotulo="＋ Pedirle un imprevisto" />

              {p.razones.length > 0 && (
                <>
                  <h3 style={SUBTITULO}>Lo que dijo</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {p.razones.slice(0, 10).map((r, n) => (
                      <div key={n} style={{ ...FILA, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 12.5, color: 'var(--gris)', whiteSpace: 'nowrap' }}>{fechaCorta(r.en)}</span>
                        <span style={{ flexGrow: 1, minWidth: 0 }}>
                          <strong>{r.quePaso}</strong> en {r.funcion}: “{r.razon}”
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              </div>
            </details>
          );
        })}
      </main>
    </>
  );
}

const pendientes = (p: PersonaACargo) => p.funciones.filter((f) => f.atrasadoDesde || f.arrastre?.periodos).length;

function resumenDe(p: PersonaACargo, abiertos: number): string {
  const n = pendientes(p);
  const partes = [
    n ? `${n} ${n === 1 ? 'función sin cumplirse' : 'funciones sin cumplirse'}` : 'todo al día',
    abiertos ? `${abiertos} ${abiertos === 1 ? 'imprevisto abierto' : 'imprevistos abiertos'}` : '',
  ];
  return partes.filter(Boolean).join(' · ');
}

const ACORDEON = { borderBottom: '1px solid rgba(26,23,19,0.10)', paddingBottom: 14 } as const;
// Sin display flex: el summary conserva su triangulo nativo, que es lo que dice que se abre.
const RESUMEN = { cursor: 'pointer' } as const;

// El arrastre en tiempo: el numero compara, la fecha dice si ya es grave.
function comoVa(f: ComoVaUnaFuncion): string {
  if (f.atrasadoDesde) return `🐢 atrasado desde el ${fechaCorta(f.atrasadoDesde)}`;
  if (f.arrastre?.periodos) {
    const { periodos, desde } = f.arrastre;
    return `arrastra ${periodos} ${periodos === 1 ? 'periodo' : 'periodos'}, desde el ${fechaCorta(desde!)}`;
  }
  return 'al día';
}

const colorDe = (f: ComoVaUnaFuncion) =>
  f.atrasadoDesde || f.arrastre?.periodos ? { color: '#9E3322', fontWeight: 600 } : { color: 'var(--gris)' };

const FILA = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: 'var(--suave)',
  borderRadius: 12,
  padding: '9px 14px',
  fontSize: 14,
} as const;

const SUBTITULO = { fontSize: 15, fontWeight: 700, margin: '6px 0 0' } as const;
const NADA = { color: 'var(--gris)', fontSize: 14, margin: 0 } as const;
