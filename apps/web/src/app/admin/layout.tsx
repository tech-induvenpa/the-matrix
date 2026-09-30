import { gente, soloAdministrador } from '@/lib/administrador';
import { DEL_ADMINISTRADOR, Navegacion } from '../navegacion';
import { salir } from '../acciones';
import { cerrarMes, reabrirMes } from './acciones';
import { losMeses } from '@/lib/cierre-del-mes';

// El guardia vive aqui y no en cada pantalla: una ruta nueva bajo /admin nace
// protegida, en vez de depender de que alguien se acuerde de protegerla.
export default async function LayoutDelPanel({ children }: { children: React.ReactNode }) {
  await soloAdministrador();
  // Para elegir de quien es la descarga del mes, y los meses con su cierre.
  const [personas, meses] = await Promise.all([gente().then((g) => g.map(({ id, nombre }) => ({ id, nombre }))), losMeses()]);

  return (
    <>
      <Navegacion
        entradas={DEL_ADMINISTRADOR}
        salida={salir}
        personas={personas}
        cierre={{ meses, reabrir: reabrirMes, cerrar: cerrarMes }}
      />
      {children}
    </>
  );
}
