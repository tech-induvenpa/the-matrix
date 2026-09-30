import { Calendario, delFiltro, montoNoCumplido } from '@matriz/dominio';
import { bonosDelMes, elCalendario, gente } from '@/lib/administrador';
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
export default async function Panel({ searchParams }: { searchParams: Promise<ParametrosDelFiltro & { vista?: string }> }) {
  const { vista: pedida, ...parametros } = await searchParams;
  // Dos pestanas: el equipo como tal (las personas y dar de alta), primero, y el
  // tablero. La pestana viaja en la URL: recargar o volver atras no la pierde.
  const vista = pedida === 'tablero' ? 'tablero' : 'equipo';
  const enlaceA = (v: string) => `?${new URLSearchParams({ ...parametros, ...(v === 'tablero' ? { vista: v } : {}) } as Record<string, string>)}`;
  const [todos, calendario, { opciones, deIds }, { sinLeerDe }, datos, bonos, delegaciones] = await Promise.all([
    gente(),
    elCalendario(),
    pertenencias(),
    perfiles(undefined),
    datosDelEquipo(),
    bonosDelMes(),
    lasDelegaciones(false),
  ]);

  // El filtro solo acota lo que ya se leyo con la sesion de quien mira (INV-29).
  const filtro = filtroDe(parametros);
  const equipo = todos
    .map((e) => ({ ...e, ...deIds(e.empresaId, e.sedeId) }))
    .filter((e) => delFiltro(e, [...e.funciones, ...imprevistosQueSeBuscan(datos, e.id, calendario.hoy)], (f) => f, filtro) !== null);
  // El filtro acota tambien las graficas: las mismas personas que la lista.
  const quienes = new Set(equipo.map((e) => e.id));
  const dias = Calendario.con(calendario.dias);
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
          <Ir
            key={e.id}
            href={`/admin/${e.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '4px 14px',
              background: 'var(--suave)',
              borderRadius: 14,
              padding: '12px 16px',
              color: 'var(--tinta)',
              textDecoration: 'none',
            }}
          >
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
          </Ir>
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
