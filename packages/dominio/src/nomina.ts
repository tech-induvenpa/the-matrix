import type { Calendario, Fecha } from './calendario';
import type { Mes } from './bono';
import type { Periodicidad } from './ocurrencias';
import type { Resultado } from './imprevistos';
import { ocurrenciasEntre } from './ocurrencias';
import { atrasosDelFlujo, diasHabilesDelMes, hechosDeEntregable, hechosDeHolgura } from './descarga';
import { comoSeCerro, type Reapertura, type Recierre } from './cierre-del-mes';

// La nomina: cuanto del bono le corresponde a una persona en un mes, con su
// fundamento (ADR 0016). Se lee como un estado de cuenta: el bono, un
// descuento por cada parte del cargo que no se cumplio entera, y el total.
//
// Sale de los mismos hechos que la descarga (ADR 0011), con las mismas
// funciones del dominio, para que nunca se contradigan: cada descuento es la
// suma del MONTO NO CUMPLIDO de sus filas, redondeada al centavo.

export type FuncionDeLaNomina = {
  funcionId: string;
  nombre: string;
  // El area no se mide: no entra.
  tipo: 'entregable' | 'flujo';
  ponderacion: number;
  periodicidad: Periodicidad;
  diaTope?: number;
  fechaAlta: Fecha;
  marcas: readonly { periodo: string; resultado: string }[];
  eventos: readonly { estado: 'al_dia' | 'atrasado'; en: string }[];
};

export type ImprevistoDeLaNomina = {
  texto: string;
  vence: Fecha;
  resultado: Resultado | null;
  borradoEn: string | null;
  devueltoEn?: string | null;
};

// Una parte del cargo en un mes: cuantas veces debia cumplirse y cuantas no.
// En un flujo, los dias habiles atrasados sobre los del mes; en la
// cotidianidad, los imprevistos sin cumplir sobre los esperados.
export type ParteDelCargo = {
  parte: string;
  tipo: 'entregable' | 'flujo' | 'cotidianidad';
  ponderacion: number;
  sinCumplir: number;
  veces: number;
};

export type LineaDeNomina = ParteDelCargo & { descuento: number };
export type Nomina = { bono: number; lineas: LineaDeNomina[]; total: number };

const finDe = (mes: Mes): Fecha => new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).toISOString().slice(0, 10);

// Las partes del cargo de una persona en un mes, como las cuenta la descarga.
// En el mes en curso solo cuenta lo que ya vencio: lo demas aun se puede
// cumplir. Las veces de un flujo son los dias habiles del mes entero.
export function partesDelMes(entrada: {
  mes: Mes;
  hoy: Fecha;
  calendario: Calendario;
  funciones: readonly FuncionDeLaNomina[];
  cotidianidad: number;
  imprevistos: readonly ImprevistoDeLaNomina[];
}): ParteDelCargo[] {
  const { mes, hoy, calendario } = entrada;
  const tramo = { desde: `${mes}-01`, hasta: mes === hoy.slice(0, 7) ? hoy : finDe(mes) };

  const funciones = [...entrada.funciones]
    .sort((a, b) => b.ponderacion - a.ponderacion || a.nombre.localeCompare(b.nombre))
    .map((f): ParteDelCargo => {
      if (f.tipo === 'flujo') {
        const dias = atrasosDelFlujo(f.eventos, tramo, calendario).reduce((t, a) => t + a.dias, 0);
        const veces = diasHabilesDelMes({ desde: tramo.desde, hasta: finDe(mes) }, calendario);
        return { parte: f.nombre, tipo: 'flujo', ponderacion: f.ponderacion, sinCumplir: dias, veces };
      }
      const ocurrencias = ocurrenciasEntre(f, calendario, tramo.desde, tramo.hasta).filter((o) => o.vence <= tramo.hasta);
      const hechos = hechosDeEntregable(ocurrencias, f.marcas);
      const sinCumplir = hechos.filter((h) => h.cumplio === 0).length;
      return { parte: f.nombre, tipo: 'entregable', ponderacion: f.ponderacion, sinCumplir, veces: hechos.length };
    });

  const { filas, veces } = hechosDeHolgura(entrada.imprevistos, tramo, hoy);
  const sinCumplir = filas.filter((h) => h.cumplio === 0).length;
  return [...funciones, { parte: 'Cotidianidad', tipo: 'cotidianidad', ponderacion: entrada.cotidianidad, sinCumplir, veces }];
}

// Sin bono ese mes no hay nomina: no es lo mismo que una nomina en cero. Lo
// cumplido no aparece, y tampoco lo que no pesa. Cada descuento se redondea
// al centavo y el total es el bono menos los descuentos ya redondeados, asi
// que siempre cuadra.
export function nominaDe(bono: number | null, partes: readonly ParteDelCargo[]): Nomina | null {
  if (bono === null) return null;

  const bonoEnCentavos = Math.round(bono * 100);
  // ponytail: toFixed antes de redondear, para que un ,5 que la coma flotante
  // deja en ,4999999 suba como en la hoja de calculo.
  const lineas = partes
    .filter((p) => p.sinCumplir > 0 && p.veces > 0 && p.ponderacion > 0)
    .map((p) => ({
      ...p,
      centavos: Math.round(Number(((bonoEnCentavos * p.ponderacion * p.sinCumplir) / (100 * p.veces)).toFixed(6))),
    }));

  return {
    bono: bonoEnCentavos / 100,
    lineas: lineas.map(({ centavos, ...p }) => ({ ...p, descuento: centavos / 100 })),
    total: (bonoEnCentavos - lineas.reduce((t, l) => t + l.centavos, 0)) / 100,
  };
}

// Lo que dice cada linea, igual en "El mes", en el perfil y en el archivo para
// finanzas.
export function conceptoDe(l: ParteDelCargo): string {
  const cuanto =
    l.tipo === 'flujo'
      ? `${l.sinCumplir} de ${l.veces} días hábiles con atraso`
      : `${l.sinCumplir} de ${l.veces} ${l.tipo === 'cotidianidad' ? 'imprevistos ' : ''}sin cumplir`;
  return `${l.parte} (${l.ponderacion}%): ${cuanto}`;
}

// Las reaperturas de un mes, como se leen en su nomina (CEB-232): cuando,
// quien, por que, como se volvio a cerrar y que cambio. El total de antes se
// guarda al reabrir; el de despues es el de antes de la siguiente reapertura
// o, en la ultima, el de ahora. Sin bono al reabrir, no hay total de antes.
export type ReaperturaDeLaNomina = {
  en: string;
  quien: string;
  razon: string;
  recierre: Recierre;
  antes: number | null;
  despues: number;
};

export function reaperturasDeLaNomina(
  reaperturas: readonly (Reapertura & { totalAntes: number | null })[],
  totalAhora: number,
  ahora: string,
): ReaperturaDeLaNomina[] {
  const enOrden = [...reaperturas].sort((a, b) => a.en.localeCompare(b.en));
  return enOrden.map((r, i) => ({
    en: r.en,
    quien: r.quien,
    razon: r.razon,
    recierre: comoSeCerro(r, ahora),
    antes: r.totalAntes,
    despues: enOrden[i + 1]?.totalAntes ?? totalAhora,
  }));
}
