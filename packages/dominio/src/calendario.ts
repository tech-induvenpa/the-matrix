// Una fecha del dominio es un dia, sin hora ni zona: 'YYYY-MM-DD'.
// ponytail: se comparan como texto, porque ISO ordena igual que el calendario.
export type Fecha = string;

export type RangoNoHabil = { desde: Fecha; hasta: Fecha };

const enUTC = (f: Fecha) => new Date(Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)));
const enFecha = (d: Date): Fecha => d.toISOString().slice(0, 10);

const sumarDias = (f: Fecha, dias: number): Fecha => {
  const d = enUTC(f);
  d.setUTCDate(d.getUTCDate() + dias);
  return enFecha(d);
};

export class Calendario {
  private constructor(private readonly noHabiles: readonly RangoNoHabil[]) {}

  static con(noHabiles: readonly RangoNoHabil[]): Calendario {
    return new Calendario(noHabiles);
  }

  // ponytail: retrocede de dia en dia. Son tres o cuatro pasos como mucho.
  habilAnterior(fecha: Fecha): Fecha {
    let f = fecha;
    while (!this.esHabil(f)) f = sumarDias(f, -1);
    return f;
  }

  // ponytail: avanza de dia en dia. Con un bloque de colectivas son unas
  // treinta vueltas, no millones.
  habilSiguiente(fecha: Fecha): Fecha {
    let f = fecha;
    while (!this.esHabil(f)) f = sumarDias(f, 1);
    return f;
  }

  // Cuantos dias habiles hay despues de 'desde' y hasta 'hasta', inclusive.
  habilesEntre(desde: Fecha, hasta: Fecha): number {
    let dias = 0;
    let f = sumarDias(desde, 1);
    while (f <= hasta) {
      if (this.esHabil(f)) dias++;
      f = sumarDias(f, 1);
    }
    return dias;
  }

  // La fecha que esta 'dias' habiles despues de 'desde': la inversa de
  // habilesEntre. Con cero, el habil siguiente o igual. Solo conoce los dias no
  // habiles que se le dieron; mas alla cuenta de lunes a viernes (ADR 0013).
  sumarHabiles(desde: Fecha, dias: number): Fecha {
    if (dias === 0) return this.habilSiguiente(desde);
    let f = desde;
    for (let n = 0; n < dias; ) {
      f = sumarDias(f, 1);
      if (this.esHabil(f)) n++;
    }
    return f;
  }

  esHabil(fecha: Fecha): boolean {
    const dia = enUTC(fecha).getUTCDay();
    if (dia === 0 || dia === 6) return false;
    return !this.noHabiles.some((r) => fecha >= r.desde && fecha <= r.hasta);
  }
}
