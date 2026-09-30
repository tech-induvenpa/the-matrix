import { notFound, redirect } from 'next/navigation';
import { enPalabras, pertenencias } from '@/lib/pertenencia';
import { esAdministrador } from '@/lib/administrador';
import { loDeMiGente } from '@/lib/supervisor';
import { tareasAbiertasDe } from '@/lib/tareas';
import { DEL_SUPERVISOR, Navegacion } from '../../navegacion';
import { salir } from '../../acciones';
import { NuevoImprevisto } from '../../imprevistos';
import { perfiles } from '../../perfil';
import { ListaDeTareas } from '../../lista';
import { Punto } from '../../abrir';
import { Ir } from '../../ir';
import { ComoVa } from '../../como-va';

// El perfil de una persona del equipo, para su supervisor (CEB-217): las dos
// columnas del perfil del administrador (admin/[empleado]), sin editar y sin
// dinero. Ve sus pesos y su cotidianidad (ADR 0015); no ve su bono ni ningun
// monto, y no toca su reparto ni sus datos: eso es del administrador.
export default async function SuPerfil({
  params,
  searchParams,
}: {
  params: Promise<{ persona: string }>;
  searchParams: Promise<{ tarea?: string }>;
}) {
  if (await esAdministrador()) redirect('/admin');

  const [{ persona }, { tarea }] = await Promise.all([params, searchParams]);
  const [{ hoy, calendario, gente, quienesPiden, yo }, { deIds }, conPerfil] = await Promise.all([
    loDeMiGente(),
    pertenencias(),
    perfiles(tarea),
  ]);

  // Solo su gente de hoy: a cualquier otro, un 404, como en /admin.
  const p = gente.find((g) => g.id === persona);
  if (!p) notFound();
  const tareas = await tareasAbiertasDe(p.id, hoy, calendario);
  const donde = enPalabras(deIds(p.empresaId, p.sedeId));

  return (
    <>
      <Navegacion entradas={DEL_SUPERVISOR} salida={salir} />
      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <header>
          <Ir href="/equipo" style={{ fontSize: 13, color: 'var(--gris)', textDecoration: 'none' }}>
            ← El equipo
          </Ir>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: '6px 0 0' }}>
            {p.nombre}
            {conPerfil.sinLeerDe(p.id) && <Punto />}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--gris)', margin: '5px 0 0' }}>
            {donde || 'sin empresa'} · {p.funciones.length} {p.funciones.length === 1 ? 'función' : 'funciones'} · cotidianidad {p.cotidianidad}%
          </p>
        </header>

        <div className="perfil">
          {/* Lo que cambia poco: su reparto, de solo lectura, con como va cada funcion. */}
          <aside style={FIJO}>
            <h2 style={H_FIJO}>Su reparto 🥧</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {p.funciones.map((f) => (
                <div key={f.id} style={FILA}>
                  <span style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 14 }}>{f.texto}</span>
                    <span style={{ fontSize: 12, color: 'var(--gris)' }}>
                      {f.tipo ?? 'sin tipo'} · {f.periodicidad}
                    </span>
                    {/* Como va su parte del cargo (CEB-219). */}
                    <ComoVa f={f} />
                  </span>
                  <span style={PESO}>{f.ponderacion}%</span>
                </div>
              ))}
              {p.funciones.length === 0 && <p style={NADA}>Todavía no tiene funciones publicadas.</p>}
              {/* Lo que queda para lo que le pidan: por aqui pesa todo imprevisto (ADR 0014). */}
              <div style={{ ...FILA, background: 'none', border: '1.5px dashed rgba(26,23,19,0.18)', color: 'var(--gris)' }}>
                <span style={{ flexGrow: 1, minWidth: 0, fontSize: 14 }}>
                  Cotidianidad <span style={{ fontSize: 12.5 }}>· lo que queda para lo que le pidan</span>
                </span>
                <span style={{ ...PESO, color: 'var(--tinta)' }}>{p.cotidianidad}%</span>
              </div>
            </div>
          </aside>

          {/* Lo del dia: sus tareas abiertas, que se comentan desde aqui (CEB-198). */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Sus tareas abiertas 🌪️</h2>
            <ListaDeTareas
              lista={tareas}
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
          </section>
        </div>
      </main>
    </>
  );
}

// La columna fija, como en el perfil del administrador.
const FIJO = { background: 'var(--panel)', borderRadius: 18, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 } as const;

const H_FIJO = { fontSize: 15, fontWeight: 700, margin: 0 } as const;

const FILA = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: '#fff',
  borderRadius: 12,
  padding: '10px 14px',
} as const;

const PESO = { fontSize: 13.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 42, textAlign: 'right' } as const;

const NADA = { color: 'var(--gris)', fontSize: 14, margin: 0 } as const;
