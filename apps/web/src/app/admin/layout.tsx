import { soloAdministrador } from '@/lib/administrador';
import { DEL_ADMINISTRADOR, Navegacion } from '../navegacion';

// El guardia vive aqui y no en cada pantalla: una ruta nueva bajo /admin nace
// protegida, en vez de depender de que alguien se acuerde de protegerla.
export default async function LayoutDelPanel({ children }: { children: React.ReactNode }) {
  await soloAdministrador();

  return (
    <>
      <Navegacion entradas={DEL_ADMINISTRADOR} />
      {children}
    </>
  );
}
