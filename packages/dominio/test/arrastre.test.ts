import { describe, expect, it } from 'vitest';
import { arrastreDe, cumplimientoPonderado, esPatron, ponderacionArrastrada, SIN_ARRASTRE } from '../src/arrastre';

const mensuales = (...meses: string[]) =>
  meses.map((m) => ({ periodo: m, vence: `${m}-28` }));

describe('el arrastre de una funcion', () => {
  it('sin nada vencido todavia, no arrastra', () => {
    expect(arrastreDe(mensuales('2026-10'), [], '2026-09-21')).toEqual(SIN_ARRASTRE);
  });

  it('una ocurrencia vencida y sin marcar ya es un arrastre de uno', () => {
    expect(arrastreDe(mensuales('2026-08'), [], '2026-09-21')).toEqual({ periodos: 1, desde: '2026-08-28' });
  });

  // Vencer sin marcar cuenta igual que un "no pude": callarse no protege, y
  // por eso marcar con su razon es estrictamente mejor que el silencio.
  it('tres periodos seguidos sin cerrar son tres, y dice desde cuando', () => {
    const tres = mensuales('2026-06', '2026-07', '2026-08');
    expect(arrastreDe(tres, [], '2026-09-21')).toEqual({ periodos: 3, desde: '2026-06-28' });
  });

  it('cerrar el ultimo corta el arrastre, aunque queden viejos sin cerrar', () => {
    const tres = mensuales('2026-06', '2026-07', '2026-08');
    expect(arrastreDe(tres, [{ periodo: '2026-08' }], '2026-09-21')).toEqual(SIN_ARRASTRE);
  });

  it('se cuenta hacia atras desde lo mas reciente, no desde el principio', () => {
    const cuatro = mensuales('2026-05', '2026-06', '2026-07', '2026-08');
    // Junio se cerro: solo arrastra lo de julio y agosto.
    expect(arrastreDe(cuatro, [{ periodo: '2026-06' }], '2026-09-21')).toEqual({
      periodos: 2,
      desde: '2026-07-28',
    });
  });

  it('lo que aun no vence no interrumpe el conteo ni suma', () => {
    const conFuturo = mensuales('2026-07', '2026-08', '2026-10');
    expect(arrastreDe(conFuturo, [], '2026-09-21')).toEqual({ periodos: 2, desde: '2026-07-28' });
  });
});

describe('cuanto del cargo esta sin cumplirse', () => {
  const con = (ponderacion: number, periodos: number) => ({
    funcionId: `f-${ponderacion}`,
    ponderacion,
    arrastre: { periodos, desde: periodos ? '2026-07-01' : null },
  });

  it('suma el peso de lo que arrastra, y solo eso', () => {
    expect(ponderacionArrastrada([con(30, 2), con(50, 0), con(20, 1)])).toBe(50);
  });

  it('un cargo al dia no arrastra nada', () => {
    expect(ponderacionArrastrada([con(60, 0), con(40, 0)])).toBe(0);
  });

  // Lo que justifica ordenar por peso y no por cantidad: una diaria acumula
  // veintidos veces mas rapido que una mensual, y seria siempre la primera.
  it('una diaria con veinte periodos pesa menos que una mensual gorda', () => {
    const diaria = { funcionId: 'diaria', ponderacion: 3, arrastre: { periodos: 20, desde: '2026-08-01' } };
    const mensual = { funcionId: 'mensual', ponderacion: 25, arrastre: { periodos: 1, desde: '2026-08-28' } };

    expect(ponderacionArrastrada([diaria])).toBeLessThan(ponderacionArrastrada([mensual]));
  });
});

describe('el patron es un arrastre con umbral', () => {
  it('uno no es patron; dos si', () => {
    expect(esPatron({ periodos: 1, desde: '2026-08-28' })).toBe(false);
    expect(esPatron({ periodos: 2, desde: '2026-07-28' })).toBe(true);
  });
});

describe('el cumplimiento ponderado del mes', () => {
  it('todo cerrado es cien', () => {
    expect(cumplimientoPonderado([{ ponderacion: 60, asignadas: 4, cerradas: 4 }])).toBe(100);
  });

  it('nada cerrado es cero', () => {
    expect(cumplimientoPonderado([{ ponderacion: 60, asignadas: 4, cerradas: 0 }])).toBe(0);
  });

  // Lo que hace que sea "peso salarial": fallar en lo que pesa mucho duele mas
  // que fallar en lo que pesa poco.
  it('fallar en lo gordo pesa mas que fallar en lo flaco', () => {
    const falloLoGordo = [
      { ponderacion: 80, asignadas: 1, cerradas: 0 },
      { ponderacion: 20, asignadas: 1, cerradas: 1 },
    ];
    const falloLoFlaco = [
      { ponderacion: 80, asignadas: 1, cerradas: 1 },
      { ponderacion: 20, asignadas: 1, cerradas: 0 },
    ];

    expect(cumplimientoPonderado(falloLoGordo)).toBe(20);
    expect(cumplimientoPonderado(falloLoFlaco)).toBe(80);
  });

  // Una trimestral que no vence este mes no puede hundir a nadie.
  it('lo que no tuvo ocurrencias este mes no cuenta ni a favor ni en contra', () => {
    expect(
      cumplimientoPonderado([
        { ponderacion: 50, asignadas: 2, cerradas: 2 },
        { ponderacion: 50, asignadas: 0, cerradas: 0 },
      ]),
    ).toBe(100);
  });

  it('un mes sin nada asignado no es un cero: es que no hubo nada', () => {
    expect(cumplimientoPonderado([{ ponderacion: 100, asignadas: 0, cerradas: 0 }])).toBe(100);
  });
});
