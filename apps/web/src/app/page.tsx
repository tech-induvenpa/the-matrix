import {
  avisoDe,
  coberturaDe,
  cuadranteDe,
  emojiDe,
  estadosVigentes,
  importanciaEfectiva,
  mostrarResueltas,
  ocurrenciasEntre,
  ordenarPlan,
  pendientes,
  seleccionarPlan,
  tramosLlenos,
  TRAMOS,
  unaPorFuncion,
  urgenciaDe,
  type Aviso,
  type Cuadrante,
} from '@matriz/dominio';
import { diaTopeDe, esFinDeSemana, lunesDe, panorama, sumarDias, tipoDe } from '@/lib/datos';
import { cambiarEstadoFlujo, marcarHecho, marcarNoPude } from './acciones';

// La ventana de cinco dias habiles es la meta de la semana; la lista siempre
// trae lo mas proximo, aunque venza despues.
const CUANTAS = 5;

// ponytail: lo vencido sin marcar se rescata solo diez dias hacia atras. Mas
// atras no se arrastra: eso lo recoge el cierre del mes, no la lista del dia.
const RESCATE = 10;

export default async function Semana() {
  const { hoy, calendario, cargadoHasta, funciones, marcas, eventos } = await panorama();
  const cobertura = coberturaDe(calendario, hoy, cargadoHasta);

  const desde = sumarDias(hoy, -RESCATE);
  const hasta = sumarDias(hoy, 120);
  const lunes = lunesDe(hoy);
  const domingo = sumarDias(lunes, 6);

  const cerradas = marcas.map((m) => ({ funcionId: m.funcion_id, periodo: m.periodo }));
  const resultadoDe = new Map(marcas.map((m) => [`${m.funcion_id}|${m.periodo}`, m.resultado]));

  const ocurrencias = funciones
    .filter((f) => tipoDe(f) === 'entregable')
    .flatMap((f) =>
      ocurrenciasEntre(
        { periodicidad: f.periodicidad, diaTope: diaTopeDe(f), fechaAlta: f.fecha_alta },
        calendario,
        desde,
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

  const abiertas = pendientes(ocurrencias, cerradas);

  // Una funcion aporta una sola fila: la ocurrencia que viene (INV-10).
  const plan = ordenarPlan(
    seleccionarPlan(unaPorFuncion(abiertas), CUANTAS).map((o) => {
      const urgencia = urgenciaDe(o.faltan);
      const efectiva = importanciaEfectiva(o.importancia, o.faltan, o.periodicidad);
      return { ...o, urgencia, cuadrante: cuadranteDe(urgencia, efectiva) };
    }),
  );

  const vigentes = new Map(
    estadosVigentes(
      eventos.map((e) => ({
        funcionId: e.funcion_id,
        estado: e.estado as 'al_dia' | 'atrasado',
        razon: e.razon ?? undefined,
        en: e.en,
      })),
    ).map((e) => [e.funcionId, e]),
  );

  const flujos = funciones
    .filter((f) => tipoDe(f) === 'flujo')
    .map((f) => ({ ...f, vigente: vigentes.get(f.id) }))
    .sort((a, b) => b.importancia - a.importancia);

  // --- La semana: cuanto vencia, cuanto quedo cerrado, que hay que avisar ---
  const deLaSemana = ocurrencias.filter((o) => o.vence >= lunes && o.vence <= domingo);
  const abiertasDeLaSemana = new Set(
    pendientes(deLaSemana, cerradas).map((o) => `${o.funcionId}|${o.periodo}`),
  );
  const cerradasDeLaSemana = deLaSemana.filter(
    (o) => !abiertasDeLaSemana.has(`${o.funcionId}|${o.periodo}`),
  );

  const noHabilesDeLaSemana = diasDelRango(hoy, domingo).filter(
    (d) => !esFinDeSemana(d) && !calendario.esHabil(d),
  ).length;

  const aviso = avisoDe({
    sinCobertura: cobertura.estado === 'sin_cobertura',
    noHabilesEnLaVentana: noHabilesDeLaSemana,
    venceHoyOManana: plan.some((o) => o.faltan <= 1),
    diasDelFlujoMasAtrasado: Math.max(
      0,
      ...flujos
        .filter((f) => f.vigente?.estado === 'atrasado')
        .map((f) => calendario.habilesEntre(f.vigente!.en.slice(0, 10), hoy)),
    ),
    hayAtrasoSinConstancia: abiertas.some((o) => o.vence < hoy),
  });

  const llenos = tramosLlenos(cerradasDeLaSemana.length, deLaSemana.length);

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 16px 32px' }}>
      <section style={{ ...BANNER, ...(aviso.registro === 'alerta' ? BANNER_ALERTA : BANNER_TRANQUILO) }}>
        <Arco llenos={llenos} />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.25 }}>
            {titular(aviso, {
              noHabiles: noHabilesDeLaSemana,
              vencidas: abiertas.filter((o) => o.vence < hoy).length,
            })}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--gris)' }}>
            {deLaSemana.length === 0
              ? 'Esta semana no vence nada tuyo. Abajo está lo que viene.'
              : `${cerradasDeLaSemana.length} de ${deLaSemana.length} de esta semana.`}
          </p>
        </div>
      </section>

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

          {/* Lo ya resuelto no estorba mientras queda mucho por hacer. */}
          {mostrarResueltas(cerradasDeLaSemana.length, deLaSemana.length) && (
            <div style={{ marginTop: 6 }}>
              <h2 style={{ fontSize: 14, color: 'var(--gris)', margin: '0 0 8px', fontWeight: 600 }}>
                Ya resueltas esta semana
              </h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cerradasDeLaSemana.map((o) => {
                  const pudo = resultadoDe.get(`${o.funcionId}|${o.periodo}`) === 'hecho';
                  return (
                    <li key={`${o.funcionId}|${o.periodo}`} style={RESUELTA}>
                      <span style={{ opacity: 0.7 }}>{pudo ? '✓' : '✕'}</span>
                      <span style={{ textDecoration: pudo ? 'line-through' : 'none', opacity: 0.8 }}>
                        {o.texto}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
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

function diasDelRango(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) dias.push(d);
  return dias;
}

// El banner siempre dice algo; el color se reserva para lo excepcional.
function titular(aviso: Aviso, datos: { noHabiles: number; vencidas: number }): string {
  switch (aviso.clave) {
    case 'sin_cobertura':
      return 'Faltan feriados por cargar: avísale a JFS antes de fiarte de estas fechas.';
    case 'dias_no_habiles':
      return datos.noHabiles === 1
        ? 'Esta semana hay un día no laborable: tus fechas ya están corridas.'
        : `Esta semana hay ${datos.noHabiles} días no laborables: tus fechas ya están corridas.`;
    case 'vence_pronto':
      return 'Tienes algo que vence hoy o mañana.';
    case 'flujo_atrasado':
      return 'Un flujo lleva días esperando. Cuando lo retomes, avísanos.';
    case 'recordatorio':
      return datos.vencidas === 1
        ? 'Quedó una sin marcar. Ciérrala cuando puedas.'
        : `Quedaron ${datos.vencidas} sin marcar. Ciérralas cuando puedas.`;
    case 'avance':
      return 'Vas al día.';
  }
}

// Veinte tramos fijos: es progreso, no un contador.
function Arco({ llenos }: { llenos: number }) {
  const r = 52;
  const cx = 60;
  const cy = 58;
  const punto = (grados: number) => {
    const a = (grados * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  };

  return (
    <svg viewBox="0 0 120 68" width={108} height={61} aria-hidden style={{ flexShrink: 0 }}>
      {Array.from({ length: TRAMOS }, (_, i) => (
        <path
          key={i}
          d={`M ${punto(180 + i * 9 + 1)} A ${r} ${r} 0 0 1 ${punto(180 + i * 9 + 8)}`}
          stroke={i < llenos ? '#1b6e8c' : 'rgba(26,23,19,0.12)'}
          strokeWidth={8}
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </svg>
  );
}

const BANNER = {
  display: 'flex',
  alignItems: 'center',
  gap: 18,
  borderRadius: 24,
  padding: '14px 20px',
  marginBottom: 24,
} as const;

const BANNER_ALERTA = { background: '#fdf0e6', color: 'var(--tinta)' } as const;
const BANNER_TRANQUILO = { background: 'var(--suave)', color: 'var(--tinta)' } as const;

const RESUELTA = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 15,
  color: 'var(--gris)',
  padding: '2px 4px',
} as const;

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
