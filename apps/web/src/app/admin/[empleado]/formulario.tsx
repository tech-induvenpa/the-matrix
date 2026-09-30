import { editarFuncion } from '../acciones';
import { Accion } from '../../accion';
import { Enviar } from '../../boton';

type Valores = {
  texto: string;
  periodicidad: string;
  importancia: number;
  tipo: string | null;
  diaTope: number | null;
  ponderacion: number;
};

const PERIODICIDADES = ['diaria', 'semanal', 'quincenal', 'mensual', 'trimestral'];

// El tipo sigue saliendo del criterio de ADR 0006, pero se elige de una vez y
// en palabras de todos los dias: cada opcion dice que significa. Los valores
// son los campos de `Respuestas`, asi el servidor lo resuelve igual que antes.
const TIPOS = [
  { valor: 'quedaTerminado', texto: 'Una entrega: se termina y se marca como hecha' },
  { valor: 'seAtiendeMientrasHaya', texto: 'Un flujo: se atiende mientras haya, nunca queda terminado' },
  // Sin holgura: la cotidianidad es el resto del cargo y no se crea (ADR 0014).
] as const;

const tipoElegido = (tipo: string | null | undefined) =>
  tipo === 'flujo' ? 'seAtiendeMientrasHaya' : tipo === 'area' ? 'nombraUnAmbito' : 'quedaTerminado';

// Cada campo aparece solo si aplica a lo elegido (ver globals.css): la entrega
// tiene periodicidad, importancia y dia tope si es mensual; el flujo, solo
// importancia; la holgura, nada. Los ocultos igual viajan, y el servidor
// ignora lo que no aplica.
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
      <div className="formulario-funcion" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={ETIQUETA}>
          Qué se hace
          <input
            name="texto"
            defaultValue={funcion?.texto ?? ''}
            placeholder="Cierre financiero Auto Bengala"
            required
            style={CAMPO}
          />
        </label>

        <label style={ETIQUETA}>
          Qué tipo de trabajo es
          {/* Nueva, arranca como entrega: es lo que casi siempre se crea. */}
          <select name="tipo" defaultValue={tipoElegido(funcion?.tipo)} style={CAMPO}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.texto}
              </option>
            ))}
            {/* Un area que ya existe no se vuelve holgura por editarle otra cosa. */}
            {funcion?.tipo === 'area' && <option value="nombraUnAmbito">Un área del cargo</option>}
          </select>
        </label>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label className="solo-entrega" style={ETIQUETA}>
            Cada cuánto se entrega
            <select name="periodicidad" defaultValue={funcion?.periodicidad ?? 'mensual'} style={CAMPO}>
              {PERIODICIDADES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="solo-entrega dia-tope" style={ETIQUETA}>
            Día del mes en que vence (opcional)
            <input name="diaTope" type="number" min={1} max={31} defaultValue={funcion?.diaTope ?? ''} style={CAMPO} />
          </label>

          <label className="con-importancia" style={ETIQUETA}>
            Importancia (0 a 9)
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
            Cuánto pesa en su cargo (%)
            <input
              name="ponderacion"
              type="number"
              min={0}
              max={100}
              required
              defaultValue={funcion?.ponderacion ?? ''}
              style={CAMPO}
            />
          </label>
        </div>

        <span style={{ fontSize: 12, color: 'var(--gris)' }}>
          Las demás funciones se reacomodan para que el cargo siga sumando 100. Lo ves antes de que cambie nada.
        </span>

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
