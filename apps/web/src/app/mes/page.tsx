import {
  cuadranteDe,
  estadosVigentes,
  importanciaEfectiva,
  ocurrenciasEntre,
  ordenarPlan,
  pendientes,
  bonoDelMes,
  enDolares,
  repartoDelMes,
  urgenciaDe,
  type Cuadrante,
  type TipoDeFuncion,
} from '@matriz/dominio';
import { diaTopeDe, dolares, panorama, tipoDe } from '@/lib/datos';
import { Tarjeta, YaResueltas } from '../tarjeta';
import { esAdministrador } from '@/lib/administrador';
import { redirect } from 'next/navigation';
import { DEL_EMPLEADO, DEL_SUPERVISOR, Navegacion } from '../navegacion';
import { salir } from '../acciones';
import { ImprevistosDelMes } from '../imprevistos';
import { perfiles } from '../perfil';
import { claveDeImprevisto, tareaDeImprevisto } from '@/lib/comentarios';
import { nominaDelMes } from '@/lib/nomina';
import { EstadoDeCuenta, nombreDelMes, ultimosMeses } from '../nomina';

// Todo el mes, en el mismo orden que la semana. Aqui si se ve la ponderacion,
// y aqui viven las areas y la cotidianidad, que no entran a la pantalla de trabajo.
export default async function Mes({ searchParams }: { searchParams: Promise<{ tarea?: string; mes?: string }> }) {
  if (await esAdministrador()) redirect('/admin');

  const [
    { hoy, calendario, funciones, marcas, eventos, imprevistos, intromisiones, quienesPiden, bonos, gente, empleadoId },
    { perfil, deOcurrencia },
    { mes: pedido = '' },
  ] = await Promise.all([panorama(), searchParams.then((p) => perfiles(p.tarea)), searchParams]);

  // Su nomina (ADR 0016): la del mes en curso, provisional, o la de un mes
  // anterior, fija. Un mes futuro todavia no tiene nada.
  const mesDeLaNomina = /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) && pedido <= hoy.slice(0, 7) ? pedido : hoy.slice(0, 7);
  const suNomina = await nominaDelMes(empleadoId, mesDeLaNomina);

  // Que previsto desplazo cada imprevisto, en palabras: el texto de la funcion
  // cuyo "no pude" o atraso se le vinculo.
  const textoDe = new Map(funciones.map((f) => [f.id, f.texto]));
  const funcionDeMarca = new Map(marcas.map((m) => [m.id, m.funcion_id]));
  const funcionDeEvento = new Map(eventos.map((e) => [e.id, e.funcion_id]));
  const explico = new Map<string, string[]>();
  for (const v of intromisiones) {
    const funcion = v.marca_id ? funcionDeMarca.get(v.marca_id) : funcionDeEvento.get(v.evento_flujo_id!);
    const texto = funcion && textoDe.get(funcion);
    if (texto) explico.set(v.imprevisto_id, [...(explico.get(v.imprevisto_id) ?? []), texto]);
  }

  const primero = `${hoy.slice(0, 7)}-01`;
  const ultimo = new Date(Date.UTC(+hoy.slice(0, 4), +hoy.slice(5, 7), 0)).toISOString().slice(0, 10);
  const mes = new Intl.DateTimeFormat('es', { month: 'long', timeZone: 'UTC' }).format(new Date(`${hoy}T00:00:00Z`));

  const cerradas = marcas.map((m) => ({ funcionId: m.funcion_id, periodo: m.periodo }));
  const marcaDe = new Map(marcas.map((m) => [`${m.funcion_id}|${m.periodo}`, m]));
  const perfilDeOcurrencia = (o: { funcionId: string; periodo: string; vence: string }) =>
    deOcurrencia(o, marcaDe.get(`${o.funcionId}|${o.periodo}`));

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
    .map((o) => ({ ...o, faltan: calendario.habilesHasta(hoy, o.vence) }));

  const abiertas = new Set(pendientes(ocurrencias, cerradas).map((o) => `${o.funcionId}|${o.periodo}`));
  const yaResueltas = ocurrencias.filter((o) => !abiertas.has(`${o.funcionId}|${o.periodo}`));

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
  // Cuanto de su bono vale cada porcion (ADR 0010). Con el bono de este mes,
  // aunque ya este cargado el del que viene. Sin bono, solo el porcentaje.
  const bono = bonoDelMes(bonos, hoy.slice(0, 7));
  const enDinero = new Map(bono === null ? [] : enDolares(reparto, bono).map((r) => [r.funcionId, r.dolares]));

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
    <>
      <Navegacion entradas={gente.length > 0 ? DEL_SUPERVISOR : DEL_EMPLEADO} salida={salir} />
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
          <span>💣 2 a 4 días</span>
          <span>🧠 5 a 9 días</span>
          <span>🍃 10 o más</span>
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
                    <Tarjeta key={`${o.funcionId}|${o.periodo}`} o={o} hoy={hoy} perfil={perfilDeOcurrencia(o)} />
                  ))}
                </div>
              </div>
            );
          })}

          {yaResueltas.length > 0 && <YaResueltas cerradas={yaResueltas} marcaDe={marcaDe} perfilDe={perfilDeOcurrencia} />}

          {todo.length === 0 && yaResueltas.length === 0 && (
            <p style={{ color: 'var(--gris)', fontSize: 14 }}>Este mes no tienes nada asignado.</p>
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
            {/* Con bono, su nomina reemplaza a "Donde mas cuentas" (CEB-230), y
                lo que vale cada funcion sigue abajo: de ahi sale cada descuento. */}
            {bonos.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                    Tu nómina de {nombreDelMes(mesDeLaNomina)} 🧾
                  </h2>
                  <form method="get" style={{ display: 'flex', gap: 6 }}>
                    <select name="mes" defaultValue={mesDeLaNomina} aria-label="Qué mes" style={SELECTOR}>
                      {ultimosMeses(hoy).map((m) => (
                        <option key={m.valor} value={m.valor}>
                          {m.texto}
                        </option>
                      ))}
                    </select>
                    <button type="submit" style={VER}>
                      Ver
                    </button>
                  </form>
                </div>
                {suNomina.nomina ? (
                  <EstadoDeCuenta datos={{ ...suNomina, nomina: suNomina.nomina }} />
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--gris)', margin: 0 }}>
                    En {nombreDelMes(mesDeLaNomina)} no tenías bono, así que no hay nómina.
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: bonos.length > 0 ? 15 : 19, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                  {bonos.length > 0 ? 'Lo que vale cada parte' : 'Dónde más cuentas 🥧'}
                </h2>
                <p style={{ fontSize: 12.5, color: 'var(--gris)', margin: '4px 0 0', maxWidth: 420 }}>
                  El tamaño de cada porción es lo que esa función pesa dentro de tu cargo. Las grandes son por las que
                  te buscan a ti.
                </p>
              </div>
              {/* El bono de este mes, que es lo que se reparte abajo (ADR 0010). */}
              {bono !== null && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12.5, color: 'var(--gris)' }}>Tu bono 💵</div>
                  <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>{dolares(bono)}</div>
                </div>
              )}
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
                    <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {r.porcentaje}%
                      {enDinero.has(r.funcionId) && (
                        <span style={{ fontWeight: 500, color: 'var(--gris)' }}> · {dolares(enDinero.get(r.funcionId)!)}</span>
                      )}
                    </span>
                  </div>
                ))}

                {resto.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gris)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: RESTO, flexShrink: 0 }} />
                    <span style={{ flexGrow: 1, fontSize: 12.5 }}>Las otras {resto.length}, entre todas</span>
                    <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {sumaDelResto}%
                      {bono !== null && (
                        <span style={{ fontWeight: 500 }}>
                          {' '}· {dolares(Math.round(resto.reduce((t, r) => t + (enDinero.get(r.funcionId) ?? 0), 0) * 100) / 100)}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <p style={{ fontSize: 12, color: 'var(--gris)', margin: 0 }}>
              Aquí también vive lo que no entra a tu semana: las áreas del cargo y tu cotidianidad, lo que te piden fuera de tus funciones.
            </p>
          </div>
        </section>
      </div>

      <ImprevistosDelMes
        imprevistos={imprevistos.filter((i) => i.pedido_en.slice(0, 7) === hoy.slice(0, 7) || !i.resultado)}
        explico={explico}
        quienesPiden={quienesPiden}
        hoy={hoy}
        calendario={calendario}
        perfilDe={(i) => perfil(claveDeImprevisto(i.id), tareaDeImprevisto(i, quienesPiden))}
      />
    </main>
    </>
  );
}

