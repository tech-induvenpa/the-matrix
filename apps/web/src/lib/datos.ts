import { Calendario } from '@matriz/dominio';
import type { Periodicidad } from '@matriz/dominio';
import { clienteDelServidor } from '@/lib/supabase/servidor';

export type FilaFuncion = {
  id: string;
  texto: string;
  importancia: number;
  ponderacion: number;
  periodicidad: Periodicidad;
  tipo_generado: string | null;
  tipo_corregido: string | null;
  dia_tope_generado: number | null;
  dia_tope_corregido: number | null;
  fecha_alta: string;
};

export type FilaMarca = { funcion_id: string; periodo: string; resultado: string; razon: string | null };
export type FilaEvento = { funcion_id: string; estado: string; razon: string | null; en: string };

// Lo que el agente propuso solo vale mientras nadie lo corrija.
export const tipoDe = (f: FilaFuncion) => f.tipo_corregido ?? f.tipo_generado;
export const diaTopeDe = (f: FilaFuncion) => f.dia_tope_corregido ?? f.dia_tope_generado ?? undefined;

export const hoyISO = () => new Date().toISOString().slice(0, 10);

export const sumarDias = (fecha: string, dias: number) =>
  new Date(Date.parse(`${fecha}T00:00:00Z`) + dias * 864e5).toISOString().slice(0, 10);

// La semana natural, de lunes a domingo: es la que el empleado tiene en la cabeza.
export const lunesDe = (fecha: string) => {
  const d = new Date(`${fecha}T00:00:00Z`);
  return sumarDias(fecha, -((d.getUTCDay() + 6) % 7));
};

export const esFinDeSemana = (fecha: string) => {
  const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return dia === 0 || dia === 6;
};

// Una sola lectura para toda la pagina. La seguridad por fila decide que
// funciones son de quien entra: aqui no se filtra por empleado a mano.
export async function panorama() {
  const supabase = await clienteDelServidor();

  const [
    { data: funciones },
    { data: noHabiles },
    { data: marcas },
    { data: eventos },
    { data: calendario },
    { data: empleado },
  ] = await Promise.all([
      supabase
        .from('funcion')
        .select(
          'id, texto, importancia, ponderacion, periodicidad, tipo_generado, tipo_corregido, dia_tope_generado, dia_tope_corregido, fecha_alta',
        )
        .eq('activa', true),
      supabase.from('dia_no_habil').select('desde, hasta'),
      supabase.from('marca').select('funcion_id, periodo, resultado, razon'),
      supabase.from('evento_flujo').select('funcion_id, estado, razon, en'),
      supabase.from('calendario').select('cargado_hasta').maybeSingle(),
      supabase.from('empleado').select('nombre_bloque').maybeSingle(),
    ]);

  // La seguridad por fila hace que solo llegue el suyo.
  const nombreBloque = (empleado?.nombre_bloque as string | undefined) ?? '';

  return {
    hoy: hoyISO(),
    // "DOUGLENIS" es como esta en el documento; saludar asi es gritar.
    nombre: nombreBloque.split(' ')[0]?.toLowerCase().replace(/^./, (l) => l.toUpperCase()) ?? '',
    calendario: Calendario.con(noHabiles ?? []),
    // Sin fila de cobertura, el calendario no cubre nada: fallar cerrado.
    cargadoHasta: (calendario?.cargado_hasta as string | undefined) ?? hoyISO(),
    funciones: (funciones ?? []) as FilaFuncion[],
    marcas: (marcas ?? []) as FilaMarca[],
    eventos: (eventos ?? []) as FilaEvento[],
  };
}

const mesDe = (fecha: string) =>
  new Intl.DateTimeFormat('es', { month: 'long', timeZone: 'UTC' }).format(new Date(`${fecha}T00:00:00Z`));

const mesCortoDe = (fecha: string) =>
  new Intl.DateTimeFormat('es', { month: 'short', timeZone: 'UTC' })
    .format(new Date(`${fecha}T00:00:00Z`))
    .replace('.', '');

// Sin esto, una tarjeta de octubre aparece junto a un mes dado por cerrado y
// parece que el sistema se contradice.
export function comoVence(vence: string, hoy: string): string {
  if (vence === hoy) return 'vence hoy';
  if (vence === sumarDias(hoy, 1)) return 'vence mañana';

  const dia = +vence.slice(8, 10);
  return vence < hoy ? `venció el ${dia} de ${mesDe(vence)}` : `vence el ${dia} de ${mesDe(vence)}`;
}

// La version corta, para las filas del mes.
export const fechaCorta = (fecha: string) => `${+fecha.slice(8, 10)} ${mesCortoDe(fecha)}`;
