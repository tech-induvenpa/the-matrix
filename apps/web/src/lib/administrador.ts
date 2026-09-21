import { clienteDelServidor } from '@/lib/supabase/servidor';
import { notFound } from 'next/navigation';

// Quien asigna. Lo pregunta la base, no la aplicacion: la sesion no lleva el
// rol encima, asi que no hay nada que falsificar desde el navegador.
export async function esAdministrador(): Promise<boolean> {
  const supabase = await clienteDelServidor();
  const { data } = await supabase.rpc('es_administrador');
  return data === true;
}

// Un empleado que llega a una ruta de administracion recibe un 404, no un 403:
// decirle "no tienes permiso" seria contarle que la pantalla existe.
export async function soloAdministrador(): Promise<void> {
  if (!(await esAdministrador())) notFound();
}

export type EmpleadoDelPanel = { id: string; nombre: string; correo: string; funciones: number };

// La seguridad por fila es la que decide que esto traiga a los nueve y no a
// uno: la consulta es la misma que haria un empleado.
export async function gente(): Promise<EmpleadoDelPanel[]> {
  const supabase = await clienteDelServidor();

  const { data } = await supabase
    .from('empleado')
    .select('id, nombre_bloque, correo, funcion(count)')
    .order('nombre_bloque');

  return (data ?? []).map((e) => ({
    id: e.id as string,
    nombre: e.nombre_bloque as string,
    correo: e.correo as string,
    funciones: (e.funcion as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
}
