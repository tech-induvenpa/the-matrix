import { notFound, redirect } from 'next/navigation';
import { delFiltro } from '@matriz/dominio';
import { enPalabras, filtroDe, pertenencias, type ParametrosDelFiltro } from '@/lib/pertenencia';
import { Filtrar } from '../filtro';
import { esAdministrador } from '@/lib/administrador';
import { fechaCorta } from '@/lib/datos';
import { loDeMiGente, type PersonaACargo } from '@/lib/supervisor';
import type { ComoVaUnaFuncion } from '@/lib/equipo';
import { comoVa as enTiempo } from '../como-va';
import { DEL_SUPERVISOR, Navegacion } from '../navegacion';
import { salir } from '../acciones';
import { NuevoImprevisto } from '../imprevistos';
import { tareasAbiertasDe } from '@/lib/tareas';
import { perfiles } from '../perfil';
import { claveDeLaTarea, ListaDeTareas } from '../lista';
import { Punto } from '../abrir';
import { Ir } from '../ir';

// El equipo (CEB-145): lo que un supervisor necesita para actuar el mismo dia.
// Que arrastra y desde cuando, que se atraso, que razones dieron y que les
// esta cayendo. Cada persona tiene ademas su pagina, con sus pesos
// (equipo/[persona], ADR 0015). Sin bonos ni montos: eso es del administrador.
export default async function TuGente({ searchParams }: { searchParams: Promise<ParametrosDelFiltro & { tarea?: string }> }) {
  if (await esAdministrador()) redirect('/admin');

  const parametros = await searchParams;
  const [{ hoy, calendario, gente: todos, quienesPiden, yo }, { opciones, deIds }, conPerfil] = await Promise.all([
    loDeMiGente(),
    pertenencias(),
    perfiles(parametros.tarea),
  ]);
  // Quien no supervisa no tiene esta pantalla: un 404, como en /admin.
  if (todos.length === 0) notFound();

  // El filtro acota lo que lo_de_mi_gente ya devolvio: nunca trae a nadie que
  // no este a su cargo (INV-29). Si el texto coincide con funciones, quedan esas.
  const filtro = filtroDe(parametros);
  const gente = todos.flatMap((p) => {
    const conSuEmpresa = { ...p, ...deIds(p.empresaId, p.sedeId) };
    const medibles = p.funciones
      .filter((f) => f.tipo === 'entregable' || f.tipo === 'flujo')
      // Lo que mas tiempo lleva sin cumplirse, primero.
      .sort((a, b) => desdeCuando(a).localeCompare(desdeCuando(b)) || a.texto.localeCompare(b.texto));
    const funciones = delFiltro(conSuEmpresa, medibles, (f) => f.texto, filtro);
    return funciones ? [{ ...conSuEmpresa, funciones }] : [];
  });

  // Sus tareas abiertas, ocurrencias e imprevistos juntos (CEB-198).
  // ponytail: una lectura por persona; un equipo es de pocas.
  const tareas = new Map(await Promise.all(gente.map(async (p) => [p.id, await tareasAbiertasDe(p.id, hoy, calendario)] as const)));

  return (
    <>
      <Navegacion entradas={DEL_SUPERVISOR} salida={salir} />
      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>El equipo 👥</h1>

        <Filtrar opciones={opciones} valores={parametros} />
        {gente.length === 0 && <p style={{ color: 'var(--gris)', fontSize: 14 }}>Nadie de tu equipo coincide con el filtro.</p>}

        {gente.map((p) => {
          const abiertos = p.imprevistos.filter((i) => !i.resultado).sort((a, b) => a.vence.localeCompare(b.vence));
          return (
            // Un acordeon por persona: `details` nativo, sin JavaScript. Cerrado,
            // el resumen ya dice si hay algo que mirar.
            // Abierto si el perfil de la URL es de una de sus tareas.
            <details key={p.id} style={ACORDEON} open={tareas.get(p.id)?.some((t) => claveDeLaTarea(t) === parametros.tarea)}>
              <summary style={RESUMEN}>
                <span style={{ fontSize: 20, fontWeight: 700, marginRight: 12 }}>
                  {p.nombre}
                  {conPerfil.sinLeerDe(p.id) && <Punto />}
                </span>
                {p.empresa && <span style={{ fontSize: 13, color: 'var(--gris)', marginRight: 12 }}>{enPalabras(p)}</span>}
                <Ir href={`/equipo/${p.id}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--tinta)', marginRight: 12 }}>
                  Su perfil →
                </Ir>
                <span style={{ fontSize: 13, ...(pendientes(p) ? { color: '#9E3322', fontWeight: 600 } : { color: 'var(--gris)' }) }}>
                  {resumenDe(p, abiertos.length)}
                </span>
              </summary>
              {/* Sus funciones a un lado, lo del dia al otro. */}
              <div className="perfil" style={{ paddingTop: 14 }}>
                <aside style={FIJO}>
                  <h3 style={SUBTITULO}>Sus funciones</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {p.funciones.map((f) => (
                      <div key={f.id} style={FILA}>
                        <span style={{ flexGrow: 1, minWidth: 0 }}>{f.texto}</span>
                        <span style={{ fontSize: 12.5, ...colorDe(f) }}>{comoVa(f)}</span>
                      </div>
                    ))}
                    {p.funciones.length === 0 && <p style={NADA}>Todavía no tiene funciones publicadas.</p>}
                  </div>
                </aside>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                  <h3 style={SUBTITULO}>Sus tareas abiertas 🌪️</h3>
                  <ListaDeTareas
                    lista={tareas.get(p.id) ?? []}
                    hoy={hoy}
                    calendario={calendario}
                    quienesPiden={quienesPiden}
                    perfiles={conPerfil}
                    puedeBorrar={() => false}
                  />
                  <NuevoImprevisto
                    empleadoId={p.id}
                    quienesPiden={quienesPiden}
                    pidioPorDefecto={yo}
                    hoy={hoy}
                    calendario={calendario}
                    rotulo="＋ Nueva tarea"
                    fila
                  />

                  {p.razones.length > 0 && (
                    <>
                      <h3 style={{ ...SUBTITULO, marginTop: 8 }}>Lo que dijo</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {p.razones.slice(0, 10).map((r, n) => (
                          <div key={n} style={{ ...FILA, background: 'var(--suave)', alignItems: 'flex-start' }}>
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
              </div>
            </details>
          );
        })}
      </main>
    </>
  );
}

const pendientes = (p: Pick<PersonaACargo, 'funciones'>) => p.funciones.filter((f) => f.atraso || f.arrastre?.periodos).length;

// Sin arrastre ni atraso, al final.
const desdeCuando = (f: ComoVaUnaFuncion) => (f.arrastre?.periodos ? f.arrastre.desde : f.atraso?.desde) ?? '9999-12-31';

function resumenDe(p: Pick<PersonaACargo, 'funciones'>, abiertos: number): string {
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

const comoVa = (f: ComoVaUnaFuncion) => enTiempo(f) ?? 'al día';

const colorDe = (f: ComoVaUnaFuncion) =>
  f.atraso || f.arrastre?.periodos ? { color: '#9E3322', fontWeight: 600 } : { color: 'var(--gris)' };

// La columna fija, como en el perfil del administrador.
const FIJO = { background: 'var(--panel)', borderRadius: 18, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 } as const;

const FILA = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '4px 12px',
  background: '#fff',
  borderRadius: 12,
  padding: '9px 14px',
  fontSize: 14,
} as const;

const SUBTITULO = { fontSize: 15, fontWeight: 700, margin: 0 } as const;
const NADA = { color: 'var(--gris)', fontSize: 14, margin: 0 } as const;
