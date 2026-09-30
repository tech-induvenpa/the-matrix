import type { Calendario, Fecha } from './calendario';
import type { Mes } from './bono';

// El cierre del mes: el momento en que un mes deja de moverse (ADR 0016). Es
// automatico y es un corte duro a las 23:59, hora de Caracas, de su ultimo dia
// habil. La base aplica la misma regla (0032_cierre_del_mes.sql); aqui vive
// para que la pantalla sepa decirlo antes de que la base lo rechace.
//
// La zona va explicita porque el servidor corre en UTC. Venezuela esta en
// UTC-4 todo el anio, sin horario de verano, desde 2016: el desfase es fijo.
const CARACAS_EN_UTC = '-04:00';

export const mesDe = (fecha: Fecha): Mes => fecha.slice(0, 7);

const ultimoDiaDe = (mes: Mes): Fecha =>
  new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).toISOString().slice(0, 10);

export const ultimoHabilDelMes = (mes: Mes, calendario: Calendario): Fecha =>
  calendario.habilAnterior(ultimoDiaDe(mes));

// El instante del cierre, en UTC.
export const cierreDelMes = (mes: Mes, calendario: Calendario): string =>
  new Date(`${ultimoHabilDelMes(mes, calendario)}T23:59:00${CARACAS_EN_UTC}`).toISOString();

// Solo el administrador reabre un mes cerrado, con razon, y para todos
// (CEB-229). Se vuelve a cerrar cuando el lo cierra (`cerradaEn`) o, si se le
// olvida, solo, a las veinticuatro horas: sin un proceso que lo haga, un mes
// reabierto hace mas de un dia se lee como cerrado.
export type Reapertura = { mes: Mes; razon: string; quien: string; en: string; cerradaEn: string | null };

const UN_DIA = 24 * 60 * 60 * 1000;

export type Recierre = { como: 'a_mano' | 'solo' | 'sigue_abierto'; en: string };

// Como se volvio a cerrar una reapertura: a mano, solo a las veinticuatro
// horas, o todavia no, y entonces `en` es cuando se cerrara sola.
export function comoSeCerro(r: Reapertura, ahora: string): Recierre {
  if (r.cerradaEn && new Date(ahora) >= new Date(r.cerradaEn)) return { como: 'a_mano', en: r.cerradaEn };
  const solo = new Date(new Date(r.en).getTime() + UN_DIA).toISOString();
  return { como: new Date(ahora) >= new Date(solo) ? 'solo' : 'sigue_abierto', en: solo };
}

export type EstadoDelMes = { estado: 'abierto' } | { estado: 'cerrado' } | { estado: 'reabierto'; hasta: string };

// `ahora` es un instante ISO. Desde las 23:59 en punto el mes ya esta cerrado.
export function estadoDelMes(
  mes: Mes,
  calendario: Calendario,
  ahora: string,
  reaperturas: readonly Reapertura[] = [],
): EstadoDelMes {
  if (new Date(ahora) < new Date(cierreDelMes(mes, calendario))) return { estado: 'abierto' };

  const vigente = reaperturas.find(
    (r) => r.mes === mes && new Date(r.en) <= new Date(ahora) && comoSeCerro(r, ahora).como === 'sigue_abierto',
  );
  return vigente ? { estado: 'reabierto', hasta: comoSeCerro(vigente, ahora).en } : { estado: 'cerrado' };
}
