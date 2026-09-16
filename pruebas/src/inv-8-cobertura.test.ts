import { beforeAll, describe, expect, it } from 'vitest';
import { Calendario, coberturaDe, HORIZONTE } from '@matriz/dominio';
import { comoServicio } from './entorno';

// INV-8 · Mas alla del horizonte no se calculan fechas: el sistema prefiere no
// responder a responder mal. Y avisa antes de llegar ahi.
describe('INV-8: el sistema sabe hasta donde alcanza su calendario', () => {
  let calendario: Calendario;
  let cargadoHasta: string;

  beforeAll(async () => {
    const servicio = comoServicio();
    const { data: noHabiles } = await servicio.from('dia_no_habil').select('desde, hasta');
    const { data: cal } = await servicio.from('calendario').select('cargado_hasta').maybeSingle();
    calendario = Calendario.con(noHabiles ?? []);
    cargadoHasta = cal!.cargado_hasta as string;
  });

  it('la cobertura es un dato cargado, no la ausencia de feriados', () => {
    expect(cargadoHasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('hoy hay cobertura de sobra', () => {
    const hoy = new Date().toISOString().slice(0, 10);

    expect(coberturaDe(calendario, hoy, cargadoHasta).estado).toBe('ok');
  });

  it('cuando el margen se acorta, avisa antes de quedarse sin nada', () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const dentroDe = (dias: number) =>
      new Date(Date.parse(`${hoy}T00:00:00Z`) + dias * 864e5).toISOString().slice(0, 10);

    expect(coberturaDe(calendario, hoy, dentroDe(75)).estado).toBe('aviso_60');
    expect(coberturaDe(calendario, hoy, dentroDe(40)).estado).toBe('aviso_30');
  });

  it('por debajo del horizonte declara que no cubre, en vez de calcular a ciegas', () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const cobertura = coberturaDe(calendario, hoy, hoy);

    expect(cobertura.estado).toBe('sin_cobertura');
    expect(cobertura.habilesRestantes).toBeLessThan(HORIZONTE);
  });
});
