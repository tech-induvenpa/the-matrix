import { cerradasDelMes } from '@matriz/dominio';
import { claveDeImprevisto, tareaDeImprevisto } from '@/lib/comentarios';
import type { QuienPide } from '@/lib/datos';
import type { DatosDelEquipo } from '@/lib/equipo';
import { Titulo, type perfiles } from './perfil';
import { Check, Equis } from './tarjeta';

// Las cerradas del mes en curso de una persona (CEB-220), plegadas debajo de
// sus tareas abiertas: para acordarse de lo que paso sin ir a la descarga.
// Cada una abre su historia, de solo lectura: despues de la marca no se
// comenta. Lo ven el administrador y el supervisor.
export function CerradasDelMes({
  datos,
  empleadoId,
  hoy,
  quienesPiden,
  perfiles: { perfil, deOcurrencia },
  abierta,
}: {
  datos: DatosDelEquipo;
  empleadoId: string;
  hoy: string;
  quienesPiden: readonly QuienPide[];
  perfiles: Awaited<ReturnType<typeof perfiles>>;
  // La tarea de la URL: si es una de estas, la seccion se abre sola.
  abierta?: string;
}) {
  const suyas = new Map(datos.funciones.filter((f) => f.empleado_id === empleadoId).map((f) => [f.id, f.texto]));
  const cerradas = cerradasDelMes(
    datos.marcas.filter((m) => suyas.has(m.funcion_id)).map((m) => ({ ...m, marcadaEn: m.marcada_en })),
    datos.imprevistos.filter((i) => i.empleado_id === empleadoId).map((i) => ({ ...i, marcadaEn: i.marcada_en, borradoEn: i.borrado_en })),
    hoy,
  ).map((c) => {
    if (c.tipo === 'ocurrencia') {
      const m = c.tarea;
      return {
        // Marcada, su vencimiento no se pinta en la historia.
        perfil: deOcurrencia({ funcionId: m.funcion_id, periodo: m.periodo, vence: '' }, m),
        texto: suyas.get(m.funcion_id) ?? '',
        pudo: m.resultado === 'hecho',
        dice: m.resultado === 'hecho' ? 'lista' : `no pude: ${m.razon ?? ''}`,
      };
    }
    const i = c.tarea;
    return {
      perfil: perfil(claveDeImprevisto(i.id), tareaDeImprevisto(i, quienesPiden)),
      texto: i.texto,
      // Un "hecho" devuelto no cumple (ADR 0012).
      pudo: i.resultado === 'hecho' && !i.devuelto_en,
      dice: i.devuelto_en
        ? `devuelto: ${i.devuelto_razon ?? ''}`
        : i.resultado === 'hecho'
          ? 'lista'
          : `${i.resultado === 'no_lo_tome' ? 'no lo tomé' : 'no pude'}: ${i.razon ?? ''}`,
    };
  });

  return (
    <details className="nuevo-item" open={cerradas.some((c) => c.perfil.clave === abierta)} style={{ marginTop: 6 }}>
      <summary>Cerradas del mes ({cerradas.length})</summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 8 }}>
        {cerradas.length === 0 && <p style={{ color: 'var(--gris)', fontSize: 14, margin: 0 }}>Nada cerrado este mes todavía.</p>}
        {cerradas.map((c) => (
          <div key={c.perfil.clave} style={{ ...CERRADA, flexWrap: c.perfil.contenido ? 'wrap' : undefined }}>
            <span style={{ color: c.pudo ? '#5E9E62' : '#C97B72', flexShrink: 0, display: 'flex' }}>{c.pudo ? <Check /> : <Equis />}</span>
            <span style={{ flexGrow: 1, minWidth: 0, fontSize: 14 }}>
              <Titulo perfil={c.perfil}>{c.texto}</Titulo>
            </span>
            <span style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>{c.dice}</span>
            {c.perfil.contenido}
          </div>
        ))}
      </div>
    </details>
  );
}

// Gris, como lo ya resuelto en la semana (YaResueltas en tarjeta.tsx).
const CERRADA = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: 'var(--suave)',
  color: 'var(--gris)',
  minHeight: 40,
  borderRadius: 13,
  padding: '0 12px',
  boxSizing: 'border-box',
} as const;
