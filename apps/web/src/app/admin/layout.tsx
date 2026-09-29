import { gente, soloAdministrador } from '@/lib/administrador';
import { DEL_ADMINISTRADOR, Navegacion } from '../navegacion';
import { salir } from '../acciones';

// El guardia vive aqui y no en cada pantalla: una ruta nueva bajo /admin nace
// protegida, en vez de depender de que alguien se acuerde de protegerla.
export default async function LayoutDelPanel({ children }: { children: React.ReactNode }) {
  await soloAdministrador();
  // Para elegir de quien es la descarga del mes.
  const personas = (await gente()).map(({ id, nombre }) => ({ id, nombre }));

  return (
    <>
      <Navegacion entradas={DEL_ADMINISTRADOR} salida={salir} personas={personas} />
      {children}
    </>
  );
}
