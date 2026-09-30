import { Calendario, delFiltro, montoNoCumplido } from '@matriz/dominio';
import { claveDeLaTarea, ListaDeTareas } from '../lista';
import { tareasAbiertasDe } from '@/lib/tareas';
import { bonosDelMes, elCalendario, gente, imprevistosDe } from '@/lib/administrador';
import { datosDelEquipo, lasDelegaciones } from '@/lib/equipo';
import { barrasDe, cargasDe, imprevistosQueSeBuscan, lineasDelArrastre, masDelegadas } from '@/lib/tablero';
import { Carga, DesdeCuando, MasDelegadas, Resumen, SinCumplir } from '../tablero';
import { enPalabras, filtroDe, pertenencias, type ParametrosDelFiltro } from '@/lib/pertenencia';
import { Filtrar } from '../filtro';
import { darDeAlta } from './acciones';
import { Accion } from '../accion';
import { Enviar } from '../boton';
import { AvisoDeCobertura } from './cobertura';
import { Ir } from '../ir';
import { perfiles } from '../perfil';
import { Punto } from '../abrir';

// El equipo (CEB-215): un tablero que lee como esta la gente ahora mismo, y
// debajo la lista de personas, que lleva al perfil de cada una. Es la misma
// pantalla que la del supervisor (equipo/page.tsx); el administrador ve ademas
// los montos, y da de alta a alguien nuevo.
export default async function Panel({ searchParams }: { searchParams: Promise<ParametrosDelFiltro & { vista?: string; tarea?: string }> }) {
  const { vista: pedida, tarea, ...parametros } = await searchParams;
  // Dos pestanas: el equipo como tal (las personas y dar de alta), primero, y el
  // tablero. La pestana viaja en la URL: recargar o volver atras no la pierde.
  const vista = pedida === 'tablero' ? 'tablero' : 'equipo';
  const enlaceA = (v: string) => `?${new URLSearchParams({ ...parametros, ...(v === 'tablero' ? { vista: v } : {}) } as Record<string, string>)}`;
  const [todos, calendario, { opciones, deIds }, conPerfil, datos, bonos, delegaciones, { quienesPiden }] = await Promise.all([
    gente(),
    elCalendario(),
    pertenencias(),
    // El perfil abierto de una tarea (su historia), si hay uno en la URL.
    perfiles(tarea),
    datosDelEquipo(),
    bonosDelMes(),
    lasDelegaciones(false),
    imprevistosDe(),
  ]);
  const { sinLeerDe } = conPerfil;

  // El filtro solo acota lo que ya se leyo con la sesion de quien mira (INV-29).
  const filtro = filtroDe(parametros);
  const equipo = todos
    .map((e) => ({ ...e, ...deIds(e.empresaId, e.sedeId) }))
    .filter((e) => delFiltro(e, [...e.funciones, ...imprevistosQueSeBuscan(datos, e.id, calendario.hoy)], (f) => f, filtro) !== null);
  // El filtro acota tambien las graficas: las mismas personas que la lista.
  const quienes = new Set(equipo.map((e) => e.id));
  const dias = Calendario.con(calendario.dias);
  // Las tareas abiertas de cada quien, para su acordeon. Solo en la pestana de
  // personas: el tablero no las necesita.
  // ponytail: una lectura por persona; un equipo es de pocas.
  const tareas = new Map(
    vista === 'equipo' ? await Promise.all(equipo.map(async (e) => [e.id, await tareasAbiertasDe(e.id, calendario.hoy, dias)] as const)) : [],
  );
  // Cuantos tiene a cargo cada quien: con alguno, es responsable (CEB-145).
  const aCargo = (id: string) => todos.filter((p) => p.supervisorId === id).length;
  const responsableDe = new Map(todos.map((p) => [p.id, p.nombre]));
  // Buscando por texto, los acordeones se abren: lo buscado puede ser una tarea.
  const abiertos = Boolean(parametros.q);
  const barras = barrasDe(datos, calendario.hoy, dias).filter((b) => quienes.has(b.persona.id));
  const lineas = lineasDelArrastre(datos, calendario.hoy, dias).filter((l) => quienes.has(l.persona.id));
  const cargas = cargasDe(datos, calendario.hoy).filter((c) => quienes.has(c.persona.id));
  // Las de quien delega, si esta en el filtro.
  const titularDe = new Map(delegaciones.funciones.map((f) => [f.id, f.empleado_id]));
  const repetidas = masDelegadas(delegaciones, calendario.hoy, dias).filter((r) => quienes.has(titularDe.get(r.funcionId) ?? ''));
  // Un porcentaje del cargo, en dolares del bono de este mes. Sin bono, nada.
  const montoDe = (id: string, peso: number) => (bonos.has(id) ? montoNoCumplido(peso, bonos.get(id)!) : null);

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>El equipo 👥</h1>
        <p style={{ fontSize: 14, color: 'var(--gris)', margin: '5px 0 0' }}>
          {equipo.length} personas, {equipo.reduce((t, e) => t + e.funciones.length, 0)} funciones repartidas.
        </p>
      </header>

      <nav aria-label="Vistas del equipo" style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(26,23,19,0.10)' }}>
        {[
          ['equipo', 'Personas'],
          ['tablero', 'Tablero'],
        ].map(([v, texto]) => (
          <Ir
            key={v}
            href={enlaceA(v!)}
            style={{
              padding: '8px 14px',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
              color: vista === v ? 'var(--tinta)' : 'var(--gris)',
              borderBottom: `2px solid ${vista === v ? 'var(--tinta)' : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            {texto}
          </Ir>
        ))}
      </nav>

      <Filtrar opciones={opciones} valores={parametros} conservar={{ vista: vista === 'tablero' ? 'tablero' : undefined }} />

      <AvisoDeCobertura cobertura={calendario.cobertura} cargadoHasta={calendario.cargadoHasta} enlazar />

      {vista === 'tablero' && (
        <>
      <Resumen barras={barras} lineas={lineas} cargas={cargas} montoDe={montoDe} />
      <div className="tablero">
        <SinCumplir barras={barras} perfilDe={(id) => `/admin/${id}`} montoDe={montoDe} />
        <DesdeCuando lineas={lineas} hoy={calendario.hoy} perfilDe={(id) => `/admin/${id}`} />
        <Carga cargas={cargas} perfilDe={(id) => `/admin/${id}`} />
        <MasDelegadas repetidas={repetidas} perfilDe={(funcionId) => `/admin/${titularDe.get(funcionId)}`} />
      </div>

        </>
      )}

      {vista === 'equipo' && (
        <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {equipo.map((e) => (
          <details
            key={e.id}
            className="acordeon"
            // Abierto si se busca por texto, o si su tarea tiene la historia abierta.
            open={abiertos || (tareas.get(e.id) ?? []).some((t) => claveDeLaTarea(t) === tarea)}
            style={{ background: 'var(--suave)', borderRadius: 14 }}>
            <summary style={FILA_PERSONA}>
              {/* El rol, primero: responsable (con gente a cargo) o empleado. */}
              <span
                title={aCargo(e.id) ? `Responsable de ${aCargo(e.id)} ${aCargo(e.id) === 1 ? 'persona' : 'personas'}` : `Empleado${e.supervisorId ? `, a cargo de ${responsableDe.get(e.supervisorId)}` : ''}`}
                style={{ ...ICONO, background: aCargo(e.id) ? 'var(--tinta)' : '#fff', color: aCargo(e.id) ? '#fff' : 'var(--gris)' }}
              >
                {aCargo(e.id) ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-label="Responsable">
                    <circle cx="9" cy="8" r="3.5" />
                    <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
                    <circle cx="17" cy="9" r="2.5" />
                    <path d="M17 14c2.6 0 4.5 1.9 4.5 4.8" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-label="Empleado">
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
                  </svg>
                )}
              </span>
              <span style={{ flexGrow: 1, minWidth: 0, fontSize: 15, fontWeight: 600 }}>
                {e.nombre}
                {/* Comentarios sin leer en alguna de sus tareas abiertas (CEB-198). */}
                {sinLeerDe(e.id) && <Punto />}
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--gris)', marginLeft: 10 }}>{enPalabras(e)}</span>
              </span>
              <span style={{ fontSize: 13, color: 'var(--gris)' }}>{e.correo}</span>
              <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                {e.funciones.length} {e.funciones.length === 1 ? 'función' : 'funciones'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--gris)', whiteSpace: 'nowrap' }}>
                {tareas.get(e.id)?.length ?? 0} {tareas.get(e.id)?.length === 1 ? 'tarea abierta' : 'tareas abiertas'}
              </span>
              <span className="chevron" aria-hidden style={ICONO}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
              <Ir href={`/admin/${e.id}`} title={`Ver el perfil de ${e.nombre}`} style={{ ...ICONO, background: '#fff', color: 'var(--tinta)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-label={`Ver el perfil de ${e.nombre}`}>
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </Ir>
            </summary>
            {/* Las mismas tarjetas que en su perfil: el titulo abre su historia. */}
            <div style={{ padding: '0 12px 12px' }}>
              <ListaDeTareas
                lista={tareas.get(e.id) ?? []}
                hoy={calendario.hoy}
                calendario={dias}
                quienesPiden={quienesPiden}
                perfiles={conPerfil}
                puedeBorrar={() => true}
              />
            </div>
          </details>
        ))}

        {equipo.length === 0 && (
          <p style={{ color: 'var(--gris)', fontSize: 14 }}>
            {todos.length === 0 ? 'Todavía no hay nadie dado de alta.' : 'Nadie coincide con el filtro.'}
          </p>
        )}
      </div>
      {/* Plegado al final: dar de alta es lo raro. */}
      <details className="nuevo-item">
        <summary>＋ Alguien nuevo</summary>
        <div style={{ paddingTop: 14 }}>
        <Accion accion={darDeAlta}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--gris)' }}>
              Cómo se llama
              <input name="nombre" required placeholder="Carmen Rodríguez" style={CAMPO} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--gris)', flexGrow: 1, minWidth: 200 }}>
              Su correo
              <input name="correo" type="email" required placeholder="carmen@jfs.com" style={CAMPO} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--gris)' }}>
              De qué empresa
              <select name="pertenencia" required defaultValue="" style={CAMPO}>
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
            <Enviar style={BOTON} enviando="Dando de alta…">
              Dar de alta
            </Enviar>
          </div>
        </Accion>
        <p style={{ fontSize: 12, color: 'var(--gris)', margin: '10px 0 0' }}>
          Entra con un enlace a su correo, sin contraseña. Hasta que tenga funciones, verá su pantalla vacía.
        </p>
        </div>
      </details>
        </>
      )}

    </main>
  );
}

const CAMPO = {
  height: 38,
  borderRadius: 10,
  border: '1px solid rgba(26,23,19,0.18)',
  padding: '0 12px',
  fontSize: 14,
  background: '#fff',
} as const;

const BOTON = {
  height: 38,
  padding: '0 18px',
  borderRadius: 999,
  background: 'var(--tinta)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
} as const;

const FILA_PERSONA = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '4px 14px',
  padding: '10px 12px 10px 16px',
  cursor: 'pointer',
  listStyle: 'none',
} as const;


const ICONO = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 999,
  background: 'rgba(26,23,19,0.06)',
  color: 'var(--gris)',
  flexShrink: 0,
} as const;
