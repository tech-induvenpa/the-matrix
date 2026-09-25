import { imprevistosDelEquipo, reporte } from '@/lib/reporte';
import { fechaCorta, quienPidio } from '@/lib/datos';
import { enPalabras } from '../../imprevistos';
import { Ir } from '../../ir';

// Lo que el administrador venia a buscar: que se esta ejecutando y que no.
//
// Ordenado por cuanto del cargo de cada quien esta sin cumplirse, no por quien
// falla mas veces. Eso cambia a quien señala: una diaria de tres puntos con
// veinte incumplimientos pesa menos que una mensual de veinticinco con uno.
export default async function Reporte() {
  const [gente, equipo] = await Promise.all([reporte(), imprevistosDelEquipo()]);

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
            <Ir href={`/admin/${p.id}`} style={{ fontSize: 17, fontWeight: 700, color: 'var(--tinta)', textDecoration: 'none' }}>
              {p.nombre}
            </Ir>
            {/* Dos numeros, porque no dicen lo mismo. El peso dice cuanto duele;
                cuantas dice si hay algo que mirar. Una funcion de cero por
                ciento no mueve el primero y si el segundo, que es justo para lo
                que existe. */}
            {p.arrastrando > 0 ? (
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#D9503A' }}>
                {p.arrastrando} {p.arrastrando === 1 ? 'función arrastrando' : 'funciones arrastrando'}
                {p.arrastrado > 0 ? ` · ${p.arrastrado}% de su cargo` : ' · sin peso en su cargo'}
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

      <ImprevistosDelEquipo equipo={equipo} />
    </main>
  );
}

// Lo que cayo sin estar en el reparto de nadie (CEB-146). Tres preguntas:
// cuantos le caen a cada quien, si los termina, y cuanto de lo previsto
// desplazaron. Los textos van tal cual, sin agrupar: el imprevisto que se
// repite se reconoce a ojo, y es una funcion que nadie ha dado de alta.
function ImprevistosDelEquipo({ equipo }: { equipo: Awaited<ReturnType<typeof imprevistosDelEquipo>> }) {
  const { personas, porQuienPidio, quienesPiden } = equipo;

  return (
    <>
      <header style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Lo que cayó sin estar previsto 🌪️</h2>
        <p style={{ fontSize: 14, color: 'var(--gris)', margin: '5px 0 0', maxWidth: 620 }}>
          Imprevistos del mes, y los de antes que siguen abiertos. La ponderación desplazada es cuánto del cargo de
          cada quien no se cumplió porque, según su propia marca, se le metió un imprevisto.
        </p>
      </header>

      {personas.length === 0 && <p style={{ color: 'var(--gris)', fontSize: 14 }}>Este mes no ha caído ningún imprevisto.</p>}

      {personas.map((p) => (
        <section key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <Ir href={`/admin/${p.id}`} style={{ fontSize: 17, fontWeight: 700, color: 'var(--tinta)', textDecoration: 'none' }}>
              {p.nombre}
            </Ir>
            {p.desplazada > 0 && (
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#D9503A' }}>{p.desplazada}% de su cargo desplazado</span>
            )}
          </div>
          {p.cifras && <p style={{ fontSize: 13.5, margin: 0 }}>{enPalabras(p.cifras)}</p>}

          {p.vinculos.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#8A5A3E' }}>
              {p.vinculos.map((v, n) => (
                <li key={n}>
                  «{v.previsto}» no se cumplió por «{v.imprevisto}»
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {p.imprevistos.map((i) => (
              <div key={i.id} style={{ display: 'flex', gap: 12, background: 'var(--suave)', borderRadius: 10, padding: '7px 12px', fontSize: 13 }}>
                <span style={{ flexGrow: 1, minWidth: 0 }}>{i.texto}</span>
                <span style={{ color: 'var(--gris)', whiteSpace: 'nowrap' }}>
                  {quienPidio(i, quienesPiden)} · {fechaCorta(i.pedido_en.slice(0, 10))}
                </span>
                <span style={{ whiteSpace: 'nowrap' }} title={i.razon ?? undefined}>
                  {i.resultado === 'hecho' ? '✅' : i.resultado === 'no_pude' ? '✕ no pudo' : i.resultado === 'no_lo_tome' ? '🙅 no lo tomó' : 'abierto'}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}

      {porQuienPidio.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Por quién lo pidió</h3>
          {porQuienPidio.map(([quien, c]) => (
            <p key={quien} style={{ fontSize: 13.5, margin: 0 }}>
              <strong>{quien}</strong>: {enPalabras(c)}
            </p>
          ))}
        </section>
      )}
    </>
  );
}
