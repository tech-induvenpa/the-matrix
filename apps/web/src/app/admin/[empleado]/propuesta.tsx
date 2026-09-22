import { reescalarA } from '@matriz/dominio';
import { aplicarPonderacion } from '../acciones';
import { Accion } from '../../accion';
import { Enviar } from '../../boton';
import { Ir } from '../../ir';

type Fila = { id: string; texto: string; ponderacion: number };

// Cambiar el peso de una funcion mueve los de las demas, y esos numeros no los
// escribio nadie: los calculo el sistema. Antes de aplicarlos se enseñan, y
// alguien dice que si.
//
// Los pesos se calculan aqui y se vuelven a calcular al aplicar, con la misma
// funcion del dominio: lo que se aplica es lo que se enseño, y no hace falta
// que los numeros viajen en un formulario donde se podrian tocar.
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
  const laQueCambia = funciones.find((f) => f.id === funcionId);
  if (!laQueCambia) return null;

  const resto = funciones
    .filter((f) => f.id !== funcionId)
    .map((f) => ({ funcionId: f.id, ponderacion: f.ponderacion }));

  const despues = new Map(reescalarA(resto, 100 - nueva).map((p) => [p.funcionId, p.ponderacion]));
  despues.set(funcionId, nueva);

  const total = [...despues.values()].reduce((t, p) => t + p, 0);

  return (
    <div style={{ background: '#FAF3E2', borderLeft: '4px solid #E8A33F', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Así quedaría el reparto</div>
        <div style={{ fontSize: 13.5, marginTop: 3, lineHeight: 1.45 }}>
          Cambiar <strong>{laQueCambia.texto}</strong> de {laQueCambia.ponderacion}% a {nueva}% mueve el peso de las
          demás, para que siga sumando 100. Conservan la proporción que tenían entre ellas.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {funciones.map((f) => {
          const ahora = despues.get(f.id) ?? f.ponderacion;
          const cambia = ahora !== f.ponderacion;
          const esLaSuya = f.id === funcionId;

          return (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#fff',
                borderRadius: 10,
                padding: '8px 12px',
                fontWeight: esLaSuya ? 600 : 400,
              }}
            >
              <span style={{ flexGrow: 1, minWidth: 0, fontSize: 13.5 }}>{f.texto}</span>
              <span style={{ fontSize: 13, color: 'var(--gris)', fontVariantNumeric: 'tabular-nums' }}>
                {f.ponderacion}%
              </span>
              <span style={{ fontSize: 13, color: 'var(--gris)' }}>→</span>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 42,
                  textAlign: 'right',
                  color: cambia ? '#8A5A1F' : 'var(--gris)',
                }}
              >
                {ahora}%
              </span>
            </div>
          );
        })}
      </div>

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

        <span style={{ fontSize: 12, color: 'var(--gris)', marginLeft: 'auto' }}>suma {total}</span>
      </div>
    </div>
  );
}
