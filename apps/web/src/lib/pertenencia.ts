import { leerPertenencia, opcionesDePertenencia, type Filtrable, type FiltroDelEquipo } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';

type Nombrado = { id: string; nombre: string };
export type Pertenencia = Pick<Filtrable, 'empresa' | 'sede'>;

// De que empresa y sede es cada quien (CEB-184), y las opciones para elegirlas.
// La seguridad por fila decide a quien alcanza `dePersona`: al administrador,
// todos; a un empleado, solo el. El supervisor resuelve a su gente con `deIds`,
// desde lo que ya le devuelve lo_de_mi_gente.
export async function pertenencias() {
  const supabase = await clienteDelServidor();
  const [{ data: empresas }, { data: sedes }, { data: gente }] = await Promise.all([
    supabase.from('empresa').select('id, nombre').order('nombre'),
    supabase.from('sede').select('id, nombre, empresa_id'),
    supabase.from('empleado').select('id, empresa_id, sede_id'),
  ]);

  const empresa = new Map(((empresas ?? []) as Nombrado[]).map((e) => [e.id, e]));
  const sede = new Map(((sedes ?? []) as Nombrado[]).map((s) => [s.id, { id: s.id, nombre: s.nombre }]));
  const deIds = (empresaId: string | null, sedeId: string | null): Pertenencia => ({
    empresa: (empresaId && empresa.get(empresaId)) || null,
    sede: (sedeId && sede.get(sedeId)) || null,
  });
  const ids = new Map((gente ?? []).map((e) => [e.id as string, [e.empresa_id, e.sede_id] as [string | null, string | null]]));

  return {
    opciones: opcionesDePertenencia(
      [...empresa.values()],
      (sedes ?? []).map((s) => ({ id: s.id as string, nombre: s.nombre as string, empresa: s.empresa_id as string })),
    ),
    deIds,
    dePersona: (id: string) => deIds(...(ids.get(id) ?? [null, null])),
  };
}

// "KIA · Valencia", "Toyota", o nada si todavia no tiene empresa.
export const enPalabras = ({ empresa, sede }: Pertenencia) =>
  empresa ? (sede ? `${empresa.nombre} · ${sede.nombre}` : empresa.nombre) : '';

// El valor del desplegable de una persona: empresa, o empresa/sede.
export const valorDe = (empresaId: string | null, sedeId: string | null) =>
  empresaId ? (sedeId ? `${empresaId}/${sedeId}` : empresaId) : '';

// El filtro viaja en la direccion: `en` es empresa o empresa/sede, `q` el texto.
export type ParametrosDelFiltro = { en?: string; q?: string };
export const filtroDe = ({ en, q }: ParametrosDelFiltro): FiltroDelEquipo => ({ ...leerPertenencia(en), texto: q });
