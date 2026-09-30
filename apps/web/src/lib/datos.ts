import { Calendario } from '@matriz/dominio';
import type { CambioDeBono, Periodicidad, Resultado } from '@matriz/dominio';
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

export type FilaMarca = { id: string; funcion_id: string; periodo: string; resultado: 'hecho' | 'no_pude'; razon: string | null; marcada_en: string };
export type FilaEvento = { id: string; funcion_id: string; estado: string; razon: string | null; en: string };

export type FilaImprevisto = {
  id: string;
  empleado_id: string;
  texto: string;
  pedido_en: string;
  vence: string;
  // Un administrador o un supervisor; si no, lo dice `pedido_por_otro`.
  pedido_por: string | null;
  pedido_por_otro: string | null;
  registrado_por: string;
  resultado: Resultado | null;
  razon: string | null;
  marcada_en: string | null;
  borrado_en: string | null;
  // Si es una delegacion (ADR 0012): la ocurrencia del supervisor que cumple.
  delega_funcion: string | null;
  delega_periodo: string | null;
  devuelto_en: string | null;
  devuelto_razon: string | null;
};

export type FilaIntromision = { imprevisto_id: string; marca_id: string | null; evento_flujo_id: string | null };
export type QuienPide = { id: string; nombre: string };

// El bono en la forma que lo entiende el dominio: el mes desde el que rige y el
// monto. La base guarda el primer dia del mes; el dominio, el mes.
export const comoCambios = (filas: readonly { monto: unknown; rige_desde: unknown }[] | null): CambioDeBono[] =>
  (filas ?? []).map((b) => ({ rigeDesde: String(b.rige_desde).slice(0, 7), monto: Number(b.monto) }));

// Dolares como los escribe la gente aqui: "$1.250" o "$1.250,50". es-VE y no
// es: el español genérico no agrupa los miles de cuatro cifras ("$1000").
export const dolares = (n: number) =>
  `$${n.toLocaleString('es-VE', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

export const COLUMNAS_DE_IMPREVISTO =
  'id, empleado_id, texto, pedido_en, vence, pedido_por, pedido_por_otro, registrado_por, resultado, razon, marcada_en, borrado_en, delega_funcion, delega_periodo, devuelto_en, devuelto_razon';

// Quien lo pidio, en palabras: un administrador o un supervisor por su nombre,
// o lo que se escribio en "otro".
export const quienPidio = (i: Pick<FilaImprevisto, 'pedido_por' | 'pedido_por_otro'>, quienes: readonly QuienPide[]) =>
  i.pedido_por_otro ?? quienes.find((q) => q.id === i.pedido_por)?.nombre ?? 'alguien que ya no pide';

// Lo que un supervisor delego (ADR 0012), siga o no a cargo de esa persona.
export type FilaDelegacion = {
  id: string;
  empleado_id: string;
  nombre: string;
  delega_funcion: string;
  delega_periodo: string;
  vence: string;
  resultado: Resultado | null;
  razon: string | null;
  devuelto_en: string | null;
  devuelto_razon: string | null;
  pedido_en: string;
  marcada_en: string | null;
};

// Lo que un supervisor le pidio a alguien de otro equipo (CEB-198).
export type FilaPedido = Pick<FilaImprevisto, 'id' | 'empleado_id' | 'texto' | 'pedido_en' | 'vence' | 'pedido_por'> & { nombre: string };

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
    { data: bonos },
    { data: gente },
    { data: delegaciones },
    { data: pedidos },
  ] = await Promise.all([
      supabase
        .from('funcion')
        .select(
          'id, texto, importancia, periodicidad, tipo_generado, tipo_corregido, dia_tope_generado, dia_tope_corregido, fecha_alta, titularidad!inner(ponderacion)',
        )
        .eq('activa', true),
      supabase.from('dia_no_habil').select('desde, hasta'),
      supabase.from('marca').select('id, funcion_id, periodo, resultado, razon, marcada_en'),
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
      // La seguridad por fila hace que solo llegue el suyo (INV-1).
      supabase.from('bono').select('monto, rige_desde'),
      // Vacio para quien no supervisa (CEB-145).
      supabase.rpc('mi_gente'),
      supabase.rpc('mis_delegaciones'),
      // Lo que pidio a gente de otros equipos (CEB-198). Vacio para quien no supervisa.
      supabase.rpc('lo_que_pedi'),
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
    bonos: comoCambios(bonos),
    gente: (gente ?? []) as { id: string; nombre: string }[],
    delegaciones: (delegaciones ?? []) as FilaDelegacion[],
    pedidos: (pedidos ?? []) as FilaPedido[],
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

// Un momento, con dia y hora de Caracas: "30 sept - 10:15". La pantalla se arma
// en el servidor, que corre en UTC; sin la zona, la hora saldria 4 horas
// adelantada y cerca de medianoche hasta el dia seria otro.
export const momentoCorto = (instante: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(instante))
      .map((x) => [x.type, x.value]),
  );
  return `${fechaCorta(`${p.year}-${p.month}-${p.day}`)} - ${p.hour}:${p.minute}`;
};

// Con el dia de la semana, para el selector de urgencia: "mié 7 oct".
export const fechaConDia = (fecha: string) =>
  `${new Intl.DateTimeFormat('es', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(`${fecha}T00:00:00Z`))
    .replace('.', '')} ${fechaCorta(fecha)}`;
