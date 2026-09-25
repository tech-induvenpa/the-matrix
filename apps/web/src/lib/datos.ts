import { Calendario } from '@matriz/dominio';
import type { Periodicidad, Resultado } from '@matriz/dominio';
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

export type FilaMarca = { id: string; funcion_id: string; periodo: string; resultado: string; razon: string | null };
export type FilaEvento = { id: string; funcion_id: string; estado: string; razon: string | null; en: string };

export type FilaImprevisto = {
  id: string;
  empleado_id: string;
  texto: string;
  pedido_en: string;
  vence: string;
  pedido_por_admin: string | null;
  pedido_por_otro: string | null;
  registrado_por: string;
  resultado: Resultado | null;
  razon: string | null;
  marcada_en: string | null;
  borrado_en: string | null;
};

export type FilaIntromision = { imprevisto_id: string; marca_id: string | null; evento_flujo_id: string | null };
export type QuienPide = { id: string; nombre: string };

export const COLUMNAS_DE_IMPREVISTO =
  'id, empleado_id, texto, pedido_en, vence, pedido_por_admin, pedido_por_otro, registrado_por, resultado, razon, marcada_en, borrado_en';

// Quien lo pidio, en palabras: un administrador por su nombre, o lo que se
// escribio en "otro".
export const quienPidio = (i: FilaImprevisto, quienes: readonly QuienPide[]) =>
  i.pedido_por_otro ?? quienes.find((q) => q.id === i.pedido_por_admin)?.nombre ?? 'un administrador';

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
    { data: imprevistos },
    { data: intromisiones },
    { data: quienesPiden },
  ] = await Promise.all([
      supabase
        .from('funcion')
        .select(
          'id, texto, importancia, periodicidad, tipo_generado, tipo_corregido, dia_tope_generado, dia_tope_corregido, fecha_alta, titularidad!inner(ponderacion)',
        )
        .eq('activa', true),
      supabase.from('dia_no_habil').select('desde, hasta'),
      supabase.from('marca').select('id, funcion_id, periodo, resultado, razon'),
      supabase.from('evento_flujo').select('id, funcion_id, estado, razon, en'),
      supabase.from('calendario').select('cargado_hasta').maybeSingle(),
      supabase.from('empleado').select('id, nombre_bloque, auth_user_id').maybeSingle(),
      // ponytail: dos meses para atras. Alcanza para el mes en curso, para lo
      // vencido que sigue abierto y para vincular a lo que vencio hace poco.
      supabase
        .from('imprevisto')
        .select(COLUMNAS_DE_IMPREVISTO)
        .is('borrado_en', null)
        .gte('pedido_en', sumarDias(hoyISO(), -62))
        .order('pedido_en'),
      supabase.from('intromision').select('imprevisto_id, marca_id, evento_flujo_id'),
      supabase.rpc('quienes_piden'),
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
    // La ponderacion vive en el vinculo con el titular: la misma funcion pesa
    // distinto en cargos distintos (ADR 0008). Aqui se aplana porque el dominio
    // no tiene por que saber de donde sale.
    funciones: (funciones ?? []).map((f) => {
      const { titularidad, ...resto } = f as Record<string, unknown> & {
        titularidad: { ponderacion: number }[];
      };
      return { ...resto, ponderacion: titularidad[0]?.ponderacion ?? 0 } as FilaFuncion;
    }),
    marcas: (marcas ?? []) as FilaMarca[],
    eventos: (eventos ?? []) as FilaEvento[],
    empleadoId: (empleado?.id as string | undefined) ?? '',
    yo: (empleado?.auth_user_id as string | undefined) ?? '',
    imprevistos: (imprevistos ?? []) as FilaImprevisto[],
    intromisiones: (intromisiones ?? []) as FilaIntromision[],
    quienesPiden: (quienesPiden ?? []) as QuienPide[],
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