const ORDEN: Cuadrante[] = ['hacer', 'agendar', 'mantener'];

const SELECTOR = {
  height: 32,
  borderRadius: 999,
  border: '1px solid rgba(26,23,19,0.12)',
  padding: '0 12px',
  fontSize: 13,
  color: 'var(--tinta)',
  background: '#ffffff',
} as const;

const VER = {
  height: 32,
  padding: '0 14px',
  borderRadius: 999,
  border: 0,
  background: 'var(--tinta)',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
} as const;

const ROTULO: Record<Cuadrante, { emoji: string; texto: string; color: string }> = {
  hacer: { emoji: '⚡', texto: 'Hacer ya', color: '#D9503A' },
  agendar: { emoji: '📆', texto: 'Ponle fecha', color: '#1B6E8C' },
  mantener: { emoji: '🔁', texto: 'Mantener al día', color: '#8A7A3E' },
};






// El orden del reparto: las cinco porciones con nombre y el resto en gris.
const COLOR_PORCION = ['#D9503A', '#E8A33F', '#1B6E8C', '#E8CE7A', '#E37B3C'];
const RESTO = '#DCD6CB';

const ETIQUETA: Record<TipoDeFuncion | 'cotidianidad', string> = {
  entregable: 'entrega',
  flujo: 'flujo',
  area: 'área',
  cotidianidad: 'lo que te piden',
};


