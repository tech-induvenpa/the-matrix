import { describe, expect, it } from 'vitest';
import { delFiltro, leerPertenencia, opcionesDePertenencia } from '../src/filtro-del-equipo';

// El filtro del equipo (CEB-184): empresa, sede y texto. Sin sede es todas las
// sedes de su empresa, y el texto no distingue mayusculas ni tildes.
const KIA = { id: 'kia', nombre: 'KIA' };
const TOYOTA = { id: 'toyota', nombre: 'Toyota' };
const VALENCIA = { id: 'valencia', nombre: 'Valencia' };
const MARACAY = { id: 'maracay', nombre: 'Maracay' };

const persona = (p: Partial<Parameters<typeof delFiltro>[0]> = {}) => ({
  nombre: 'DOUGLENIS',
  empresa: KIA,
  sede: null,
  ...p,
});
const funciones = ['Cierre Auto Bengala', 'Conciliación bancaria'];
const texto = (f: string) => f;
const entra = (p: Parameters<typeof delFiltro>[0], filtro: Parameters<typeof delFiltro>[3]) =>
  delFiltro(p, funciones, texto, filtro) !== null;

describe('quien entra en el filtro', () => {
  it('sin filtro entra todo, con todas sus filas', () => {
    expect(delFiltro(persona(), funciones, texto, {})).toEqual(funciones);
    expect(delFiltro(persona({ empresa: null }), funciones, texto, {})).toEqual(funciones);
  });

  it('por empresa: la suya si, otra no', () => {
    expect(entra(persona(), { empresa: 'kia' })).toBe(true);
    expect(entra(persona(), { empresa: 'toyota' })).toBe(false);
    expect(entra(persona({ empresa: null }), { empresa: 'kia' })).toBe(false);
  });

  it('por sede: la suya si, otra de su empresa no', () => {
    expect(entra(persona({ sede: VALENCIA }), { empresa: 'kia', sede: 'valencia' })).toBe(true);
    expect(entra(persona({ sede: MARACAY }), { empresa: 'kia', sede: 'valencia' })).toBe(false);
  });

  it('sin sede entra en todas las sedes de su empresa, y en ninguna de otra', () => {
    expect(entra(persona(), { empresa: 'kia', sede: 'valencia' })).toBe(true);
    expect(entra(persona(), { empresa: 'kia', sede: 'maracay' })).toBe(true);
    expect(entra(persona({ empresa: TOYOTA }), { empresa: 'kia', sede: 'valencia' })).toBe(false);
  });

  it('por texto: nombre, empresa o sede traen todas sus filas', () => {
    expect(delFiltro(persona(), funciones, texto, { texto: 'dougl' })).toEqual(funciones);
    expect(delFiltro(persona(), funciones, texto, { texto: 'kia' })).toEqual(funciones);
    expect(delFiltro(persona({ sede: MARACAY }), funciones, texto, { texto: 'maracay' })).toEqual(funciones);
  });

  it('por texto de una funcion: entra, con solo las filas que coinciden', () => {
    expect(delFiltro(persona(), funciones, texto, { texto: 'cierre' })).toEqual(['Cierre Auto Bengala']);
  });

  it('el texto no distingue mayusculas ni tildes, en ningun sentido', () => {
    expect(delFiltro(persona(), funciones, texto, { texto: 'CONCILIACION' })).toEqual(['Conciliación bancaria']);
    expect(entra(persona({ nombre: 'JOSÉ' }), { texto: 'jose' })).toBe(true);
    expect(entra(persona({ nombre: 'JOSE' }), { texto: 'josé' })).toBe(true);
  });

  it('si el texto no aparece en ningun lado, no entra', () => {
    expect(delFiltro(persona(), funciones, texto, { texto: 'nomina' })).toBeNull();
  });

  it('un texto en blanco es como no tenerlo', () => {
    expect(delFiltro(persona(), funciones, texto, { texto: '   ' })).toEqual(funciones);
  });

  it('empresa y texto se combinan con "y"', () => {
    expect(delFiltro(persona(), funciones, texto, { empresa: 'kia', texto: 'cierre' })).toEqual(['Cierre Auto Bengala']);
    expect(entra(persona({ empresa: TOYOTA }), { empresa: 'kia', texto: 'cierre' })).toBe(false);
  });
});

describe('las opciones de pertenencia', () => {
  const empresas = [KIA, TOYOTA];
  const sedes = [
    { ...VALENCIA, empresa: 'kia' },
    { ...MARACAY, empresa: 'kia' },
  ];

  it('cada empresa, y debajo sus sedes; una empresa sin sedes no ofrece sede', () => {
    expect(opcionesDePertenencia(empresas, sedes)).toEqual([
      { valor: 'kia', etiqueta: 'KIA' },
      { valor: 'kia/maracay', etiqueta: 'KIA · Maracay' },
      { valor: 'kia/valencia', etiqueta: 'KIA · Valencia' },
      { valor: 'toyota', etiqueta: 'Toyota' },
    ]);
  });

  it('una opcion se lee de vuelta como empresa y sede', () => {
    expect(leerPertenencia('kia/valencia')).toEqual({ empresa: 'kia', sede: 'valencia' });
    expect(leerPertenencia('toyota')).toEqual({ empresa: 'toyota' });
    expect(leerPertenencia('')).toEqual({});
    expect(leerPertenencia(undefined)).toEqual({});
  });
});
