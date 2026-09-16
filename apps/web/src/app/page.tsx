import { Calendario, emojiDe, ocurrenciasEntre, proximas, urgenciaDe } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';

type FilaFuncion = {
  id: string;
  texto: string;
  importancia: number;
  periodicidad: string;
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

  // La seguridad por fila filtra por empleado: aqui no se filtra a mano.
  const [{ data: funciones }, { data: noHabiles }] = await Promise.all([
    supabase
      .from('funcion')
      .select(
        'id, texto, importancia, periodicidad, tipo_generado, tipo_corregido, dia_tope_generado, dia_tope_corregido, fecha_alta',
      )
      .eq('activa', true),
    supabase.from('dia_no_habil').select('desde, hasta'),
  ]);

  const calendario = Calendario.con(noHabiles ?? []);
  const hasta = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const plan = ((funciones ?? []) as FilaFuncion[])
    // ponytail: solo mensuales y solo entregables. Las otras cuatro
    // periodicidades son CEB-109; los flujos, CEB-110.
    .filter((f) => f.periodicidad === 'mensual')
    .filter((f) => (f.tipo_corregido ?? f.tipo_generado) === 'entregable')
    .flatMap((f) => {
      const diaTope = f.dia_tope_corregido ?? f.dia_tope_generado ?? undefined;
      return ocurrenciasEntre(
        { periodicidad: 'mensual', diaTope, fechaAlta: f.fecha_alta },
        calendario,
        hoy,
        hasta,
      ).map((o) => ({ ...o, texto: f.texto, importancia: f.importancia }));
    })
    .map((o) => ({ ...o, faltan: calendario.habilesEntre(hoy, o.vence) }));

  const lista = proximas(plan, CUANTAS);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 24, letterSpacing: '-0.02em', marginBottom: 4 }}>
        Lo que tenemos esta semana
      </h1>
      <p style={{ color: 'var(--gris)', fontSize: 14, marginTop: 0 }}>
        Lo más próximo primero. Si algo vence más adelante, igual aparece.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
        {lista.length === 0 && (
          <p style={{ color: 'var(--gris)', fontSize: 15 }}>
            Todavía no tienes funciones asignadas.
          </p>
        )}

        {lista.map((o) => (
          <article
            key={`${o.texto}-${o.periodo}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              /* ponytail: un solo color. El cuadrante que decide el color es CEB-109. */
              background: 'var(--hacer)',
              color: '#fff4f0',
              borderRadius: 20,
              padding: '12px 16px',
              minHeight: 66,
            }}
          >
            <span
              title={`Vence en ${o.faltan} días hábiles`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 46,
                height: 46,
                borderRadius: 999,
                background: 'rgba(255,244,240,0.18)',
                fontSize: 23,
                flexShrink: 0,
              }}
            >
              {emojiDe(o.faltan)}
            </span>

            <span style={{ flexGrow: 1, fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>
              {o.texto}
            </span>

            <span style={{ display: 'flex', gap: 6, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              <Numero etiqueta="IMP" valor={o.importancia} />
              <Numero etiqueta="URG" valor={urgenciaDe(o.faltan)} />
            </span>
          </article>
        ))}
      </div>
    </main>
  );
}

function Numero({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 5,
        padding: '5px 10px',
        borderRadius: 999,
        background: 'rgba(255,244,240,0.18)',
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', opacity: 0.72 }}>
        {etiqueta}
      </span>
      {valor}
    </span>
  );
}
