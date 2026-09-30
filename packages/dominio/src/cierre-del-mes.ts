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

export type EstadoDelMes = { estado: 'abierto' } | { estado: 'cerrado' };

// `ahora` es un instante ISO. Desde las 23:59 en punto el mes ya esta cerrado.
export function estadoDelMes(mes: Mes, calendario: Calendario, ahora: string): EstadoDelMes {
  return new Date(ahora) >= new Date(cierreDelMes(mes, calendario)) ? { estado: 'cerrado' } : { estado: 'abierto' };
}
