import { describe, expect, it } from 'vitest';
import { razonesParaElDocumento } from '../src/razones';

describe('las razones que vuelven al documento', () => {
  const marcas = [
    { funcionId: 'nomina', periodo: '2026-09-Q1', resultado: 'no_pude' as const, razon: 'Michell no pasó el cálculo', en: '2026-09-15T10:00:00Z' },
    { funcionId: 'nomina', periodo: '2026-09-Q2', resultado: 'hecho' as const, en: '2026-09-30T10:00:00Z' },
  ];
  const eventos = [
    { funcionId: 'cxp', estado: 'atrasado' as const, razon: 'Espero a Rosibel', en: '2026-09-14T09:00:00Z' },
    { funcionId: 'cxp', estado: 'al_dia' as const, en: '2026-09-16T09:00:00Z' },
  ];

  it('solo lleva lo que alguien escribio: un hecho no dice nada', () => {
    expect(razonesParaElDocumento(marcas, eventos).map((r) => r.razon)).toEqual([
      'Michell no pasó el cálculo',
      'Espero a Rosibel',
    ]);
  });

  it('van de lo mas reciente a lo mas viejo, con su fecha y su periodo', () => {
    expect(razonesParaElDocumento(marcas, eventos)[0]).toEqual({
      funcionId: 'nomina',
      periodo: '2026-09-Q1',
      razon: 'Michell no pasó el cálculo',
      en: '2026-09-15',
    });
  });

  it('un flujo se atrasa un dia, no un periodo: va sin periodo', () => {
    expect(razonesParaElDocumento(marcas, eventos)[1]).toEqual({
      funcionId: 'cxp',
      periodo: '',
      razon: 'Espero a Rosibel',
      en: '2026-09-14',
    });
  });

  it('nunca lleva montos ni nada calculado: la hoja es de JFS, no del sistema', () => {
    const fila = razonesParaElDocumento(marcas, eventos)[1]!;
    expect(Object.keys(fila).sort()).toEqual(['en', 'funcionId', 'periodo', 'razon']);
  });

  it('sin razones no escribe nada, en vez de limpiar la pestana', () => {
    expect(razonesParaElDocumento([], [])).toEqual([]);
  });
});
