import {
  ocurrenciasEntre,
  patronesDelMes,
  rachaMasLarga,
  repartoDelMes,
  type TipoDeFuncion,
} from '@matriz/dominio';
import { diaTopeDe, panorama, sumarDias, tipoDe } from '@/lib/datos';

// Dos meses hacia atras: lo justo para ver si algo se repitio.
const VENTANA = 60;

export default async function Mes() {
  const { hoy, calendario, funciones, marcas, eventos } = await panorama();
  const desde = sumarDias(hoy, -VENTANA);

  const reparto = repartoDelMes(
    funciones.map((f) => ({
      funcionId: f.id,
      nombre: f.texto,
      tipo: (tipoDe(f) ?? 'entregable') as TipoDeFuncion,
      ponderacion: f.ponderacion,
    })),
  );

  const nombreDe = new Map(funciones.map((f) => [f.id, f.texto]));
  const marcaDe = new Map(marcas.map((m) => [`${m.funcion_id}|${m.periodo}`, m]));

  // Lo vencido sin marcar cuenta igual que un "no pude": callarse no sale barato.
  const historial = funciones
    .filter((f) => tipoDe(f) === 'entregable')
    .flatMap((f) =>
      ocurrenciasEntre(
        { periodicidad: f.periodicidad, diaTope: diaTopeDe(f), fechaAlta: f.fecha_alta },
        calendario,
        desde,
        hoy,
      )
        .filter((o) => o.vence < hoy)
        .map((o) => {
          const marca = marcaDe.get(`${f.id}|${o.periodo}`);
          return {
            funcionId: f.id,
            periodo: o.periodo,
            cumplida: marca?.resultado === 'hecho',
            razon: marca?.razon ?? undefined,
          };
        }),
    );

  const atrasos = eventos.filter(
    (e) => e.estado === 'atrasado' && e.en.slice(0, 10) >= desde && nombreDe.has(e.funcion_id),
  );
  const flujosDelMes = [...new Set(atrasos.map((e) => e.funcion_id))].map((funcionId) => ({
    funcionId,
    atrasosEnElMes: atrasos.filter((e) => e.funcion_id === funcionId).length,
    razones: atrasos.filter((e) => e.funcion_id === funcionId).map((e) => e.razon ?? '').filter(Boolean),
  }));

  const patrones = patronesDelMes(historial, flujosDelMes).filter((p) => nombreDe.has(p.funcionId));

  const racha = Math.max(
    0,
    ...[...new Set(historial.map((h) => h.funcionId))].map((id) =>
      rachaMasLarga(historial.filter((h) => h.funcionId === id)),
    ),
  );

  let acumulado = 0;
  const tramos = reparto.map((t) => {
    const inicio = acumulado;
    acumulado += t.porcentaje;
    return `${COLOR_TIPO[t.tipo]} ${inicio}% ${acumulado}%`;
  });

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 16px 32px' }}>
      <h1 style={{ fontSize: 22, letterSpacing: '-0.02em', margin: 0 }}>Tu mes, completo</h1>
      <p style={{ color: 'var(--gris)', fontSize: 14, margin: '4px 0 24px' }}>
        Todo lo que tienes asignado y cuánto pesa cada cosa dentro de tu cargo.
      </p>

      <div style={{ display: 'grid', gap: 28, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <section>
          <h2 style={SUBTITULO}>Cómo se reparte tu cargo</h2>

          {reparto.length === 0 ? (
            <p style={{ color: 'var(--gris)', fontSize: 15 }}>Todavía no tienes funciones asignadas.</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <div
                aria-hidden
                style={{
                  width: 172,
                  height: 172,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: `conic-gradient(${tramos.join(', ')})`,
                }}
              />
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220, flexGrow: 1 }}>
                {reparto.map((t) => (
                  <li key={t.funcionId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 4, background: COLOR_TIPO[t.tipo], flexShrink: 0 }} />
                    <span style={{ flexGrow: 1, minWidth: 0, fontSize: 15 }}>{t.nombre}</span>
                    <span style={{ fontSize: 12, color: 'var(--gris)', flexShrink: 0 }}>{ETIQUETA[t.tipo]}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {t.porcentaje}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section>
          <h2 style={SUBTITULO}>Cómo te fue</h2>

          {historial.length === 0 && patrones.length === 0 && (
            <p style={{ color: 'var(--gris)', fontSize: 15 }}>
              Es tu primer mes: todavía no hay con qué comparar.
            </p>
          )}

          {racha > 1 && (
            <p style={{ margin: '0 0 14px', fontSize: 16 }}>
              Tu mejor racha: <strong>{racha} períodos seguidos</strong> sin dejar caer nada.
            </p>
          )}

          {patrones.length > 0 && (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--gris)' }}>
                Esto se te repitió. No es un reclamo: es lo que JFS necesita saber para destrabarlo.
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {patrones.map((p) => (
                  <li key={p.funcionId} style={PATRON}>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{nombreDe.get(p.funcionId)}</span>
                    {p.razones.map((razon, i) => (
                      <span key={i} style={{ fontSize: 14, color: 'var(--gris)', lineHeight: 1.4 }}>
                        “{razon}”
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

const SUBTITULO = { fontSize: 17, margin: '0 0 14px', letterSpacing: '-0.01em' } as const;

const PATRON = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  background: 'var(--suave)',
  borderRadius: 16,
  padding: '12px 14px',
} as const;

// Areas y holgura solo se ven aqui: explican por que el dia no es solo entregables.
const COLOR_TIPO: Record<TipoDeFuncion, string> = {
  entregable: '#d9503a',
  flujo: '#e8ce7a',
  area: '#1b6e8c',
  holgura: '#cfc7bb',
};

const ETIQUETA: Record<TipoDeFuncion, string> = {
  entregable: 'entrega',
  flujo: 'al día',
  area: 'área',
  holgura: 'holgura',
};
