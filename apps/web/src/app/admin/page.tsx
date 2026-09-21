import { elCalendario, gente } from '@/lib/administrador';
import { darDeAlta } from './acciones';
import { Accion } from '../accion';
import { Enviar } from '../boton';
import { AvisoDeCobertura } from './cobertura';
import Link from 'next/link';

// El trazador del backoffice: quien asigna entra y ve a su gente. Nada mas.
// Lo que decide esta pantalla no es lo que muestra, es quien puede verla.
export default async function Panel() {
  const [equipo, calendario] = await Promise.all([gente(), elCalendario()]);

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Tu gente 👥</h1>
        <p style={{ fontSize: 14, color: 'var(--gris)', margin: '5px 0 0' }}>
          {equipo.length} personas, {equipo.reduce((t, e) => t + e.funciones, 0)} funciones repartidas.
        </p>
      </header>

      <AvisoDeCobertura cobertura={calendario.cobertura} cargadoHasta={calendario.cargadoHasta} enlazar />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {equipo.map((e) => (
          <Link
            key={e.id}
            href={`/admin/${e.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: 'var(--suave)',
              borderRadius: 14,
              padding: '12px 16px',
              color: 'var(--tinta)',
              textDecoration: 'none',
            }}
          >
            <span style={{ flexGrow: 1, minWidth: 0, fontSize: 15, fontWeight: 600 }}>{e.nombre}</span>
            <span style={{ fontSize: 13, color: 'var(--gris)' }}>{e.correo}</span>
            <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {e.funciones} {e.funciones === 1 ? 'función' : 'funciones'}
            </span>
          </Link>
        ))}

        {equipo.length === 0 && (
          <p style={{ color: 'var(--gris)', fontSize: 14 }}>Todavía no hay nadie dado de alta.</p>
        )}
      </div>
      <section style={{ borderTop: '1px solid rgba(26,23,19,0.10)', paddingTop: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>Alguien nuevo</h2>
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
            <Enviar style={BOTON} enviando="Dando de alta…">
              Dar de alta
            </Enviar>
          </div>
        </Accion>
        <p style={{ fontSize: 12, color: 'var(--gris)', margin: '10px 0 0' }}>
          Entra con un enlace a su correo, sin contraseña. Hasta que tenga funciones, verá su pantalla vacía.
        </p>
      </section>

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
