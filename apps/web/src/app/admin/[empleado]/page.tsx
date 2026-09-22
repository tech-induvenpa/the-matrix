import { cargoDe } from '@/lib/administrador';
import { archivarFuncion, crearFuncion, editarEmpleado, traspasar } from '../acciones';
import { Accion } from '../../accion';
import { Enviar } from '../../boton';
import { Formulario } from './formulario';
import { Reparto } from './reparto';
import { Propuesta } from './propuesta';
import Link from 'next/link';

// El cargo de una persona. Una sola lista de funciones: antes salian dos, la de
// repartir y la de editar, con los mismos nombres repetidos uno debajo del otro.
//
// Editar es un modo, no un estado permanente de la pantalla: por defecto se lee,
// y el lapiz abre lo que se quiera tocar. El modo viaja en la URL y no en
// memoria, asi que recargar no lo pierde y el boton de atras funciona.
export default async function Cargo({
  params,
  searchParams,
}: {
  params: Promise<{ empleado: string }>;
  searchParams: Promise<{ editar?: string; peso?: string }>;
}) {
  const { empleado } = await params;
  const { editar, peso } = await searchParams;
  const cargo = await cargoDe(empleado);

  if (!cargo) return null;

  const suma = cargo.funciones.reduce((t, f) => t + f.ponderacion, 0);
  const repartiendo = editar === 'reparto';

  // Un peso en la URL es una propuesta esperando aprobacion, no un cambio
  // hecho: nada se toco todavia.
  const proponiendo = peso !== undefined && editar !== undefined && Number.isInteger(Number(peso));

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>{cargo.nombre}</h1>
        <p style={{ fontSize: 14, color: 'var(--gris)', margin: '5px 0 0' }}>
          {cargo.funciones.length} funciones · reparte {suma} de 100
          {editar !== 'persona' && (
            <>
              {' · '}
              <Link href="?editar=persona" style={{ color: 'var(--gris)' }}>
                ✏️ su nombre y su correo
              </Link>
            </>
          )}
        </p>

        {editar === 'persona' && (
          <Accion accion={editarEmpleado.bind(null, empleado)}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 12 }}>
              <label style={ETIQUETA}>
                Cómo se llama
                <input name="nombre" defaultValue={cargo.nombre} required style={CAMPO} />
              </label>
              <label style={{ ...ETIQUETA, flexGrow: 1, minWidth: 220 }}>
                Su correo — con este entra
                <input name="correo" type="email" defaultValue={cargo.correo} required style={CAMPO} />
              </label>
              <Enviar style={BOTON} enviando="Guardando…">
                Guardar
              </Enviar>
              <Link href="?" style={{ fontSize: 12.5, color: 'var(--gris)', paddingBottom: 9 }}>
                cancelar
              </Link>
            </div>
          </Accion>
        )}
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Su reparto 🥧</h2>
          <Link href={repartiendo ? '?' : '?editar=reparto'} style={{ fontSize: 13, color: 'var(--gris)' }}>
            {repartiendo ? 'dejar de modificar' : '✏️ modificar ponderación'}
          </Link>
        </div>

        {repartiendo ? (
          <Reparto empleadoId={empleado} funciones={cargo.funciones} borrador={cargo.borrador} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {cargo.funciones.map((f) => (
              <div key={f.id}>
                <div style={FILA}>
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: 14 }}>{f.texto}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--gris)', whiteSpace: 'nowrap' }}>
                    {f.tipo ?? 'sin tipo'} · {f.periodicidad}
                    {f.diaTope ? ` · día ${f.diaTope}` : ''}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 42, textAlign: 'right' }}>
                    {f.ponderacion}%
                  </span>
                  <Link
                    href={editar === f.id ? '?' : `?editar=${f.id}`}
                    title="Editar esta función"
                    style={{ fontSize: 15, textDecoration: 'none' }}
                  >
                    {editar === f.id ? '✕' : '✏️'}
                  </Link>
                </div>

                {editar === f.id && proponiendo && (
                  <div style={{ marginTop: 5 }}>
                    <Propuesta
                      empleadoId={empleado}
                      funciones={cargo.funciones}
                      funcionId={f.id}
                      nueva={Number(peso)}
                    />
                  </div>
                )}

                {editar === f.id && !proponiendo && (
                  <div style={{ background: 'var(--suave)', borderRadius: 14, padding: '16px 18px', marginTop: 5 }}>
                    <Formulario funcionId={f.id} empleadoId={empleado} funcion={f} />

                    <Accion accion={traspasar.bind(null, f.id, empleado)}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(26,23,19,0.10)' }}>
                        <label style={ETIQUETA}>
                          Pasársela a
                          <select name="aQuien" style={CAMPO}>
                            <option value="">—</option>
                            {cargo.companeros.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label style={ETIQUETA}>
                          Cuánto pesa en su cargo
                          <input name="pesoNuevo" type="number" min={0} max={100} defaultValue={f.ponderacion} style={{ ...CAMPO, width: 80, textAlign: 'right' }} />
                        </label>

                        <Enviar style={{ ...BOTON, background: 'rgba(26,23,19,0.06)', color: 'var(--tinta)' }} enviando="Traspasando…">
                          Traspasar
                        </Enviar>

                        <span style={{ fontSize: 12, color: 'var(--gris)', flexBasis: '100%' }}>
                          Aquí pesa {f.ponderacion}%. Su historial se va con ella; el arrastre de {cargo.nombre} se queda.
                        </span>
                      </div>
                    </Accion>

                    <Accion accion={archivarFuncion.bind(null, f.id, empleado)}>
                      <Enviar
                        style={{ marginTop: 12, fontSize: 12.5, color: 'var(--gris)', background: 'none', cursor: 'pointer' }}
                        enviando="Archivando…"
                      >
                        Archivar esta función
                      </Enviar>
                    </Accion>
                  </div>
                )}
              </div>
            ))}

            {cargo.funciones.length === 0 && (
              <p style={{ color: 'var(--gris)', fontSize: 14 }}>Todavía no tiene ninguna función.</p>
            )}
          </div>
        )}
      </section>

      <section style={{ borderTop: '1px solid rgba(26,23,19,0.10)', paddingTop: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>Una función nueva</h2>
        <Formulario empleadoId={empleado} accion={crearFuncion.bind(null, empleado)} />
      </section>
    </main>
  );
}

const FILA = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: 'var(--suave)',
  borderRadius: 12,
  padding: '10px 14px',
} as const;

const CAMPO = {
  height: 34,
  borderRadius: 8,
  border: '1px solid rgba(26,23,19,0.18)',
  padding: '0 10px',
  fontSize: 13.5,
  background: '#fff',
} as const;

const ETIQUETA = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--gris)' } as const;

const BOTON = {
  height: 34,
  padding: '0 16px',
  borderRadius: 999,
  background: 'var(--tinta)',
  color: '#fff',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
} as const;
