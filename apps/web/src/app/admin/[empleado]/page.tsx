import { notFound } from 'next/navigation';
import { VENTANA_DE_DELEGACION } from '@matriz/dominio';
import { bonoDe, cargoDe, imprevistosDe } from '@/lib/administrador';
import { enPalabras, pertenencias } from '@/lib/pertenencia';
import { dolares } from '@/lib/datos';
import { NuevoImprevisto } from '../../imprevistos';
import { tareasAbiertasDe } from '@/lib/tareas';
import { perfiles } from '../../perfil';
import { ListaDeTareas } from '../../lista';
import { archivarFuncion, asignarSupervisor, crearFuncion, eliminarFuncion, editarEmpleado, fijarBono, traspasar } from '../acciones';
import { Accion } from '../../accion';
import { Enviar } from '../../boton';
import { Formulario } from './formulario';
import { Reparto } from './reparto';
import { Propuesta } from './propuesta';
import { Cuenta } from './cuenta';
import { Ir } from '../../ir';
import { Confirmar } from '../../confirmar';
import { datosDelEquipo, lasDelegaciones } from '@/lib/equipo';
import { comoVanSusFunciones, masDelegadas } from '@/lib/tablero';
import { delegadaVeces } from '../../tablero';
import { ComoVa } from '../../como-va';
import { CerradasDelMes } from '../../cerradas';
import { nombreDelMes, nominaDelMes } from '@/lib/nomina';
import { EstadoDeCuenta, ultimosMeses } from '../../nomina';

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
  searchParams: Promise<{ editar?: string; peso?: string; tarea?: string; entra?: string; aQuien?: string; pesoNuevo?: string; nomina?: string }>;
}) {
  const { empleado } = await params;
  const { editar, peso, tarea, entra, aQuien, pesoNuevo, nomina: pedida = '' } = await searchParams;
  // Su nomina (CEB-231): la del mes en curso, provisional, o la de un mes
  // anterior, fija. La misma que ve la persona en "El mes".
  const esteMes = new Date().toISOString().slice(0, 7);
  const mesDeLaNomina = /^\d{4}-(0[1-9]|1[0-2])$/.test(pedida) && pedida <= esteMes ? pedida : esteMes;
  const [cargo, imprevistos, bono, { opciones, dePersona }, conPerfil, datos, delegaciones, suNomina] = await Promise.all([
    cargoDe(empleado),
    imprevistosDe(),
    bonoDe(empleado),
    pertenencias(),
    perfiles(tarea),
    datosDelEquipo(empleado),
    lasDelegaciones(false),
    nominaDelMes(empleado, mesDeLaNomina),
  ]);

  // Quien no existe -- o una ruta vieja, como /admin/reporte -- es un 404.
  if (!cargo) notFound();
  const tareas = await tareasAbiertasDe(empleado, imprevistos.hoy, imprevistos.calendario);
  // Como va cada funcion, dicho en su fila (CEB-219).
  const comoVan = new Map(comoVanSusFunciones(datos, empleado, imprevistos.hoy, imprevistos.calendario).map((f) => [f.id, f]));
  // Las suyas que delega seguido (CEB-224): un traspaso que nadie ha hecho.
  const delegadas = new Map(masDelegadas(delegaciones, imprevistos.hoy, imprevistos.calendario).map((r) => [r.funcionId, r]));

  const suma = cargo.funciones.reduce((t, f) => t + f.ponderacion, 0);
  const repartiendo = editar === 'reparto';
  // Un traspaso por aprobar: el reparto de quien recibe, para mostrar su cuenta (CEB-212).
  const traspasando = editar && aQuien && Number.isInteger(Number(pesoNuevo)) ? await cargoDe(aQuien) : null;
  const nueva = repartiendo && entra ? cargo.funciones.find((f) => f.id === entra && f.sinPublicar) : undefined;
  const pesoPropuesto = (id: string) => cargo.borrador.find((b) => b.funcionId === id)?.ponderacion ?? 0;

  // Un peso en la URL es una propuesta esperando aprobacion, no un cambio
  // hecho: nada se toco todavia.
  const proponiendo = peso !== undefined && editar !== undefined && Number.isInteger(Number(peso));

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'baseline', gap: 12 }}>
          {cargo.nombre}
          <Ir
            href={editar === 'persona' ? '?' : '?editar=persona'}
            title={editar === 'persona' ? 'Cerrar' : 'Editar su nombre, su correo y su empresa'}
            aria-label={editar === 'persona' ? 'Cerrar' : 'Editar su nombre, su correo y su empresa'}
            style={{ fontSize: 16, textDecoration: 'none' }}
          >
            {editar === 'persona' ? '✕' : '✏️'}
          </Ir>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gris)', margin: '5px 0 0' }}>
          {enPalabras(dePersona(empleado)) || 'sin empresa'} · {cargo.funciones.length} funciones · cotidianidad {100 - suma}%
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
              {/* Empresa y sede en un solo desplegable: no se puede elegir una
                  sede de otra empresa, y cambiar de empresa cambia la sede. */}
              <label style={ETIQUETA}>
                Su empresa
                <select name="pertenencia" defaultValue={cargo.pertenencia} required style={CAMPO}>
                  <option value="" disabled>
                    Elegir…
                  </option>
                  {opciones.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
              <Enviar style={BOTON} enviando="Guardando…">
                Guardar
              </Enviar>
              <Ir href="?" style={{ fontSize: 12.5, color: 'var(--gris)', paddingBottom: 9 }}>
                cancelar
              </Ir>
            </div>
          </Accion>
        )}
      </header>

      <div className="perfil">
        {/* Lo que cambia poco: se lee de un vistazo y se toca con el lapiz. */}
        <aside style={{ background: 'var(--panel)', borderRadius: 18, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Quien responde por esta persona (CEB-145). Un solo nivel: quien
              supervisa a alguien no tiene supervisor. */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={H_FIJO}>Su responsable 👥</h2>
            {cargo.supervisa.length > 0 ? (
              <p style={{ fontSize: 14, margin: 0 }}>
                Es responsable de {cargo.supervisa.map((p) => p.nombre).join(', ')}. Quien es responsable de alguien no tiene responsable.
              </p>
            ) : (
              <Accion accion={asignarSupervisor.bind(null, empleado)} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select name="supervisor" defaultValue={cargo.supervisorId ?? ''} style={CAMPO} aria-label="Su responsable">
                  <option value="">Sin responsable</option>
                  {cargo.puedenSupervisar.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                <Enviar style={BOTON} enviando="Guardando…">
                  Guardar
                </Enviar>
              </Accion>
            )}
          </section>

          {/* El bono (ADR 0010): el unico monto que el sistema conoce. Un cambio
              rige siempre desde el mes que viene; la base lo decide, no esta pantalla. */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Siempre el bono que rige hoy. Si ya hay otro para el mes que viene,
                va al lado como una nota, para que editar no parezca no haber hecho
                nada. */}
            <h2 style={{ ...H_FIJO, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              Su bono 💵
              <strong>{bono.vigente === null ? '—' : dolares(bono.vigente)}</strong>
              <Ir
                href={editar === 'bono' ? '?' : '?editar=bono'}
                aria-label={editar === 'bono' ? 'Cerrar' : 'Editar el bono'}
                style={{ fontSize: 14, textDecoration: 'none' }}
              >
                {editar === 'bono' ? '✕' : '✏️'}
              </Ir>
              {bono.pendiente !== null && (
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gris)' }}>
                  a partir del mes que viene: {dolares(bono.pendiente)}
                </span>
              )}
            </h2>
            {editar === 'bono' && (
              <Accion accion={fijarBono.bind(null, empleado)} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  name="monto"
                  inputMode="decimal"
                  required
                  autoFocus
                  defaultValue={bono.pendiente ?? bono.vigente ?? ''}
                  placeholder="Bono en dólares"
                  style={CAMPO}
                />
                <Enviar style={BOTON} enviando="Guardando…">
                  Guardar
                </Enviar>
                <span style={{ fontSize: 12.5, color: 'var(--gris)' }}>
                  {bono.vigente === null ? 'Es su primer bono: rige desde este mes.' : 'Rige desde el mes que viene.'}
                </span>
              </Accion>
            )}
          </section>

          {/* Su nomina (CEB-231, ADR 0016), debajo de su bono: para responder por
              que se le paga lo que se le paga. Sin bono este mes, no aparece. */}
          {(suNomina.nomina || mesDeLaNomina !== esteMes) && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={H_FIJO}>Su nómina de {nombreDelMes(mesDeLaNomina)} 🧾</h2>
                <form method="get" style={{ display: 'flex', gap: 6 }}>
                  <select name="nomina" defaultValue={mesDeLaNomina} aria-label="Qué mes" style={CAMPO}>
                    {ultimosMeses(esteMes).map((m) => (
                      <option key={m.valor} value={m.valor}>
                        {m.texto}
                      </option>
                    ))}
                  </select>
                  <button type="submit" style={BOTON}>
                    Ver
                  </button>
                </form>
              </div>
              {suNomina.nomina ? (
                <EstadoDeCuenta datos={{ ...suNomina, nomina: suNomina.nomina }} />
              ) : (
                <p style={{ fontSize: 13, color: 'var(--gris)', margin: 0 }}>Ese mes no tenía bono, así que no hay nómina.</p>
              )}
            </section>
          )}

          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={H_FIJO}>Su reparto 🥧</h2>
              <Ir
                href={repartiendo ? '?' : '?editar=reparto'}
                title={repartiendo ? 'Dejar de modificar' : 'Modificar la ponderación'}
                aria-label={repartiendo ? 'Dejar de modificar' : 'Modificar la ponderación'}
                style={{ fontSize: 14, textDecoration: 'none' }}
              >
                {repartiendo ? '✕' : '✏️'}
              </Ir>
            </div>

            {repartiendo ? (
              <>
                {/* Recien creada: la cuenta de como entra, antes de publicar (CEB-209). */}
                {nueva && (
                  <Cuenta
                    titulo="Así quedaría con la función nueva"
                    funciones={cargo.funciones.filter((f) => !f.sinPublicar)}
                    cambio={{ entra: { funcionId: nueva.id, ponderacion: pesoPropuesto(nueva.id) } }}
                    nombreDeLaNueva={nueva.texto}
                  >
                    <span style={{ fontSize: 12.5, color: 'var(--gris)' }}>
                      Todavía nadie lo ve. Ajústalo abajo si quieres y publícalo.
                    </span>
                  </Cuenta>
                )}
                <Reparto empleadoId={empleado} funciones={cargo.funciones} borrador={cargo.borrador} />
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {cargo.funciones.map((f) => (
                  <div key={f.id}>
                    <div style={FILA}>
                      {/* Nombre y detalle apilados: la columna es angosta. */}
                      <span style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 14 }}>{f.texto}</span>
                        <span style={{ fontSize: 12, color: 'var(--gris)' }}>
                          {f.sinPublicar && <strong style={{ color: '#8A7A3E' }}>sin publicar · </strong>}
                          {f.tipo ?? 'sin tipo'} · {f.periodicidad}
                          {f.diaTope ? ` · día ${f.diaTope}` : ''}
                        </span>
                        <ComoVa f={comoVan.get(f.id)} />
                        {delegadas.has(f.id) && <span style={DELEGADA}>🤝 {delegadaVeces(delegadas.get(f.id)!)}</span>}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 42, textAlign: 'right' }}>
                        {f.ponderacion}%
                      </span>
                      <Ir
                        href={editar === f.id ? '?' : `?editar=${f.id}`}
                        title="Editar esta función"
                        style={{ fontSize: 15, textDecoration: 'none' }}
                      >
                        {editar === f.id ? '✕' : '✏️'}
                      </Ir>
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

                    {/* El traspaso muestra antes como quedan los dos (CEB-212). */}
                    {editar === f.id && traspasando && (
                      <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <Cuenta
                          titulo={`Así quedaría ${cargo.nombre}, que la entrega`}
                          funciones={cargo.funciones.filter((g) => !g.sinPublicar)}
                          cambio={{ sale: f.id }}
                        />
                        <Cuenta
                          titulo={`Así quedaría ${traspasando.nombre}, que la recibe`}
                          funciones={traspasando.funciones.filter((g) => !g.sinPublicar)}
                          cambio={{ entra: { funcionId: f.id, ponderacion: Number(pesoNuevo) } }}
                          nombreDeLaNueva={f.texto}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <Accion accion={traspasar.bind(null, f.id, empleado)}>
                              <input type="hidden" name="aQuien" value={traspasando.id} />
                              <input type="hidden" name="pesoNuevo" value={Number(pesoNuevo)} />
                              <Enviar style={BOTON} enviando="Traspasando…">
                                Sí, traspasarla
                              </Enviar>
                            </Accion>
                            <Ir href={`?editar=${f.id}`} style={{ fontSize: 13, color: 'var(--gris)' }}>
                              dejarla como está
                            </Ir>
                            <span style={{ fontSize: 12, color: 'var(--gris)', flexBasis: '100%' }}>
                              Su historial se va con ella; el arrastre de {cargo.nombre} se queda.
                            </span>
                          </div>
                        </Cuenta>
                      </div>
                    )}

                    {editar === f.id && !proponiendo && !traspasando && (
                      <div style={{ background: 'var(--suave)', borderRadius: 14, padding: '16px 18px', marginTop: 5 }}>
                        <Formulario funcionId={f.id} empleadoId={empleado} funcion={f} />

                        {/* Un GET: lleva a la cuenta del traspaso, no traspasa todavia. */}
                        <form>
                          <input type="hidden" name="editar" value={f.id} />
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(26,23,19,0.10)' }}>
                            {/* La señal junto a donde se actua sobre ella. */}
                            {delegadas.has(f.id) && (
                              <span style={{ ...DELEGADA, flexBasis: '100%' }}>
                                🤝 {delegadaVeces(delegadas.get(f.id)!)} en {VENTANA_DE_DELEGACION} días: quizá es de otra persona.
                              </span>
                            )}
                            <label style={ETIQUETA}>
                              Pasársela a
                              <select name="aQuien" required style={CAMPO}>
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
                              <input name="pesoNuevo" type="number" min={0} max={90} required defaultValue={f.ponderacion} style={{ ...CAMPO, width: 80, textAlign: 'right' }} />
                            </label>

                            <button type="submit" style={{ ...BOTON, background: 'rgba(26,23,19,0.06)', color: 'var(--tinta)' }}>
                              Traspasar
                            </button>

                            <span style={{ fontSize: 12, color: 'var(--gris)', flexBasis: '100%' }}>
                              Aquí pesa {f.ponderacion}%. Antes de traspasar ves cómo quedan los dos repartos.
                            </span>
                          </div>
                        </form>

                        {/* Archivar o eliminar muestran antes a donde va su peso (CEB-211). */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                          <Confirmar
                            accion={archivarFuncion.bind(null, f.id, empleado)}
                            titulo="Archivar: sale de su cargo y conserva su historia"
                            pregunta={`¿Archivar «${f.texto}»?`}
                            detalle={<Cuenta titulo="Así quedaría si la archivas" funciones={cargo.funciones.filter((g) => !g.sinPublicar)} cambio={{ sale: f.id }}>
                              <span style={{ fontSize: 12, color: 'var(--gris)' }}>Sale de su cargo y conserva su historia.</span>
                            </Cuenta>}
                            si="Sí, archivarla"
                            enviando="Archivando…"
                            estilo={QUITAR}
                          >
                            📦
                          </Confirmar>
                          {/* Para la creada por error. Si ya tiene historia, la base la
                              rechaza y hay que archivarla. */}
                          <Confirmar
                            accion={eliminarFuncion.bind(null, f.id, empleado)}
                            titulo="Eliminar: solo si se creó por error y no tiene historia"
                            pregunta={`¿Eliminar «${f.texto}» por completo?`}
                            detalle={<Cuenta titulo="Así quedaría si la eliminas" funciones={cargo.funciones.filter((g) => !g.sinPublicar)} cambio={{ sale: f.id }}>
                              <span style={{ fontSize: 12, color: 'var(--gris)' }}>Desaparece por completo. Si ya tiene historia, la base lo rechaza y hay que archivarla.</span>
                            </Cuenta>}
                            si="Sí, eliminarla"
                            enviando="Eliminando…"
                            estilo={QUITAR}
                          >
                            🗑
                          </Confirmar>
                        </div>
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

          {/* Plegado: la ficha es para leer el cargo, y crear es lo raro. */}
          <details className="nuevo-item">
            <summary>＋ Nueva función</summary>
            <div style={{ paddingTop: 14 }}>
              <Formulario empleadoId={empleado} accion={crearFuncion.bind(null, empleado)} />
            </div>
          </details>
        </aside>

        {/* Lo del dia: lo que tiene abierto ahora. */}
        {/* Sus tareas abiertas, ocurrencias e imprevistos juntos (CEB-198): se
            comentan desde su perfil y las marca ella. Lo que el administrador le
            pide a ultimo minuto tambien cuenta como imprevisto (CEB-151). */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Sus tareas abiertas 🌪️</h2>
          <ListaDeTareas
            lista={tareas}
            hoy={imprevistos.hoy}
            calendario={imprevistos.calendario}
            quienesPiden={imprevistos.quienesPiden}
            perfiles={conPerfil}
            puedeBorrar={() => true}
          />
          <NuevoImprevisto
            empleadoId={empleado}
            quienesPiden={imprevistos.quienesPiden}
            pidioPorDefecto={imprevistos.yo}
            hoy={imprevistos.hoy}
            calendario={imprevistos.calendario}
            rotulo="＋ Nueva tarea"
            fila
          />
          <CerradasDelMes
            datos={datos}
            empleadoId={empleado}
            hoy={imprevistos.hoy}
            quienesPiden={imprevistos.quienesPiden}
            perfiles={conPerfil}
            abierta={tarea}
          />
        </section>
      </div>
    </main>
  );
}

const H_FIJO = { fontSize: 15, fontWeight: 700, margin: 0 } as const;

const DELEGADA = { fontSize: 12.5, fontWeight: 600, color: '#8A7A3E' } as const;

const FILA = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: '#fff',
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

const QUITAR = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 38,
  height: 38,
  borderRadius: 999,
  border: 'none',
  background: 'rgba(198,40,40,0.10)',
  fontSize: 17,
  cursor: 'pointer',
} as const;
