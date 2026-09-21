import { cargoDe, soloAdministrador } from '@/lib/administrador';
import { archivarFuncion, crearFuncion } from '../acciones';
import { Accion } from '../../accion';
import { Enviar } from '../../boton';
import Link from 'next/link';
import { Formulario } from './formulario';

// El cargo de una persona: sus funciones y lo que pesa cada una. Aqui se crean
// y se editan; repartir el cien es la otra pantalla (CEB-132).
export default async function Cargo({ params }: { params: Promise<{ empleado: string }> }) {
  await soloAdministrador();
  const { empleado } = await params;
  const cargo = await cargoDe(empleado);

  if (!cargo) return null;

  const suma = cargo.funciones.reduce((t, f) => t + f.ponderacion, 0);

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header>
        <Link href="/admin" style={{ fontSize: 13, color: 'var(--gris)', textDecoration: 'none' }}>
          ← Tu gente
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: '6px 0 0' }}>{cargo.nombre}</h1>
        <p style={{ fontSize: 14, color: 'var(--gris)', margin: '5px 0 0' }}>
          {cargo.funciones.length} funciones · reparte {suma} de 100
          {suma !== 100 && <strong style={{ color: '#D9503A' }}> · le faltan {100 - suma}</strong>}
        </p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cargo.funciones.map((f) => (
          <details key={f.id} style={{ background: 'var(--suave)', borderRadius: 14, padding: '12px 16px' }}>
            <summary style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', listStyle: 'none' }}>
              <span style={{ flexGrow: 1, minWidth: 0, fontSize: 15, fontWeight: 600 }}>{f.texto}</span>
              <span style={{ fontSize: 12.5, color: 'var(--gris)' }}>
                {f.tipo ?? 'sin tipo'} · {f.periodicidad}
                {f.diaTope ? ` · día ${f.diaTope}` : ''}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{f.ponderacion}%</span>
            </summary>

            <div style={{ paddingTop: 14 }}>
              <Formulario funcionId={f.id} empleadoId={empleado} funcion={f} />

              <Accion accion={archivarFuncion.bind(null, f.id, empleado)}>
                <Enviar
                  style={{ marginTop: 10, fontSize: 12.5, color: 'var(--gris)', background: 'none', cursor: 'pointer' }}
                  enviando="Archivando…"
                >
                  Archivar esta función
                </Enviar>
              </Accion>
            </div>
          </details>
        ))}

        {cargo.funciones.length === 0 && (
          <p style={{ color: 'var(--gris)', fontSize: 14 }}>Todavía no tiene ninguna función.</p>
        )}
      </section>

      <section style={{ borderTop: '1px solid rgba(26,23,19,0.10)', paddingTop: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>Una función nueva</h2>
        <Formulario empleadoId={empleado} accion={crearFuncion.bind(null, empleado)} />
      </section>
    </main>
  );
}
