import {
  Calendario,
  cuadranteDe,
  emojiDe,
  estadosVigentes,
  importanciaEfectiva,
  ocurrenciasEntre,
  ordenarPlan,
  pendientes,
  proximas,
  unaPorFuncion,
  urgenciaDe,
  type Cuadrante,
  type Periodicidad,
} from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';
import { cambiarEstadoFlujo, marcarHecho, marcarNoPude } from './acciones';

type FilaFuncion = {
  id: string;
  texto: string;
  importancia: number;
  ponderacion: number;
  periodicidad: Periodicidad;
  tipo_generado: string | null;
  tipo_corregido: string | null;
  dia_tope_generado: number | null;
  dia_tope_corregido: number | null;
  fecha_alta: string;
};

// La ventana de cinco dias habiles es la meta de la semana; la lista siempre
// trae lo mas proximo, aunque venza despues.
const CUANTAS = 5;

export default async function Semana() {
  const supabase = await clienteDelServidor();
  const hoy = new Date().toISOString().slice(0, 10);
  const hasta = new Date(Date.now() + 120 * 864e5).toISOString().slice(0, 10);

  // La seguridad por fila filtra por empleado: aqui no se filtra a mano.
  const [{ data: funciones }, { data: noHabiles }, { data: marcas }, { data: eventos }] =
    await Promise.all([
      supabase
        .from('funcion')
        .select(
          'id, texto, importancia, ponderacion, periodicidad, tipo_generado, tipo_corregido, dia_tope_generado, dia_tope_corregido, fecha_alta',
        )
        .eq('activa', true),
      supabase.from('dia_no_habil').select('desde, hasta'),
      supabase.from('marca').select('funcion_id, periodo'),
      supabase.from('evento_flujo').select('funcion_id, estado, razon, en'),
    ]);

  const calendario = Calendario.con(noHabiles ?? []);
  const todas = (funciones ?? []) as FilaFuncion[];
  const tipoDe = (f: FilaFuncion) => f.tipo_corregido ?? f.tipo_generado;
  const cerradas = (marcas ?? []).map((m) => ({ funcionId: m.funcion_id, periodo: m.periodo }));

  const ocurrencias = todas
    .filter((f) => tipoDe(f) === 'entregable')
    .flatMap((f) =>
      ocurrenciasEntre(
        {
          periodicidad: f.periodicidad,
          diaTope: f.dia_tope_corregido ?? f.dia_tope_generado ?? undefined,
          fechaAlta: f.fecha_alta,
        },
        calendario,
        hoy,
        hasta,
      ).map((o) => ({
        ...o,
        funcionId: f.id,
        texto: f.texto,
        importancia: f.importancia,
        ponderacion: f.ponderacion,
        periodicidad: f.periodicidad,
      })),
    )
    .map((o) => ({ ...o, faltan: calendario.habilesEntre(hoy, o.vence) }));

  // Una funcion aporta una sola fila: la ocurrencia que viene (INV-10).
  const plan = ordenarPlan(
    proximas(unaPorFuncion(pendientes(ocurrencias, cerradas)), CUANTAS).map((o) => {
      const urgencia = urgenciaDe(o.faltan);
      const efectiva = importanciaEfectiva(o.importancia, o.faltan, o.periodicidad);
      return { ...o, urgencia, cuadrante: cuadranteDe(urgencia, efectiva) };
    }),
  );

  const vigentes = new Map(
    estadosVigentes(
      (eventos ?? []).map((e) => ({
        funcionId: e.funcion_id,
        estado: e.estado as 'al_dia' | 'atrasado',
        razon: e.razon ?? undefined,
        en: e.en,
      })),
    ).map((e) => [e.funcionId, e]),
  );

  const flujos = todas
    .filter((f) => tipoDe(f) === 'flujo')
    .map((f) => ({ ...f, vigente: vigentes.get(f.id) }))
    .sort((a, b) => b.importancia - a.importancia);

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <div>
            <h1 style={{ fontSize: 22, letterSpacing: '-0.02em', margin: 0 }}>
              Lo que tenemos esta semana
            </h1>
            <p style={{ color: 'var(--gris)', fontSize: 14, margin: '4px 0 0' }}>
              Lo más próximo primero. JFS lee lo que escribas al marcar que no pudiste.
            </p>
          </div>

          {plan.length === 0 && (
            <p style={{ color: 'var(--gris)', fontSize: 15 }}>
              Todavía no tienes entregables asignados.
            </p>
          )}

          {plan.map((o) => (
            <article key={o.funcionId} style={{ ...TARJETA, ...COLOR[o.cuadrante] }}>
              <span
                title={`Vence en ${o.faltan} días hábiles`}
                style={{ ...CIRCULO, background: COLOR[o.cuadrante].velo }}
              >
                {emojiDe(o.faltan)}
              </span>

              <span style={{ flexGrow: 1, minWidth: 0, fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>
                {o.texto}
              </span>

              <span style={{ display: 'flex', gap: 6, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                <Numero etiqueta="IMP" valor={o.importancia} velo={COLOR[o.cuadrante].velo} />
                <Numero etiqueta="URG" valor={o.urgencia} velo={COLOR[o.cuadrante].velo} />
              </span>

              <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <form action={marcarHecho.bind(null, o.funcionId, o.periodo)}>
                  <button style={BOTON}>¡Hecho!</button>
                </form>

                <details>
                  <summary
                    title="No pude"
                    style={{ ...BOTON, width: 40, justifyContent: 'center', color: '#c62828', listStyle: 'none' }}
                  >
                    ✕
                  </summary>
                  <form action={marcarNoPude.bind(null, o.funcionId, o.periodo)} style={DESPLEGABLE}>
                    <input name="razon" required placeholder="¿Qué pasó? JFS lo lee" style={CAMPO} />
                    <button style={BOTON}>Guardar</button>
                  </form>
                </details>
              </span>
            </article>
          ))}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <div>
            <h2 style={{ fontSize: 22, letterSpacing: '-0.02em', margin: 0 }}>Lo que llevas al día</h2>
            <p style={{ color: 'var(--gris)', fontSize: 14, margin: '4px 0 0' }}>
              No se terminan: se sostienen. Avisa cuando se te acumulen.
            </p>
          </div>

          {flujos.length === 0 && (
            <p style={{ color: 'var(--gris)', fontSize: 15 }}>No tienes flujos asignados.</p>
          )}

          {flujos.map((f) => {
            const atrasado = f.vigente?.estado === 'atrasado';
            return (
              <article
                key={f.id}
                style={{
                  ...TARJETA,
                  ...COLOR.mantener,
                  alignItems: 'stretch',
                  flexDirection: 'column',
                  gap: 10,
                  paddingLeft: atrasado ? 10 : 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {atrasado && <span style={RIEL} />}
                  <span style={{ ...CIRCULO, background: COLOR.mantener.velo }}>
                    {atrasado ? '🐢' : '🍃'}
                  </span>
                  <span style={{ flexGrow: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>
                      {f.texto}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 13,
                        marginTop: 2,
                        color: atrasado ? '#9e3322' : 'rgba(42,35,19,0.66)',
                        fontWeight: atrasado ? 600 : 400,
                      }}
                    >
                      {atrasado ? 'me atrasé' : 'al día'}
                    </span>
                  </span>
                  <Numero etiqueta="IMP" valor={f.importancia} velo={COLOR.mantener.velo} />

                  {atrasado ? (
                    <form action={cambiarEstadoFlujo.bind(null, f.id, 'al_dia')}>
                      <button style={BOTON}>Ya me puse al día</button>
                    </form>
                  ) : (
                    <details>
                      <summary style={{ ...BOTON, listStyle: 'none' }}>Me atrasé</summary>
                      <form action={cambiarEstadoFlujo.bind(null, f.id, 'atrasado')} style={DESPLEGABLE}>
                        <input name="razon" required placeholder="¿Qué te frenó? JFS lo lee" style={CAMPO} />
                        <button style={BOTON}>Guardar</button>
                      </form>
                    </details>
                  )}
                </div>

                {atrasado && f.vigente?.razon && (
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4, paddingLeft: 58 }}>
                    “{f.vigente.razon}”
                  </p>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

const TARJETA = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  borderRadius: 20,
  padding: '12px 14px',
  minHeight: 66,
  boxSizing: 'border-box',
} as const;

const CIRCULO = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 46,
  height: 46,
  borderRadius: 999,
  fontSize: 23,
  flexShrink: 0,
} as const;

const RIEL = { width: 6, alignSelf: 'stretch', borderRadius: 999, background: '#d9503a', flexShrink: 0 } as const;

const BOTON = {
  display: 'flex',
  alignItems: 'center',
  height: 40,
  padding: '0 16px',
  borderRadius: 999,
  background: '#ffffff',
  color: 'var(--tinta)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
} as const;

const DESPLEGABLE = { position: 'absolute', marginTop: 8, display: 'flex', gap: 6, zIndex: 1 } as const;

const CAMPO = {
  height: 40,
  borderRadius: 999,
  border: 'none',
  padding: '0 16px',
  fontSize: 14,
  width: 240,
} as const;

// El color es el cuadrante; el emoji, la urgencia.
const COLOR: Record<Cuadrante, { background: string; color: string; velo: string }> = {
  hacer: { background: '#d9503a', color: '#fff4f0', velo: 'rgba(255,244,240,0.18)' },
  agendar: { background: '#1b6e8c', color: '#eef8fc', velo: 'rgba(238,248,252,0.18)' },
  mantener: { background: '#e8ce7a', color: '#2a2313', velo: 'rgba(42,35,19,0.14)' },
};

function Numero({ etiqueta, valor, velo }: { etiqueta: string; valor: number; velo: string }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 5,
        padding: '5px 10px',
        borderRadius: 999,
        background: velo,
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', opacity: 0.72 }}>
        {etiqueta}
      </span>
      {valor}
    </span>
  );
}
