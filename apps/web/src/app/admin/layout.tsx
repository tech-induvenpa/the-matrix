import { gente, soloAdministrador } from '@/lib/administrador';
import { DEL_ADMINISTRADOR, Navegacion } from '../navegacion';
import { salir } from '../acciones';
import { cerrarMes, reabrirMes } from './acciones';
import { losMeses } from '@/lib/cierre-del-mes';
import { pertenencias } from '@/lib/pertenencia';

// El guardia vive aqui y no en cada pantalla: una ruta nueva bajo /admin nace
// protegida, en vez de depender de que alguien se acuerde de protegerla.
export default async function LayoutDelPanel({ children }: { children: React.ReactNode }) {
  await soloAdministrador();
  // Para elegir de quien es la descarga del mes, y los meses con su cierre.
  const [personas, meses, { opciones }] = await Promise.all([
    gente().then((g) => g.map(({ id, nombre }) => ({ id, nombre }))),
    losMeses(),
    pertenencias(),
  ]);
  // Las empresas, sin sus sedes: la nomina va por empresa (CEB-233).
  const empresas = opciones.filter((o) => !o.valor.includes('/')).map((o) => ({ id: o.valor, nombre: o.etiqueta }));

  return (
    <>
      <Navegacion
        entradas={DEL_ADMINISTRADOR}
        salida={salir}
        personas={personas}
        cierre={{ meses, empresas, reabrir: reabrirMes, cerrar: cerrarMes }}
      />
      {children}
    </>
  );
}
