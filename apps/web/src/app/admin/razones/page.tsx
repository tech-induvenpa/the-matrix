import { delFiltro } from '@matriz/dominio';
import { razonesDelEquipo } from '@/lib/reporte';
import { filtroDe, pertenencias, type ParametrosDelFiltro } from '@/lib/pertenencia';
import { Filtrar } from '../../filtro';
import { fechaCorta } from '@/lib/datos';
import { Ir } from '../../ir';

// Lo que reemplaza a la pestaña de razones. La diferencia que justifica el
// cambio: aquí se puede filtrar, y ahí no se podía.
//
// El texto se muestra tal como se escribió. Agrupar por causa pediría un modelo
// de lenguaje en texto de interfaz, y eso está descartado desde el principio.
export default async function Razones({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string; funcion?: string } & ParametrosDelFiltro>;
}) {
  const parametros = await searchParams;
  const { persona, funcion } = parametros;
  const [todas, { opciones, dePersona }] = await Promise.all([razonesDelEquipo(), pertenencias()]);

  // Empresa, sede y texto se combinan con persona y funcion (CEB-184). El
  // texto encuentra a la persona, su empresa o la funcion de la razon.
  const filtro = filtroDe(parametros);
  const filtradas = todas.filter(
    (r) =>
      (!persona || r.personaId === persona) &&
      (!funcion || r.funcionId === funcion) &&
      delFiltro({ nombre: r.persona, ...dePersona(r.personaId) }, [r], (x) => x.funcion, filtro) !== null,
  );

  const gente = [...new Map(todas.map((r) => [r.personaId, r.persona])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );

  return (
    <main style={{ maxWidth: 940, margin: '0 auto', padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Qué dijeron 💬</h1>
        <p style={{ fontSize: 14, color: 'var(--gris)', margin: '5px 0 0', maxWidth: 620 }}>
          Cada «no pude», cada atraso y cada puesta al día, con la razón tal como se escribió. Atribuida a quien tenía
          la función ese día, no a quien la tiene hoy.
        </p>
      </header>

      <Filtrar opciones={opciones} valores={parametros} conservar={{ persona, funcion }} />

      <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
        <Filtro href="/admin/razones" activo={!persona && !funcion}>
          Todos
        </Filtro>
        {gente.map(([id, nombre]) => (
          <Filtro key={id} href={`/admin/razones?persona=${id}`} activo={persona === id}>
            {nombre}
          </Filtro>
        ))}
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtradas.map((r, i) => (
          <article
            key={`${r.funcionId}-${r.en}-${i}`}
            style={{ background: 'var(--suave)', borderRadius: 14, padding: '12px 16px' }}
          >
            {/* Lo que cede el sitio es el nombre de la funcion, que es lo unico
                largo: parte en varias lineas dentro de su hueco. Antes envolvia
                la fila entera y el enlace y la fecha se caian debajo. */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <strong style={{ fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0 }}>{r.persona}</strong>
              <span
                style={{
                  fontSize: 12.5,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  color: r.quePaso === 'me puse al día' ? '#5E9E62' : '#C97B72',
                }}
              >
                {r.quePaso}
              </span>

              <span style={{ fontSize: 12.5, color: 'var(--gris)', flexGrow: 1, minWidth: 0, lineHeight: 1.35 }}>
                {r.funcion}
              </span>

              <span style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexShrink: 0, whiteSpace: 'nowrap' }}>
                <Ir href={`/admin/razones?funcion=${r.funcionId}`} style={{ fontSize: 12, color: 'var(--gris)' }}>
                  solo esta función
                </Ir>
                <span style={{ fontSize: 12.5, color: 'var(--gris)' }}>{fechaCorta(r.en)}</span>
              </span>
            </div>
            <p style={{ fontSize: 14, margin: '8px 0 0', lineHeight: 1.45 }}>“{r.razon}”</p>
          </article>
        ))}

        {filtradas.length === 0 && (
          <p style={{ color: 'var(--gris)', fontSize: 14 }}>
            {todas.length === 0 ? 'Todavía nadie ha escrito nada.' : 'Nada con ese filtro.'}
          </p>
        )}
      </div>
    </main>
  );
}

function Filtro({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Ir
      href={href}
      style={{
        padding: '5px 12px',
        borderRadius: 999,
        background: activo ? 'var(--tinta)' : 'rgba(26,23,19,0.06)',
        color: activo ? '#fff' : 'var(--tinta)',
        textDecoration: 'none',
        fontWeight: activo ? 600 : 400,
      }}
    >
      {children}
    </Ir>
  );
}
