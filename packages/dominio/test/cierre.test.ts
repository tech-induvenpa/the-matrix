import { describe, expect, it } from 'vitest';
import { patronesDelMes, rachaMasLarga } from '../src/cierre';

describe('patrones del cierre', () => {
  it('marca la funcion que quedo sin cumplir dos periodos seguidos', () => {
    const historial = [
      { funcionId: 'induvenpa', periodo: '2026-09-Q1', cumplida: false, razon: 'Michell no ha pasado el cálculo' },
      { funcionId: 'induvenpa', periodo: '2026-09-Q2', cumplida: false, razon: 'Sigo esperando a Michell' },
      { funcionId: 'cierre', periodo: '2026-08', cumplida: false, razon: 'Se cayó el sistema' },
      { funcionId: 'cierre', periodo: '2026-09', cumplida: true },
    ];

    expect(patronesDelMes(historial, [])).toEqual([
      {
        funcionId: 'induvenpa',
        periodos: ['2026-09-Q1', '2026-09-Q2'],
        razones: ['Michell no ha pasado el cálculo', 'Sigo esperando a Michell'],
      },
    ]);
  });

  it('lo que vencio sin marcar cuenta igual que un no pude', () => {
    const historial = [
      { funcionId: 'patente', periodo: '2026-08', cumplida: false },
      { funcionId: 'patente', periodo: '2026-09', cumplida: false },
    ];

    expect(patronesDelMes(historial, [])[0]?.razones).toEqual([]);
  });

  it('la misma razon escrita dos veces se dice una vez', () => {
    // Repetir el mismo texto no anade informacion, solo ruido en la tarjeta.
    const historial = [
      { funcionId: 'cxp', periodo: '2026-08', cumplida: false, razon: 'No tenía bolívares' },
      { funcionId: 'cxp', periodo: '2026-09', cumplida: false, razon: 'No tenía bolívares' },
    ];

    expect(patronesDelMes(historial, [])[0]?.razones).toEqual(['No tenía bolívares']);
  });

  it('un flujo con dos atrasos declarados en el mes tambien es patron', () => {
    expect(patronesDelMes([], [{ funcionId: 'cxp', atrasosEnElMes: 2, razones: ['Espero a Rosibel'] }])).toEqual([
      { funcionId: 'cxp', periodos: [], razones: ['Espero a Rosibel'] },
    ]);
  });
});

describe('racha', () => {
  it('es la tirada mas larga de periodos cumplidos seguidos', () => {
    expect(
      rachaMasLarga([
        { periodo: '1', cumplida: true },
        { periodo: '2', cumplida: true },
        { periodo: '3', cumplida: false },
        { periodo: '4', cumplida: true },
        { periodo: '5', cumplida: true },
        { periodo: '6', cumplida: true },
      ]),
    ).toBe(3);
  });
});
