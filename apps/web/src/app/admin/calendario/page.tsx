import { elCalendario } from '@/lib/administrador';
import { borrarDiaNoHabil, cargarDiasNoHabiles, declararCobertura } from '../acciones';
import { Accion } from '../../accion';
import { Enviar } from '../../boton';
import { AvisoDeCobertura } from '../cobertura';

// Los dias en que esta empresa no trabaja, y hasta donde alguien lo reviso.
export default async function CalendarioDeJFS() {
  const { dias, cargadoHasta, cobertura } = await elCalendario();

  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>El calendario 📅</h1>
        <p style={{ fontSize: 14, color: 'var(--gris)', margin: '5px 0 0', maxWidth: 560 }}>
          Los días en que no se trabaja, como rangos: un feriado es un rango de un día, las colectivas son un bloque.
          Los fines de semana se cuentan solos.
        </p>
      </header>

      <AvisoDeCobertura cobertura={cobertura} cargadoHasta={cargadoHasta} />

      <section style={{ background: 'var(--suave)', borderRadius: 16, padding: '18px 20px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Hasta dónde lo revisaste</h2>
        <p style={{ fontSize: 13, color: 'var(--gris)', margin: '0 0 12px', maxWidth: 520 }}>
          El sistema calcula hasta esta fecha y ni un día más. Sin esto, «no hay nada en marzo» sería indistinguible
          de «marzo no lo ha mirado nadie».
        </p>
        <Accion accion={declararCobertura}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input name="cargadoHasta" type="date" defaultValue={cargadoHasta} style={CAMPO} />
            <Enviar style={BOTON} enviando="Guardando…">
              Lo revisé hasta aquí
            </Enviar>
          </div>
        </Accion>
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>Un día o un bloque nuevo</h2>
        <Accion accion={cargarDiasNoHabiles}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={ETIQUETA}>
              Desde
              <input name="desde" type="date" required style={CAMPO} />
            </label>
            <label style={ETIQUETA}>
              Hasta (vacío = un solo día)
              <input name="hasta" type="date" style={CAMPO} />
            </label>
            <label style={{ ...ETIQUETA, flexGrow: 1, minWidth: 180 }}>
              Qué es
              <input name="descripcion" placeholder="Colectivas de diciembre" style={CAMPO} />
            </label>
            <Enviar style={BOTON} enviando="Cargando…">
              Cargar
            </Enviar>
          </div>
        </Accion>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {dias.map((d) => (
          <div
            key={d.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--suave)',
              borderRadius: 12,
              padding: '9px 14px',
            }}
          >
            <span style={{ fontSize: 13.5, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {d.desde === d.hasta ? d.desde : `${d.desde} → ${d.hasta}`}
            </span>
            <span style={{ flexGrow: 1, minWidth: 0, fontSize: 13.5, color: 'var(--gris)' }}>{d.descripcion}</span>
            <Accion accion={borrarDiaNoHabil.bind(null, d.id)}>
              <Enviar style={{ fontSize: 12.5, color: 'var(--gris)', background: 'none', cursor: 'pointer' }} enviando="…">
                Quitar
              </Enviar>
            </Accion>
          </div>
        ))}

        {dias.length === 0 && <p style={{ color: 'var(--gris)', fontSize: 14 }}>Todavía no hay ningún día cargado.</p>}
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

const ETIQUETA = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--gris)' } as const;

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
