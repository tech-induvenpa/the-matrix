import type { Calendario, Fecha } from './calendario';

// Un periodo es el tramo del calendario al que pertenece una ocurrencia.
// Para una mensual, 'YYYY-MM'.
export type Periodo = string;

export type Ocurrencia = { periodo: Periodo; vence: Fecha };

// ponytail: por ahora solo mensual. Las otras cuatro periodicidades son CEB-109.
export type FuncionMensual = {
  periodicidad: 'mensual';
  diaTope?: number;
  fechaAlta: Fecha;
};

const ultimoDiaDelMes = (periodo: Periodo): number =>
  new Date(Date.UTC(+periodo.slice(0, 4), +periodo.slice(5, 7), 0)).getUTCDate();

const mesSiguiente = (periodo: Periodo): Periodo => {
  const anio = +periodo.slice(0, 4);
  const mes = +periodo.slice(5, 7);
  return mes === 12 ? `${anio + 1}-01` : `${anio}-${String(mes + 1).padStart(2, '0')}`;
};

const mesesEntre = (desde: Fecha, hasta: Fecha): Periodo[] => {
  const meses: Periodo[] = [];
  let anio = +desde.slice(0, 4);
  let mes = +desde.slice(5, 7);
  while (`${anio}-${String(mes).padStart(2, '0')}` <= hasta.slice(0, 7)) {
    meses.push(`${anio}-${String(mes).padStart(2, '0')}`);
    if (mes === 12) {
      mes = 1;
      anio++;
    } else {
      mes++;
    }
  }
  return meses;
};

export function ocurrenciasEntre(
  funcion: FuncionMensual,
  calendario: Calendario,
  desde: Fecha,
  hasta: Fecha,
): Ocurrencia[] {
  // Una funcion empieza a contar en el siguiente periodo completo: si nacio a
  // mitad de mes, ese mes no cuenta, para que nunca tenga un vencimiento imposible.
  const alta = funcion.fechaAlta;
  const primerPeriodo = alta.slice(8, 10) === '01' ? alta.slice(0, 7) : mesSiguiente(alta.slice(0, 7));

  return mesesEntre(desde, hasta)
    .filter((periodo) => periodo >= primerPeriodo)
    .map((periodo) => {
      const dia = Math.min(funcion.diaTope ?? 31, ultimoDiaDelMes(periodo));
      const vence = calendario.habilAnterior(`${periodo}-${String(dia).padStart(2, '0')}`);
      return { periodo, vence };
    })
    .filter((o) => o.vence >= desde && o.vence <= hasta);
}
