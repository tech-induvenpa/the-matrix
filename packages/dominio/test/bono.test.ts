import { describe, expect, it } from 'vitest';
import { bonoDelMes, enDolares, montoNoCumplido } from '../src/bono';

// El bono: la parte variable de lo que gana alguien, la que la ponderacion
// reparte (ADR 0010). Un cambio rige desde un mes y se mantiene.
const historial = [
  { rigeDesde: '2026-07', monto: 1000 },
  { rigeDesde: '2026-10', monto: 1200 },
];

describe('el bono de un mes', () => {
  it('vale el ultimo cambio que ya regia ese mes', () => {
    expect(bonoDelMes(historial, '2026-09')).toBe(1000);
    expect(bonoDelMes(historial, '2026-10')).toBe(1200);
    expect(bonoDelMes(historial, '2027-03')).toBe(1200);
  });

  it('antes del primer cambio, o sin historial, no hay bono: no es un bono cero', () => {
    expect(bonoDelMes(historial, '2026-06')).toBeNull();
    expect(bonoDelMes([], '2026-09')).toBeNull();
  });
});

describe('cuanto vale cada funcion en dolares', () => {
  it('es su porcentaje del bono', () => {
    const tajadas = [{ nombre: 'Cierre', porcentaje: 25 }, { nombre: 'Resto', porcentaje: 75 }];
    expect(enDolares(tajadas, 1000).map((t) => t.dolares)).toEqual([250, 750]);
  });

  // Un tercio de 100 dolares no da centavos exactos. La ultima carga el ajuste,
  // igual que el reparto carga el redondeo del cien: si la suma no da el bono,
  // la gente desconfia de todas las cuentas.
  it('la suma es exactamente el bono aunque no divida exacto', () => {
    const tajadas = [{ porcentaje: 33 }, { porcentaje: 33 }, { porcentaje: 34 }];
    const dolares = enDolares(tajadas, 99.99).map((t) => t.dolares);
    expect(Math.round(dolares.reduce((a, b) => a + b, 0) * 100)).toBe(9999);
  });
});

describe('el monto no cumplido', () => {
  it('es el peso no cumplido sobre el bono', () => {
    expect(montoNoCumplido(2.9, 1000)).toBe(29);
  });

  it('se redondea a centavos', () => {
    expect(montoNoCumplido(6.25, 333)).toBe(20.81);
  });
});
