import {
  cuadranteDe,
  estadosVigentes,
  importanciaEfectiva,
  ocurrenciasEntre,
  ordenarPlan,
  pendientes,
  repartoDelMes,
  urgenciaDe,
  type Cuadrante,
  type TipoDeFuncion,
} from '@matriz/dominio';
import { diaTopeDe, panorama, tipoDe } from '@/lib/datos';
import { Tarjeta } from '../tarjeta';

// Todo el mes, en el mismo orden que la semana. Aqui si se ve la ponderacion,
// y aqui viven las areas y la holgura, que no entran a la pantalla de trabajo.
export default async function Mes() {
  const { hoy, calendario, funciones, marcas, eventos } = await panorama();

  const primero = `${hoy.slice(0, 7)}-01`;
  const ultimo = new Date(Date.UTC(+hoy.slice(0, 4), +hoy.slice(5, 7), 0)).toISOString().slice(0, 10);
  const mes = new Intl.DateTimeFormat('es', { month: 'long', timeZone: 'UTC' }).format(new Date(`${hoy}T00:00:00Z`));

  const cerradas = marcas.map((m) => ({ funcionId: m.funcion_id, periodo: m.periodo }));

  const ocurrencias = funciones
    .filter((f) => tipoDe(f) === 'entregable')
    .flatMap((f) =>
      ocurrenciasEntre(
        { periodicidad: f.periodicidad, diaTope: diaTopeDe(f), fechaAlta: f.fecha_alta },
        calendario,
        primero,
        ultimo,
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

  const todo = ordenarPlan(
    pendientes(ocurrencias, cerradas).map((o) => {
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

  const reparto = repartoDelMes(
    funciones.map((f) => ({
      funcionId: f.id,
      nombre: f.texto,
      tipo: (tipoDe(f) ?? 'entregable') as TipoDeFuncion,
      ponderacion: f.ponderacion,
    })),
  );

  // Cinco porciones con nombre y el resto junto: una leyenda de veinte lineas
  // no la lee nadie.
  const grandes = reparto.slice(0, 5);
  const resto = reparto.slice(5);
  const sumaDelResto = resto.reduce((t, r) => t + r.porcentaje, 0);

  let acumulado = 0;
  const tramos = [...grandes, { porcentaje: sumaDelResto }].map((r, i) => {
    const inicio = acumulado;
    acumulado += r.porcentaje;
    return `${COLOR_PORCION[i] ?? RESTO} ${inicio}% ${acumulado}%`;
  });

  return (
    <main style={{ maxWidth: 1440, margin: '0 auto', padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, textTransform: 'capitalize' }}>
            Todo tu {mes} 🗂️
          </h1>
          <p style={{ fontSize: 14, color: 'var(--gris)', margin: '5px 0 0' }}>
            El mismo orden de tu semana. Si cerraste algo que no te ha tocado, márcalo aquí mismo.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12.5, color: 'var(--gris)', flexWrap: 'wrap' }}>
          <span>🔥 hoy o mañana</span>
          <span>💣 2 a 3 días</span>
          <span>🧠 4 a 7 días</span>
          <span>🍃 8 o más</span>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 18, minWidth: 0 }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {ORDEN.map((cuadrante) => {
            const suyas = todo.filter((o) => o.cuadrante === cuadrante);
            if (!suyas.length) return null;

            return (
              <div key={cuadrante} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ fontSize: 15, lineHeight: 1 }}>{ROTULO[cuadrante].emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: ROTULO[cuadrante].color }}>
                    {ROTULO[cuadrante].texto}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {suyas.map((o) => (
                    <Tarjeta key={`${o.funcionId}|${o.periodo}`} o={o} hoy={hoy} />
                  ))}
                </div>
              </div>
            );
          })}

          {todo.length === 0 && (
            <p style={{ color: 'var(--gris)', fontSize: 14 }}>Este mes no te queda nada por cerrar.</p>
          )}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>🔁</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#8A7A3E' }}>Lo que llevas al día</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {flujos.map((f) => {
                const atrasado = f.vigente?.estado === 'atrasado';
                return (
                  <article key={f.id} style={{ display: 'flex', gap: 9, background: '#E8CE7A', color: '#2A2313', borderRadius: 12, padding: '8px 10px', boxSizing: 'border-box' }}>
                    {atrasado && <span style={{ width: 5, borderRadius: 999, background: '#D9503A', flexShrink: 0 }} />}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{atrasado ? '🐢' : '🍃'}</span>
                        <span style={{ flexGrow: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500 }}>{f.texto}</span>
                        <span style={{ fontSize: 12, whiteSpace: 'nowrap', fontWeight: atrasado ? 600 : 400, color: atrasado ? '#9E3322' : 'rgba(42,35,19,0.66)' }}>
                          {atrasado ? 'me atrasé' : 'al día'}
                        </span>
                        <span style={{ fontSize: 11.5, fontWeight: 600, opacity: 0.82, whiteSpace: 'nowrap' }}>
                          IMP {f.importancia}
                        </span>
                      </div>
                      {atrasado && f.vigente?.razon && (
                        <div style={{ fontSize: 12.5, paddingLeft: 26, color: 'rgba(42,35,19,0.86)' }}>
                          “{f.vigente.razon}”
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--suave)', borderRadius: 20, padding: '22px 24px' }}>
            <div>
              <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Dónde más cuentas 🥧</h2>
              <p style={{ fontSize: 12.5, color: 'var(--gris)', margin: '4px 0 0', maxWidth: 420 }}>
                El tamaño de cada porción es lo que esa función pesa dentro de tu cargo. Las grandes son por las que
                te buscan a ti.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <div
                aria-hidden
                style={{ width: 150, height: 150, borderRadius: 999, flexShrink: 0, background: `conic-gradient(${tramos.join(', ')})` }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexGrow: 1, minWidth: 220 }}>
                {grandes.map((r, i) => (
                  <div key={r.funcionId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: COLOR_PORCION[i], flexShrink: 0 }} />
                    <span style={{ flexGrow: 1, fontSize: 12.5, lineHeight: 1.3 }}>
                      {r.nombre}
                      {r.tipo !== 'entregable' && <span style={{ color: 'var(--gris)' }}> · {ETIQUETA[r.tipo]}</span>}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{r.porcentaje}%</span>
                  </div>
                ))}

                {resto.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gris)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: RESTO, flexShrink: 0 }} />
                    <span style={{ flexGrow: 1, fontSize: 12.5 }}>Las otras {resto.length}, entre todas</span>
                    <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{sumaDelResto}%</span>
                  </div>
                )}
              </div>
            </div>

            <p style={{ fontSize: 12, color: 'var(--gris)', margin: 0 }}>
              Aquí también vive lo que no entra a tu semana, como las áreas del cargo y la holgura para imprevistos.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

const ORDEN: Cuadrante[] = ['hacer', 'agendar', 'mantener'];

const ROTULO: Record<Cuadrante, { emoji: string; texto: string; color: string }> = {
  hacer: { emoji: '⚡', texto: 'Hacer ya', color: '#D9503A' },
  agendar: { emoji: '📆', texto: 'Ponle fecha', color: '#1B6E8C' },
  mantener: { emoji: '🔁', texto: 'Mantener al día', color: '#8A7A3E' },
};






// El orden del reparto: las cinco porciones con nombre y el resto en gris.
const COLOR_PORCION = ['#D9503A', '#E8A33F', '#1B6E8C', '#E8CE7A', '#E37B3C'];
const RESTO = '#DCD6CB';

const ETIQUETA: Record<TipoDeFuncion, string> = {
  entregable: 'entrega',
  flujo: 'flujo',
  area: 'área',
  holgura: 'holgura',
};


