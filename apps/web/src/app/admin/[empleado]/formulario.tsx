import { editarFuncion } from '../acciones';
import { Accion } from '../../accion';
import { Enviar } from '../../boton';

type Valores = {
  texto: string;
  periodicidad: string;
  importancia: number;
  tipo: string | null;
  diaTope: number | null;
};

const PERIODICIDADES = ['diaria', 'semanal', 'quincenal', 'mensual', 'trimestral'];

// El tipo no se elige de una lista de sustantivos: se responden tres preguntas
// sobre el trabajo y el dominio decide (ADR 0006). Asi el criterio se lee cada
// vez que alguien crea una funcion, en vez de vivir en la cabeza de quien la
// creo la primera vez.
const PREGUNTAS = [
  { campo: 'quedaTerminado', texto: '¿Se entrega algo concreto y queda terminado?', si: ['entregable'] },
  { campo: 'seAtiendeMientrasHaya', texto: '¿Se atiende mientras haya, sin que exista un “ya está”?', si: ['flujo'] },
  { campo: 'nombraUnAmbito', texto: '¿Nombra un ámbito del cargo más que un acto?', si: ['area'] },
] as const;

export function Formulario({
  funcionId,
  empleadoId,
  funcion,
  accion,
}: {
  funcionId?: string;
  empleadoId: string;
  funcion?: Valores;
  accion?: (formulario: FormData) => Promise<{ mensaje: string; celebra: boolean }>;
}) {
  const guardar = accion ?? editarFuncion.bind(null, funcionId!, empleadoId);

  return (
    <Accion accion={guardar}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          name="texto"
          defaultValue={funcion?.texto ?? ''}
          placeholder="Cierre financiero Auto Bengala"
          required
          style={CAMPO}
        />

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={ETIQUETA}>
            Cada cuánto
            <select name="periodicidad" defaultValue={funcion?.periodicidad ?? 'mensual'} style={CAMPO}>
              {PERIODICIDADES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label style={ETIQUETA}>
            Importancia (0–9)
            <input
              name="importancia"
              type="number"
              min={0}
              max={9}
              defaultValue={funcion?.importancia ?? 5}
              style={CAMPO}
            />
          </label>

          <label style={ETIQUETA}>
            Día tope, si lo tiene
            <input name="diaTope" type="number" min={1} max={31} defaultValue={funcion?.diaTope ?? ''} style={CAMPO} />
          </label>
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PREGUNTAS.map((p) => (
            <label key={p.campo} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
              <input
                type="checkbox"
                name={p.campo}
                value="si"
                defaultChecked={funcion?.tipo ? p.si.includes(funcion.tipo as never) : false}
              />
              {p.texto}
            </label>
          ))}
          <span style={{ fontSize: 12, color: 'var(--gris)' }}>
            Sin marcar ninguna, es holgura: la parte del cargo reservada a lo no planificado.
          </span>
        </fieldset>

        <Enviar
          style={{
            alignSelf: 'flex-start',
            padding: '9px 18px',
            borderRadius: 999,
            background: 'var(--tinta)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          enviando="Guardando…"
        >
          {funcionId ? 'Guardar' : 'Crear'}
        </Enviar>
      </div>
    </Accion>
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

const ETIQUETA = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 12,
  color: 'var(--gris)',
} as const;
