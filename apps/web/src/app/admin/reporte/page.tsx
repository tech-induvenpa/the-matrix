import { reporte } from '@/lib/reporte';
import { fechaCorta } from '@/lib/datos';
import Link from 'next/link';

// Lo que el administrador venia a buscar: que se esta ejecutando y que no.
//
// Ordenado por cuanto del cargo de cada quien esta sin cumplirse, no por quien
// falla mas veces. Eso cambia a quien señala: una diaria de tres puntos con
// veinte incumplimientos pesa menos que una mensual de veinticinco con uno.
export default async function Reporte() {
  const gente = await reporte();

  return (
    <main style={{ maxWidth: 940, margin: '0 auto', padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Qué se arrastra 🐢</h1>
        <p style={{ fontSize: 14, color: 'var(--gris)', margin: '5px 0 0', maxWidth: 620 }}>
          Períodos seguidos sin cumplirse, por «no pude» o por vencer sin marcar. Ordenado por cuánto del cargo de
          cada quien está sin cumplir, que es lo único comparable entre personas y entre cadencias.
        </p>
      </header>

      {gente.map((p) => (
        <section key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <Link href={`/admin/${p.id}`} style={{ fontSize: 17, fontWeight: 700, color: 'var(--tinta)', textDecoration: 'none' }}>
              {p.nombre}
            </Link>
            {p.arrastrado > 0 ? (
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#D9503A' }}>
                {p.arrastrado}% de su cargo sin cumplirse
              </span>
            ) : (
              <span style={{ fontSize: 13.5, color: '#5E9E62' }}>al día</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {p.funciones
              .filter((f) => f.deLaFuncion.periodos > 0)
              .map((f) => (
                <div
                  key={f.funcionId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'var(--suave)',
                    borderRadius: 12,
                    padding: '9px 14px',
                  }}
                >
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: 13.5 }}>{f.texto}</span>

                  <span style={{ fontSize: 12.5, color: 'var(--gris)', whiteSpace: 'nowrap' }}>
                    {f.ponderacion}% · {f.periodicidad}
                  </span>

                  {/* Dos hechos, dos preguntas. Lo que arrastra quien la tiene
                      dice que es justo pedirle hoy; lo que arrastra la funcion
                      dice si el trabajo esta roto, y eso no señala a nadie. */}
                  <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                    {f.delTitular.periodos > 0 ? (
                      <strong style={{ color: '#D9503A' }}>
                        {f.delTitular.periodos} {f.delTitular.periodos === 1 ? 'período' : 'períodos'}
                        <span style={{ fontWeight: 400, color: 'var(--gris)' }}>
                          {' '}
                          desde {fechaCorta(f.delTitular.desde!)}
                        </span>
                      </strong>
                    ) : (
                      <span style={{ color: '#5E9E62' }}>al día con quien la tiene</span>
                    )}
                  </span>

                  <span
                    title={`La función lleva ${f.deLaFuncion.periodos} períodos sin cumplirse${f.manos > 1 ? `, con ${f.manos} titulares` : ''}`}
                    style={{ fontSize: 12, color: '#8A7A3E', whiteSpace: 'nowrap', cursor: 'default' }}
                  >
                    {f.manos > 1 ? '🔁' : '🐢'} la función, {f.deLaFuncion.periodos}
                    {f.manos > 1 ? ` en ${f.manos} manos` : ''}
                  </span>
                </div>
              ))}

            {p.funciones.every((f) => f.deLaFuncion.periodos === 0) && (
              <p style={{ fontSize: 13, color: 'var(--gris)', margin: 0 }}>Nada pendiente de períodos anteriores.</p>
            )}
          </div>
        </section>
      ))}

      {gente.length === 0 && <p style={{ color: 'var(--gris)', fontSize: 14 }}>Todavía no hay nada que mirar.</p>}
    </main>
  );
}
