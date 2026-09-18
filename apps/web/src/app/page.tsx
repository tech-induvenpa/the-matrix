import Link from 'next/link';
import {
  avisoDe,
  coberturaDe,
  cuadranteDe,
  diasSeguidosCerrando,
  estadosVigentes,
  etapaDe,
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
  type Etapa,
} from '@matriz/dominio';
import { diaTopeDe, esFinDeSemana, lunesDe, panorama, sumarDias, tipoDe } from '@/lib/datos';
import { cambiarEstadoFlujo, salir } from './acciones';
import { Accion } from './accion';
import { Enviar } from './boton';
import { Adelantar, CierreDeSemana } from './celebracion';
import { PorQue } from './porque';
import { CIRCULO, Numero, Tarjeta, YaResueltas } from './tarjeta';

// La ventana de cinco dias habiles es la meta de la semana; la lista siempre
// trae lo mas proximo, aunque venza despues.
const CUANTAS = 5;

// ponytail: lo vencido sin marcar se rescata solo diez dias hacia atras. Mas
// atras no se arrastra: eso lo recoge el cierre del mes, no la lista del dia.
const RESCATE = 10;

export default async function Semana() {
  const { hoy, nombre, calendario, cargadoHasta, funciones, marcas, eventos } = await panorama();

  const desde = sumarDias(hoy, -RESCATE);
  const hasta = sumarDias(hoy, 120);
  const lunes = lunesDe(hoy);
  const domingo = sumarDias(lunes, 6);
  const primeroDelMes = `${hoy.slice(0, 7)}-01`;
  const ultimoDelMes = new Date(Date.UTC(+hoy.slice(0, 4), +hoy.slice(5, 7), 0)).toISOString().slice(0, 10);

  const cobertura = coberturaDe(calendario, hoy, cargadoHasta);
  const cerradas = marcas.map((m) => ({ funcionId: m.funcion_id, periodo: m.periodo }));
  const marcaDe = new Map(marcas.map((m) => [`${m.funcion_id}|${m.periodo}`, m]));

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
  const conCuadrante = (o: (typeof ocurrencias)[number]) => {
    const urgencia = urgenciaDe(o.faltan);
    const efectiva = importanciaEfectiva(o.importancia, o.faltan, o.periodicidad);
    return { ...o, urgencia, cuadrante: cuadranteDe(urgencia, efectiva) };
  };

  const elegidas = seleccionarPlan(unaPorFuncion(abiertas), CUANTAS);
  const plan = ordenarPlan(elegidas.map(conCuadrante));

  // Lo que viene despues, por si alguien quiere adelantar trabajo.
  const siguientes = ordenarPlan(
    seleccionarPlan(unaPorFuncion(abiertas), CUANTAS * 2).slice(CUANTAS).map(conCuadrante),
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

  // El arco cuenta el mes, no la semana: es como se siente el mes avanzando.
  const delMes = ocurrencias.filter((o) => o.vence >= primeroDelMes && o.vence <= ultimoDelMes);
  const abiertasDelMes = new Set(pendientes(delMes, cerradas).map((o) => `${o.funcionId}|${o.periodo}`));
  const cerradasDelMes = delMes.filter((o) => !abiertasDelMes.has(`${o.funcionId}|${o.periodo}`));
  const etapa = etapaDe(cerradasDelMes.length, delMes.length);

  // Lo resuelto que se muestra debajo de la lista sigue siendo el de la semana.
  const deLaSemana = ocurrencias.filter((o) => o.vence >= lunes && o.vence <= domingo);
  const abiertasDeLaSemana = new Set(pendientes(deLaSemana, cerradas).map((o) => `${o.funcionId}|${o.periodo}`));
  const cerradasDeLaSemana = deLaSemana.filter((o) => !abiertasDeLaSemana.has(`${o.funcionId}|${o.periodo}`));

  // La meta de la semana: todo lo que vencia entre lunes y domingo, cerrado.
  const metaCumplida = deLaSemana.length > 0 && abiertasDeLaSemana.size === 0;

  // Dias habiles seguidos, hacia atras, con todo lo que vencia cerrado.
  const cerradaLaOcurrencia = (o: { funcionId: string; periodo: string }) =>
    !abiertasDelMes.has(`${o.funcionId}|${o.periodo}`);

  const racha = diasSeguidosCerrando(
    diasDelRango(sumarDias(hoy, -40), hoy)
      .filter((d) => calendario.esHabil(d))
      .map((fecha) => {
        const delDia = ocurrencias.filter((o) => o.vence === fecha);
        return { fecha, total: delDia.length, cerradas: delDia.filter(cerradaLaOcurrencia).length };
      }),
  );

  const noHabilesDeLaSemana = diasDelRango(hoy, domingo).filter(
    (d) => !esFinDeSemana(d) && !calendario.esHabil(d),
  ).length;

  const diasDelFlujoMasAtrasado = Math.max(
    0,
    ...flujos
      .filter((f) => f.vigente?.estado === 'atrasado')
      .map((f) => calendario.habilesEntre(f.vigente!.en.slice(0, 10), hoy)),
  );

  const aviso = avisoDe({
    sinCobertura: cobertura.estado === 'sin_cobertura',
    noHabilesEnLaVentana: noHabilesDeLaSemana,
    venceHoyOManana: plan.some((o) => o.faltan <= 1),
    diasDelFlujoMasAtrasado,
    hayAtrasoSinConstancia: abiertas.some((o) => o.vence < hoy),
  });

  const fecha = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
    .format(new Date(`${hoy}T00:00:00Z`))
    .replace(',', '');

  const mes = new Intl.DateTimeFormat('es', { month: 'long', timeZone: 'UTC' }).format(
    new Date(`${hoy}T00:00:00Z`),
  );

  const { titulo, nota } = textoDelAviso(aviso, {
    noHabiles: noHabilesDeLaSemana,
    vencidas: abiertas.filter((o) => o.vence < hoy).length,
    dias: diasDelFlujoMasAtrasado,
    proxima: plan[0]?.texto ?? '',
    faltan: plan[0]?.faltan ?? 0,
    solaEnLaSemana: abiertasDeLaSemana.size === 1,
  });

  const diaDeHoy = new Intl.DateTimeFormat('es', { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(`${hoy}T00:00:00Z`),
  );

  const cabecera = (
    <div style={{ display: 'flex', gap: 11, padding: '11px 11px 0', flexWrap: 'wrap' }}>
        <section style={PANEL}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>¡Buenos días, {nombre}! 👋</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={CHIP}>{fecha}</span>
              <form action={salir}>
                <button title="Salir" aria-label="Salir" style={{ ...CHIP, width: 33, height: 33, padding: 0, justifyContent: 'center' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, flexWrap: 'wrap', padding: '10px 0' }}>
            <Arco llenos={tramosLlenos(cerradasDelMes.length, delMes.length)} emoji={ETAPA[etapa].emoji} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxWidth: 271 }}>
              <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.08, color: '#E8A33F', margin: 0 }}>
                {ETAPA[etapa].titulo(mes)}
              </p>
              <p style={{ fontSize: 13, color: 'var(--gris)', margin: 0 }}>{ETAPA[etapa].nota(mes)}</p>
            </div>
          </div>
        </section>

        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 9,
            borderRadius: 20,
            padding: '18px 20px',
            flex: '1 1 260px',
            minWidth: 0,
            boxSizing: 'border-box',
            background: aviso.registro === 'alerta' ? '#E8A33F' : 'var(--suave)',
            color: aviso.registro === 'alerta' ? '#2A2313' : 'var(--tinta)',
          }}
        >
          <div style={{ fontSize: 31, lineHeight: 1 }}>{EMOJI_AVISO[aviso.clave]}</div>
          <p style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.12, margin: 0 }}>{titulo}</p>
          <p style={{ fontSize: 11, lineHeight: 1.45, margin: 0, color: aviso.registro === 'alerta' ? 'rgba(42,35,19,0.78)' : 'var(--gris)' }}>
            {nota}
          </p>
        </section>
    </div>
  );

  return (
    <main style={{ display: 'flex', flexDirection: 'column', maxWidth: 1440, margin: '0 auto' }}>
      {metaCumplida ? (
        <CierreDeSemana
          cabecera={cabecera}
          nota={`Todo lo que vencía esta semana, resuelto. Y estamos a ${diaDeHoy}.`}
        />
      ) : (
        cabecera
      )}

      <div
        style={{
          flexGrow: 1,
          padding: '14px 34px 16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: 24,
        }}
      >
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
              {metaCumplida ? 'Si te provoca seguir, esto es lo que viene' : 'Lo que tenemos esta semana'}
            </h2>
            <Link href="/mes" style={{ color: 'var(--gris)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              Ver todo tu mes →
            </Link>
          </div>

          {plan.length === 0 && (
            <p style={{ color: 'var(--gris)', fontSize: 15 }}>Todavía no tienes entregables asignados.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {plan.map((o) => (
              <Tarjeta key={o.funcionId} o={o} hoy={hoy} />
            ))}
          </div>

          {metaCumplida && (
            <Adelantar
              cuantas={siguientes.length}
              logros={
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {racha > 1 && (
                    <div style={LOGRO}>
                      <span style={{ fontSize: 28 }}>🔥</span>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{racha} días seguidos</div>
                        <div style={{ fontSize: 13, color: 'var(--gris)' }}>
                          cerrando lo que vence. Vuelve mañana para no perderla.
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={LOGRO}>
                    <span style={{ fontSize: 28 }}>📅</span>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {cerradasDelMes.length} de {delMes.length}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--gris)' }}>de este mes, ya resueltas.</div>
                    </div>
                  </div>
                </div>
              }
              extras={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {siguientes.map((o) => (
                    <Tarjeta key={o.funcionId} o={o} hoy={hoy} />
                  ))}
                </div>
              }
            />
          )}

          {/* Lo ya resuelto no estorba mientras queda mucho por hacer. */}
          {mostrarResueltas(cerradasDeLaSemana.length, deLaSemana.length) && (
            <YaResueltas cerradas={cerradasDeLaSemana} marcaDe={marcaDe} />
          )}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Lo que llevas al día</h2>

          {flujos.length === 0 && <p style={{ color: 'var(--gris)', fontSize: 15 }}>No tienes flujos asignados.</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {flujos.map((f) => {
              const atrasado = f.vigente?.estado === 'atrasado';
              const dias = atrasado ? calendario.habilesEntre(f.vigente!.en.slice(0, 10), hoy) : 0;

              return (
                <article key={f.id} style={{ display: 'flex', gap: 10, background: '#E8CE7A', color: '#2A2313', borderRadius: 20, padding: '10px 12px', boxSizing: 'border-box' }}>
                  {atrasado && <span style={{ width: 5, borderRadius: 999, background: '#D9503A', flexShrink: 0 }} />}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexGrow: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ ...CIRCULO, background: 'rgba(42,35,19,0.14)' }}>{atrasado ? '🐢' : '🍃'}</span>

                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em' }}>{f.texto}</span>
                        <span style={{ fontSize: 13, color: atrasado ? '#9E3322' : 'rgba(42,35,19,0.66)', fontWeight: atrasado ? 600 : 400 }}>
                          {atrasado ? `me atrasé · ${dias} ${dias === 1 ? 'día' : 'días'}` : 'al día'}
                        </span>
                      </span>

                      <Numero etiqueta="IMP" valor={f.importancia} velo="rgba(42,35,19,0.14)" />

                      {atrasado ? (
                        <Accion accion={cambiarEstadoFlujo.bind(null, f.id, 'al_dia')}>
                          <Enviar style={FLUJO}>Ya me puse al día</Enviar>
                        </Accion>
                      ) : (
                        <PorQue
                          accion={cambiarEstadoFlujo.bind(null, f.id, 'atrasado')}
                          titulo="Me atrasé"
                          placeholder="¿Qué te frenó? Así lo entendemos luego"
                          estilo={FLUJO}
                        >
                          Me atrasé
                        </PorQue>
                      )}
                    </div>

                    {atrasado && f.vigente?.razon && (
                      <p style={{ margin: 0, fontSize: 12.5, paddingLeft: 54, color: 'rgba(42,35,19,0.86)' }}>
                        “{f.vigente.razon}”
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
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

// Veinte tramos fijos, sea cual sea el total: es progreso, no un contador.
function Arco({ llenos, emoji }: { llenos: number; emoji: string }) {
  return (
    <div style={{ position: 'relative', width: 246, height: 133, flexShrink: 0 }} aria-hidden>
      {Array.from({ length: TRAMOS }, (_, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: 5,
            width: 17,
            height: 41,
            borderRadius: 7,
            background: i < llenos ? '#E8A33F' : 'rgba(26,23,19,0.09)',
            transformOrigin: '50% 128px',
            transform: `translateX(-50%) rotate(${-85.5 + i * 9}deg)`,
          }}
        />
      ))}
      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 8, display: 'flex', justifyContent: 'center', fontSize: 38, lineHeight: 1 }}>
        {emoji}
      </span>
    </div>
  );
}

// El banner siempre dice algo; el color se reserva para lo excepcional.
function textoDelAviso(
  aviso: Aviso,
  datos: { noHabiles: number; vencidas: number; dias: number; proxima: string; faltan: number; solaEnLaSemana: boolean },
): { titulo: string; nota: string } {
  switch (aviso.clave) {
    case 'sin_cobertura':
      return {
        titulo: 'Faltan feriados por cargar',
        nota: 'Avísale a JFS antes de fiarte de estas fechas.',
      };
    case 'dias_no_habiles':
      return {
        titulo:
          datos.noHabiles === 1
            ? 'Esta semana hay un día no laborable'
            : `Esta semana hay ${datos.noHabiles} días no laborables`,
        nota: 'Tus fechas ya están corridas: la semana se estira sola.',
      };
    case 'vence_pronto':
      return {
        titulo: `${datos.faltan <= 0 ? 'Hoy' : 'Mañana'} vence ${datos.proxima.toLowerCase()}`,
        nota: datos.solaEnLaSemana
          ? 'Es lo único de esta semana que todavía no tiene marca.'
          : 'Es lo más próximo que tienes.',
      };
    case 'flujo_atrasado':
      return {
        titulo: `Un flujo lleva ${datos.dias} ${datos.dias === 1 ? 'día' : 'días'} esperando`,
        nota: 'Cuando lo retomes, avísanos desde su tarjeta.',
      };
    case 'recordatorio':
      return {
        titulo: datos.vencidas === 1 ? 'Quedó una sin marcar' : `Quedaron ${datos.vencidas} sin marcar`,
        nota: 'Ciérralas cuando puedas, aunque sea para decir que no pudiste.',
      };
    case 'avance':
      return { titulo: 'Vas al día', nota: 'Nada aprieta ahora mismo. Sigue con lo que viene.' };
  }
}

const ETAPA: Record<Etapa, { emoji: string; titulo: (mes: string) => string; nota: (mes: string) => string }> = {
  arranque: {
    emoji: '🌱',
    titulo: (mes) => `Arrancamos ${mes}`,
    nota: () => 'Todo el mes por delante. Vamos con calma.',
  },
  hielo: {
    emoji: '👏',
    titulo: () => 'Ya rompimos el hielo',
    nota: () => 'Las primeras siempre son las que más cuestan.',
  },
  ritmo: {
    emoji: '🚀',
    titulo: () => '¡Agarraste ritmo!',
    nota: (mes) => `A este paso ${mes} se te queda corto.`,
  },
  mitad: {
    emoji: '⚡',
    titulo: () => 'Más de la mitad, vas volando',
    nota: () => 'Lo difícil ya quedó atrás.',
  },
  casi: {
    emoji: '💪',
    titulo: () => 'Ya casi cierras el mes',
    nota: () => 'Falta poquito. Se ve la meta desde aquí.',
  },
  completo: {
    emoji: '🎉',
    titulo: (mes) => `¡${mes.charAt(0).toUpperCase()}${mes.slice(1)} completo!`,
    nota: () => 'Ni una sola quedó atrás.',
  },
};

const EMOJI_AVISO: Record<Aviso['clave'], string> = {
  sin_cobertura: '🗓️',
  dias_no_habiles: '🏖️',
  vence_pronto: '🔥',
  flujo_atrasado: '🐢',
  recordatorio: '✍️',
  avance: '🍃',
};

const PANEL = {
  background: '#FAF7F1',
  color: 'var(--tinta)',
  minHeight: 232,
  flex: '2 1 520px',
  minWidth: 0,
  borderRadius: 20,
  padding: '16px 23px 15px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
} as const;

const CHIP = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 13px',
  borderRadius: 999,
  background: 'rgba(26,23,19,0.06)',
  color: 'var(--gris)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
} as const;

const FLUJO = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 38,
  padding: '0 15px',
  borderRadius: 999,
  background: '#ffffff',
  color: 'var(--tinta)',
  fontSize: 13.5,
  fontWeight: 600,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
} as const;


const LOGRO = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  background: 'var(--suave)',
  borderRadius: 20,
  padding: '12px 18px',
  flex: '1 1 240px',
  minWidth: 0,
  boxSizing: 'border-box',
} as const;




// El color es el cuadrante; el emoji, la urgencia.
