import { clienteDelServidor } from '@/lib/supabase/servidor';
import { soloGeneral } from '@/lib/administrador';
import { darDeAltaAdministrador } from '../acciones';
import { Accion } from '../../accion';
import { Enviar } from '../../boton';

// Quien tiene poder sobre que (ADR 0019). Solo el administrador general la ve y
// da de alta a otros; la base lo exige tambien (INV-58).
export default async function LosAdministradores() {
  await soloGeneral();

  const supabase = await clienteDelServidor();
  const [{ data: administradores }, { data: empresas }] = await Promise.all([
    supabase.from('administrador').select('auth_user_id, nombre, correo, empresa_id').order('nombre'),
    supabase.from('empresa').select('id, nombre').order('nombre'),
  ]);
  const empresa = new Map((empresas ?? []).map((e) => [e.id as string, e.nombre as string]));

  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Los administradores 🔑</h1>
        <p style={{ fontSize: 14, color: 'var(--gris)', margin: '5px 0 0', maxWidth: 560 }}>
          El general ve y asigna a todo el grupo. El de empresa, solo a la gente de la suya. Un administrador no es un
          empleado: entra con su correo, sin funciones.
        </p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {(administradores ?? []).map((a) => (
          <div
            key={a.auth_user_id as string}
            style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--suave)', borderRadius: 12, padding: '9px 14px' }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>{a.nombre as string}</span>
            <span style={{ flexGrow: 1, minWidth: 0, fontSize: 13, color: 'var(--gris)' }}>{a.correo as string}</span>
            <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
              {a.empresa_id ? `De ${empresa.get(a.empresa_id as string) ?? 'una empresa'}` : 'General'}
            </span>
          </div>
        ))}
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>Un administrador nuevo</h2>
        <Accion accion={darDeAltaAdministrador}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={ETIQUETA}>
              Cómo se llama
              <input name="nombre" required style={CAMPO} />
            </label>
            <label style={{ ...ETIQUETA, flexGrow: 1, minWidth: 200 }}>
              Su correo
              <input name="correo" type="email" required style={CAMPO} />
            </label>
            <label style={ETIQUETA}>
              De qué es
              <select name="empresa" defaultValue="" style={CAMPO}>
                <option value="">Todo el grupo (general)</option>
                {(empresas ?? []).map((e) => (
                  <option key={e.id as string} value={e.id as string}>
                    Solo {e.nombre as string}
                  </option>
                ))}
              </select>
            </label>
            <Enviar style={BOTON} enviando="Dando de alta…">
              Dar de alta
            </Enviar>
          </div>
        </Accion>
        <p style={{ fontSize: 12, color: 'var(--gris)', margin: '10px 0 0' }}>
          Entra con un enlace a su correo, sin contraseña. Un correo no puede ser de un administrador y de un empleado.
        </p>
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
