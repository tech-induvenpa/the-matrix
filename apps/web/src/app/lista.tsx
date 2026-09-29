import type { Calendario } from '@matriz/dominio';
import { claveDeImprevisto, claveDeOcurrencia, tareaDeImprevisto } from '@/lib/comentarios';
import type { FilaImprevisto, QuienPide } from '@/lib/datos';
import type { TareaDeLaLista } from '@/lib/tareas';
import { TarjetaDeImprevisto } from './imprevistos';
import type { perfiles } from './perfil';
import { Tarjeta } from './tarjeta';

export const claveDeLaTarea = (t: TareaDeLaLista) =>
  t.tipo === 'ocurrencia' ? claveDeOcurrencia(t.tarea.funcionId, t.tarea.periodo) : claveDeImprevisto(t.tarea.id);

// Las tareas abiertas de otra persona, en una sola lista (CEB-198). Se abren y
// se comentan, pero no se marcan ni se delegan: eso es del titular. Del
// imprevisto se conserva lo que cada rol ya podia hacer, como borrar lo que
// registro.
export function ListaDeTareas({
  lista,
  hoy,
  calendario,
  quienesPiden,
  perfiles: { perfil, deOcurrencia },
  puedeBorrar,
}: {
  lista: readonly TareaDeLaLista[];
  hoy: string;
  calendario: Calendario;
  quienesPiden: readonly QuienPide[];
  perfiles: Awaited<ReturnType<typeof perfiles>>;
  puedeBorrar: (i: FilaImprevisto) => boolean;
}) {
  if (lista.length === 0) return <p style={{ color: 'var(--gris)', fontSize: 14, margin: 0 }}>Nada abierto.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {lista.map((t) =>
        t.tipo === 'ocurrencia' ? (
          <Tarjeta key={claveDeLaTarea(t)} o={t.tarea} hoy={hoy} soloLectura perfil={deOcurrencia(t.tarea)} />
        ) : (
          <TarjetaDeImprevisto
            key={claveDeLaTarea(t)}
            i={t.tarea}
            hoy={hoy}
            calendario={calendario}
            quienesPiden={quienesPiden}
            puedeMarcar={false}
            puedeBorrar={puedeBorrar(t.tarea)}
            perfil={perfil(claveDeLaTarea(t), tareaDeImprevisto(t.tarea, quienesPiden))}
          />
        ),
      )}
    </div>
  );
}
