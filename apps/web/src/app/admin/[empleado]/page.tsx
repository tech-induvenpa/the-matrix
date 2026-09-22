import { cargoDe } from '@/lib/administrador';
import { archivarFuncion, crearFuncion, editarEmpleado, traspasar } from '../acciones';
import { Accion } from '../../accion';
import { Enviar } from '../../boton';
import { Formulario } from './formulario';
import { Reparto } from './reparto';

// El cargo de una persona: sus funciones y lo que pesa cada una. Aqui se crean
// y se editan; repartir el cien es la otra pantalla (CEB-132).
export default async function Cargo({ params }: { params: Promise<{ empleado: string }> }) {
  const { empleado } = await params;
  const cargo = await cargoDe(empleado);

  if (!cargo) return null;

  const suma = cargo.funciones.reduce((t, f) => t + f.ponderacion, 0);

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>{cargo.nombre}</h1>
        <p style={{ fontSize: 14, color: 'var(--gris)', margin: '5px 0 0' }}>
          {cargo.funciones.length} funciones · reparte {suma} de 100
        </p>

        {/* El nombre viene del Excel, donde era el titulo de un bloque, y el
            correo es inventado. Los dos hay que poder arreglarlos aqui. */}
        <Accion accion={editarEmpleado.bind(null, empleado)}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--gris)' }}>
              Cómo se llama
              <input name="nombre" defaultValue={cargo.nombre} required style={PERSONA} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--gris)', flexGrow: 1, minWidth: 220 }}>
              Su correo — con este entra
              <input name="correo" type="email" defaultValue={cargo.correo} required style={PERSONA} />
            </label>
            <Enviar
              style={{ height: 34, padding: '0 16px', borderRadius: 999, background: 'rgba(26,23,19,0.06)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
              enviando="Guardando…"
            >
              Guardar
            </Enviar>
          </div>
        </Accion>
      </header>

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>Su reparto 🥧</h2>
        <Reparto empleadoId={empleado} funciones={cargo.funciones} borrador={cargo.borrador} />
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cargo.funciones.map((f) => (
          <details key={f.id} style={{ background: 'var(--suave)', borderRadius: 14, padding: '12px 16px' }}>
            <summary style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', listStyle: 'none' }}>
              <span style={{ flexGrow: 1, minWidth: 0, fontSize: 15, fontWeight: 600 }}>{f.texto}</span>
              <span style={{ fontSize: 12.5, color: 'var(--gris)' }}>
                {f.tipo ?? 'sin tipo'} · {f.periodicidad}
                {f.diaTope ? ` · día ${f.diaTope}` : ''}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{f.ponderacion}%</span>
            </summary>

            <div style={{ paddingTop: 14 }}>
              <Formulario funcionId={f.id} empleadoId={empleado} funcion={f} />

              <Accion accion={traspasar.bind(null, f.id, empleado)}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(26,23,19,0.10)' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--gris)' }}>
                    Pasársela a
                    <select name="aQuien" style={{ height: 34, borderRadius: 8, border: '1px solid rgba(26,23,19,0.18)', padding: '0 8px', fontSize: 13.5 }}>
                      <option value="">—</option>
                      {cargo.companeros.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--gris)' }}>
                    Cuánto pesa en su cargo
                    <input name="pesoNuevo" type="number" min={0} max={100} defaultValue={f.ponderacion} style={{ width: 70, height: 34, borderRadius: 8, border: '1px solid rgba(26,23,19,0.18)', padding: '0 8px', fontSize: 13.5, textAlign: 'right' }} />
                  </label>

                  <Enviar style={{ height: 34, padding: '0 16px', borderRadius: 999, background: 'rgba(26,23,19,0.06)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }} enviando="Traspasando…">
                    Traspasar
                  </Enviar>

                  <span style={{ fontSize: 12, color: 'var(--gris)', flexBasis: '100%' }}>
                    Aquí pesa {f.ponderacion}%. Su historial se va con ella; el arrastre de {cargo.nombre} se queda.
                  </span>
                </div>
              </Accion>

              <Accion accion={archivarFuncion.bind(null, f.id, empleado)}>
                <Enviar
                  style={{ marginTop: 10, fontSize: 12.5, color: 'var(--gris)', background: 'none', cursor: 'pointer' }}
                  enviando="Archivando…"
                >
                  Archivar esta función
                </Enviar>
              </Accion>
            </div>
          </details>
        ))}

        {cargo.funciones.length === 0 && (
          <p style={{ color: 'var(--gris)', fontSize: 14 }}>Todavía no tiene ninguna función.</p>
        )}
      </section>

      <section style={{ borderTop: '1px solid rgba(26,23,19,0.10)', paddingTop: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>Una función nueva</h2>
        <Formulario empleadoId={empleado} accion={crearFuncion.bind(null, empleado)} />
      </section>
    </main>
  );
}

const PERSONA = {
  height: 34,
  borderRadius: 8,
  border: '1px solid rgba(26,23,19,0.18)',
  padding: '0 10px',
  fontSize: 13.5,
  background: '#fff',
} as const;
