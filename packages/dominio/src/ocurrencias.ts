import type { Calendario, Fecha } from './calendario';

export type Periodicidad = 'diaria' | 'semanal' | 'quincenal' | 'mensual' | 'trimestral';

// Un periodo es el tramo del calendario al que pertenece una ocurrencia:
// un dia habil, una semana, una quincena, un mes o un trimestre.
export type Periodo = string;

export type Ocurrencia = { periodo: Periodo; vence: Fecha };

export type Funcion = {
  periodicidad: Periodicidad;
  diaTope?: number;
  fechaAlta: Fecha;
};

const enUTC = (f: Fecha) => new Date(Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)));
const enFecha = (d: Date): Fecha => d.toISOString().slice(0, 10);
const sumarDias = (f: Fecha, dias: number): Fecha => {
  const d = enUTC(f);
  d.setUTCDate(d.getUTCDate() + dias);
  return enFecha(d);
};
const ultimoDiaDelMes = (anio: number, mes: number): Fecha => enFecha(new Date(Date.UTC(anio, mes, 0)));

type Tramo = { periodo: Periodo; inicio: Fecha; fin: Fecha };

function tramoDe(periodicidad: Periodicidad, f: Fecha): Tramo {
  const anio = +f.slice(0, 4);
  const mes = +f.slice(5, 7);
  const dia = +f.slice(8, 10);
  const mm = String(mes).padStart(2, '0');

  switch (periodicidad) {
    case 'diaria':
      return { periodo: f, inicio: f, fin: f };
    case 'semanal': {
      const diaSemana = (enUTC(f).getUTCDay() + 6) % 7; // lunes = 0
      const lunes = sumarDias(f, -diaSemana);
      return { periodo: lunes, inicio: lunes, fin: sumarDias(lunes, 6) };
    }
    case 'quincenal': {
      const primera = dia <= 15;
      return {
        periodo: `${anio}-${mm}-${primera ? 'Q1' : 'Q2'}`,
        inicio: `${anio}-${mm}-${primera ? '01' : '16'}`,
        fin: primera ? `${anio}-${mm}-15` : ultimoDiaDelMes(anio, mes),
      };
    }
    case 'mensual':
      return { periodo: `${anio}-${mm}`, inicio: `${anio}-${mm}-01`, fin: ultimoDiaDelMes(anio, mes) };
    case 'trimestral': {
      const trimestre = Math.ceil(mes / 3);
      const primerMes = (trimestre - 1) * 3 + 1;
      return {
        periodo: `${anio}-T${trimestre}`,
        inicio: `${anio}-${String(primerMes).padStart(2, '0')}-01`,
        fin: ultimoDiaDelMes(anio, primerMes + 2),
      };
    }
  }
}

function venceEn(tramo: Tramo, funcion: Funcion, calendario: Calendario): Fecha | null {
  if (funcion.periodicidad === 'diaria') {
    return calendario.esHabil(tramo.fin) ? tramo.fin : null;
  }
  if (funcion.periodicidad === 'mensual' && funcion.diaTope !== undefined) {
    const ultimo = +tramo.fin.slice(8, 10);
    const dia = Math.min(funcion.diaTope, ultimo);
    return calendario.habilAnterior(`${tramo.fin.slice(0, 7)}-${String(dia).padStart(2, '0')}`);
  }
  return calendario.habilAnterior(tramo.fin);
}

// ponytail: recorre dia a dia y agrupa por periodo. Son decenas de iteraciones,
// no millones, y se lee de corrido.
export function ocurrenciasEntre(
  funcion: Funcion,
  calendario: Calendario,
  desde: Fecha,
  hasta: Fecha,
): Ocurrencia[] {
  const ocurrencias: Ocurrencia[] = [];
  const vistos = new Set<Periodo>();

  for (let f = tramoDe(funcion.periodicidad, desde).inicio; f <= hasta; f = sumarDias(f, 1)) {
    const tramo = tramoDe(funcion.periodicidad, f);
    if (vistos.has(tramo.periodo)) continue;
    vistos.add(tramo.periodo);

    // Una funcion cuenta desde el siguiente periodo completo tras su alta.
    if (tramo.inicio < funcion.fechaAlta) continue;

    const vence = venceEn(tramo, funcion, calendario);
    if (vence !== null && vence >= desde && vence <= hasta) {
      ocurrencias.push({ periodo: tramo.periodo, vence });
    }
  }

  return ocurrencias;
}
