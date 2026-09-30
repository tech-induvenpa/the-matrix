import { centavosDe, descuenta, type Nomina, type ParteDelCargo } from './nomina';

// La foto del cierre (ADR 0017): la nomina de cada persona tal como quedo al
// cierre del mes -- sus partes, sus pesos, sus descuentos, su total y su
// empresa --, con los pesos del dia del cierre. Un mes cerrado se lee de su
// foto y nunca se recalcula: cambiar despues un peso, un bono o una empresa no
// toca lo que ya se pago.
//
// Guarda todas las partes, tambien las cumplidas: de ahi salen las tareas del
// mes y, en la descarga, el peso de cada funcion. Quien no tiene bono ese mes
// tambien sale en la foto, con sus partes y sin nomina.

export type ParteDeLaFoto = ParteDelCargo & { descuento: number };

export type FotoDelCierre = {
  empresaId: string | null;
  bono: number | null;
  total: number | null;
  partes: ParteDeLaFoto[];
};

// La cuenta es la de nominaDe: cada descuento al centavo y el total, el bono
// menos los descuentos ya redondeados.
export function fotoDelCierre(entrada: { empresaId: string | null; bono: number | null; partes: readonly ParteDelCargo[] }): FotoDelCierre {
  const bonoEnCentavos = entrada.bono === null ? null : Math.round(entrada.bono * 100);
  const partes = entrada.partes.map((p) => ({
    ...p,
    centavos: bonoEnCentavos !== null && descuenta(p) ? centavosDe(bonoEnCentavos, p) : 0,
  }));

  return {
    empresaId: entrada.empresaId,
    bono: bonoEnCentavos === null ? null : bonoEnCentavos / 100,
    total: bonoEnCentavos === null ? null : (bonoEnCentavos - partes.reduce((t, p) => t + p.centavos, 0)) / 100,
    partes: partes.map(({ centavos, ...p }) => ({ ...p, descuento: centavos / 100 })),
  };
}

// La nomina de un mes cerrado, leida de su foto tal cual: sin bono no hay
// nomina, y cada descuento y el total son los que se guardaron.
export function nominaDeLaFoto(foto: FotoDelCierre): Nomina | null {
  if (foto.bono === null || foto.total === null) return null;
  return { bono: foto.bono, lineas: foto.partes.filter(descuenta), total: foto.total };
}
