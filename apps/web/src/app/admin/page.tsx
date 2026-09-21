import { gente, soloAdministrador } from '@/lib/administrador';
import Link from 'next/link';

// El trazador del backoffice: quien asigna entra y ve a su gente. Nada mas.
// Lo que decide esta pantalla no es lo que muestra, es quien puede verla.
export default async function Panel() {
  await soloAdministrador();
  const equipo = await gente();

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Tu gente 👥</h1>
        <p style={{ fontSize: 14, color: 'var(--gris)', margin: '5px 0 0' }}>
          {equipo.length} personas, {equipo.reduce((t, e) => t + e.funciones, 0)} funciones repartidas.
        </p>
      </header>

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
    </main>
  );
}
