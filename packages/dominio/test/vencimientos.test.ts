import { describe, expect, it } from 'vitest';
import { Calendario, vencimientosPorAvisar } from '../src';

// 2026-10-07 es miercoles. El viernes 9 de octubre no es habil en el segundo caso.
const semana = Calendario.con([]);
const hoy = '2026-10-07';

describe('vencimientosPorAvisar', () => {
  it('avisa a 2 y a 1 dia habil, cada grupo con sus tareas', () => {
    const avisos = vencimientosPorAvisar(
      [
        { clave: 'a', vence: '2026-10-09' },
        { clave: 'b', vence: '2026-10-09' },
        { clave: 'c', vence: '2026-10-08' },
      ],
      hoy,
      semana,
    );
    expect(avisos).toEqual([
      { faltan: 2, claves: ['a', 'b'] },
      { faltan: 1, claves: ['c'] },
    ]);
  });

  it('no avisa lo que vence hoy, lo ya vencido ni lo que esta lejos', () => {
    const avisos = vencimientosPorAvisar(
      [
        { clave: 'hoy', vence: hoy },
        { clave: 'vencida', vence: '2026-10-05' },
        { clave: 'lejos', vence: '2026-10-20' },
      ],
      hoy,
      semana,
    );
    expect(avisos).toEqual([]);
  });

  it('una diaria no avisa, ni siquiera la de manana', () => {
    expect(vencimientosPorAvisar([{ clave: 'd', vence: '2026-10-08', periodicidad: 'diaria' }], hoy, semana)).toEqual([]);
  });

  it('cuenta dias habiles: un feriado en medio adelanta el aviso', () => {
    const conFeriado = Calendario.con([{ desde: '2026-10-08', hasta: '2026-10-08' }]);
    expect(vencimientosPorAvisar([{ clave: 'a', vence: '2026-10-09' }], hoy, conFeriado)).toEqual([{ faltan: 1, claves: ['a'] }]);
  });

  it('el viernes avisa lo del lunes con 1, y el fin de semana no avisa nada', () => {
    const tarea = [{ clave: 'a', vence: '2026-10-12' }];
    expect(vencimientosPorAvisar(tarea, '2026-10-09', semana)).toEqual([{ faltan: 1, claves: ['a'] }]);
    expect(vencimientosPorAvisar(tarea, '2026-10-10', semana)).toEqual([]);
    expect(vencimientosPorAvisar(tarea, '2026-10-11', semana)).toEqual([]);
  });
});
