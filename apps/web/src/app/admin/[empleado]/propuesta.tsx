import { aplicarPonderacion } from '../acciones';
import { Accion } from '../../accion';
import { Enviar } from '../../boton';
import { Ir } from '../../ir';
import { Cuenta } from './cuenta';

type Fila = { id: string; texto: string; ponderacion: number; sinPublicar?: boolean };

// Cambiar el peso de una funcion mueve el de las demas y el de la cotidianidad,
// y esos numeros no los escribio nadie: los calcula el sistema con la misma
// regla que todo lo demas (ADR 0014). Antes de aplicarlos se enseñan, y
// alguien dice que si.
export function Propuesta({
  empleadoId,
  funciones,
  funcionId,
  nueva,
}: {
  empleadoId: string;
  funciones: Fila[];
  funcionId: string;
  nueva: number;
}) {
  const publicadas = funciones.filter((f) => !f.sinPublicar);
  if (!publicadas.some((f) => f.id === funcionId)) return null;

  return (
    <Cuenta titulo="Así quedaría el reparto" funciones={publicadas} cambio={{ cambia: { funcionId, ponderacion: nueva } }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Accion accion={aplicarPonderacion.bind(null, funcionId, empleadoId, nueva)}>
          <Enviar
            style={{ height: 36, padding: '0 18px', borderRadius: 999, background: 'var(--tinta)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            enviando="Aplicando…"
          >
            Sí, aplicarlo
          </Enviar>
        </Accion>

        <Ir href="?" style={{ fontSize: 13, color: 'var(--gris)' }}>
          dejarlo como está
        </Ir>
      </div>
    </Cuenta>
  );
}
