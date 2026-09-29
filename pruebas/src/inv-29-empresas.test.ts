import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { delFiltro, type FiltroDelEquipo } from '@matriz/dominio';
import { comoAdministrador, comoEmpleado, comoServicio, empresa, sembrarEmpleado, sembrarFuncion, sede, vaciar } from './entorno';

// Cada empleado pertenece a una empresa del grupo (CEB-184). KIA con dos sedes
// y gente en cada una, alguien de KIA sin sede, alguien de Toyota, y una
// supervisora con un vecino de KIA que no esta a su cargo.

let kia: string;
let toyota: string;
let kia212: string;
let kiaCentro: string;
let ana: string; // KIA · 212, supervisora
let benito: string; // KIA · Centro, a cargo de ana
let carla: string; // KIA sin sede, a cargo de ana
let dario: string; // Toyota, a cargo de ana
let elena: string; // KIA · 212, vecina: nadie la supervisa
let jefa: SupabaseClient;
let sesionAna: SupabaseClient;
let sesionElena: SupabaseClient;

const entregable = (texto: string) => ({
  hash_identidad: `h-${texto}`,
  texto,
  importancia: 5,
  periodicidad: 'mensual',
  tipo_generado: 'entregable',
  fecha_alta: '2026-01-01',
});

beforeAll(async () => {
  await vaciar();
  kia = await empresa('KIA');
  toyota = await empresa('Toyota');
  kia212 = await sede(kia, '212');
  kiaCentro = await sede(kia, 'Centro');

  ana = await sembrarEmpleado('ANA', 'ana@prueba.test', { empresa_id: kia, sede_id: kia212 });
  benito = await sembrarEmpleado('BENITO', 'benito@prueba.test', { empresa_id: kia, sede_id: kiaCentro });
  carla = await sembrarEmpleado('CARLA', 'carla@prueba.test', { empresa_id: kia });
  dario = await sembrarEmpleado('DARIO', 'dario@prueba.test', { empresa_id: toyota });
  elena = await sembrarEmpleado('ELENA', 'elena@prueba.test', { empresa_id: kia, sede_id: kia212 });
  await sembrarFuncion(benito, entregable('Cierre Auto Bengala'));
  await sembrarFuncion(dario, entregable('Conciliación bancaria'));
  await sembrarFuncion(elena, entregable('Cierre de caja'));

  jefa = await comoAdministrador('jefa@prueba.test');
  sesionAna = await comoEmpleado('ana@prueba.test');
  sesionElena = await comoEmpleado('elena@prueba.test');
  await comoEmpleado('benito@prueba.test');

  for (const p of [benito, carla, dario]) {
    const { error } = await jefa.rpc('asignar_supervisor', { el_empleado: p, el_supervisor: ana });
    if (error) throw error;
  }
});

type N = { id: string; nombre: string } | null;
type FilaEmpleado = { id: string; nombre_bloque: string; empresa: N; sede: N; titularidad: { hasta: string | null; funcion: { texto: string } }[] };
type DeMiGente = {
  gente: { id: string; nombre: string; empresa: string | null; sede: string | null }[];
  funciones: { empleado_id: string; texto: string }[];
};

type Persona = { id: string; nombre: string; empresa: { id: string; nombre: string } | null; sede: { id: string; nombre: string } | null; funciones: string[] };

// Lo que hace el servidor web: leer con la sesion de quien mira y filtrar
// despues con el dominio. Las dos lecturas son las de la pantalla.
async function loQueVeLaJefa(): Promise<Persona[]> {
  const { data, error } = await jefa
    .from('empleado')
    .select('id, nombre_bloque, empresa(id, nombre), sede(id, nombre), titularidad(hasta, funcion(texto))')
    .order('nombre_bloque');
  if (error) throw error;
  return ((data ?? []) as unknown as FilaEmpleado[]).map((e) => ({
    id: e.id,
    nombre: e.nombre_bloque,
    empresa: e.empresa,
    sede: e.sede,
    funciones: e.titularidad.filter((t) => t.hasta === null).map((t) => t.funcion.texto),
  }));
}

async function loQueVeAna(): Promise<Persona[]> {
  const [{ data, error }, { data: empresas }, { data: sedes }] = await Promise.all([
    sesionAna.rpc('lo_de_mi_gente'),
    sesionAna.from('empresa').select('id, nombre'),
    sesionAna.from('sede').select('id, nombre'),
  ]);
  if (error) throw error;
  const nombre = (lista: { id: string; nombre: string }[] | null, id: string | null) => lista?.find((x) => x.id === id) ?? null;
  const { gente, funciones } = data as DeMiGente;
  return gente.map((g) => ({
    id: g.id,
    nombre: g.nombre,
    empresa: nombre(empresas, g.empresa),
    sede: nombre(sedes, g.sede),
    funciones: funciones.filter((f) => f.empleado_id === g.id).map((f) => f.texto),
  }));
}

const quienes = (gente: Persona[], filtro: FiltroDelEquipo) =>
  gente.filter((p) => delFiltro(p, p.funciones, (f) => f, filtro) !== null).map((p) => p.id).sort();

describe('INV-29: filtrar y buscar solo acotan lo que ya se ve', () => {
  it('el administrador filtra por empresa: cada quien bajo la suya, nunca bajo otra', async () => {
    const gente = await loQueVeLaJefa();
    expect(quienes(gente, { empresa: kia })).toEqual([ana, benito, carla, elena].sort());
    expect(quienes(gente, { empresa: toyota })).toEqual([dario]);
  });

  it('por sede: los de esa sede y los de su empresa sin sede', async () => {
    const gente = await loQueVeLaJefa();
    expect(quienes(gente, { empresa: kia, sede: kia212 })).toEqual([ana, carla, elena].sort());
    expect(quienes(gente, { empresa: kia, sede: kiaCentro })).toEqual([benito, carla].sort());
  });

  it('buscar el texto de una funcion trae solo a quien la tiene, sin mayusculas ni tildes', async () => {
    const gente = await loQueVeLaJefa();
    expect(quienes(gente, { texto: 'CONCILIACION' })).toEqual([dario]);
    expect(quienes(gente, { empresa: kia, texto: 'cierre' })).toEqual([benito, elena].sort());
  });

  it('la supervisora filtra a su gente y nunca aparece la vecina', async () => {
    const gente = await loQueVeAna();
    expect(gente.map((p) => p.id).sort()).toEqual([benito, carla, dario].sort());
    expect(quienes(gente, { empresa: kia })).toEqual([benito, carla].sort());
    expect(quienes(gente, { empresa: kia, sede: kia212 })).toEqual([carla]);
    expect(quienes(gente, { texto: 'elena' })).toEqual([]);
    expect(quienes(gente, { texto: 'cierre de caja' })).toEqual([]);
  });
});

describe('INV-30: la sede de una persona siempre es de su empresa', () => {
  it('dar de alta con una sede de otra empresa se rechaza', async () => {
    const { error } = await jefa.rpc('dar_de_alta', {
      el_nombre: 'FABIO',
      el_correo: 'fabio@prueba.test',
      la_empresa: toyota,
      la_sede: kia212,
    });
    expect(error).not.toBeNull();
  });

  it('dar de alta sin empresa se rechaza', async () => {
    const { error } = await jefa.rpc('dar_de_alta', { el_nombre: 'GIL', el_correo: 'gil@prueba.test', la_empresa: null });
    expect(error).not.toBeNull();
  });

  it('editar a una sede de otra empresa, o cambiar de empresa conservando la sede, se rechaza', async () => {
    const editar = (la_empresa: string, la_sede: string | null) =>
      jefa.rpc('editar_empleado', { el_empleado: benito, el_nombre: 'BENITO', el_correo: 'benito@prueba.test', la_empresa, la_sede });
    expect((await editar(toyota, kiaCentro)).error).not.toBeNull();
    // Cambiar de empresa sin sede la deja limpia.
    expect((await editar(toyota, null)).error).toBeNull();
    expect((await editar(kia, kiaCentro)).error).toBeNull();
  });

  it('ni la llave de servicio deja una sede cruzada', async () => {
    const { error } = await comoServicio().from('empleado').update({ empresa_id: toyota }).eq('id', ana);
    expect(error).not.toBeNull();

    const { data } = await comoServicio().from('empleado').select('empresa_id, sede(empresa_id)').not('sede_id', 'is', null);
    for (const e of data as unknown as { empresa_id: string; sede: { empresa_id: string } }[]) {
      expect(e.sede.empresa_id).toBe(e.empresa_id);
    }
  });
});

describe('INV-31: solo el administrador escribe la empresa y la sede de alguien', () => {
  it('ni un empleado ni una supervisora la cambian, por la base ni por las funciones', async () => {
    for (const sesion of [sesionElena, sesionAna]) {
      for (const quien of [elena, benito]) {
        const { data } = await sesion.from('empleado').update({ empresa_id: toyota, sede_id: null }).eq('id', quien).select();
        expect(data ?? []).toEqual([]);
        const { error } = await sesion.rpc('editar_empleado', {
          el_empleado: quien,
          el_nombre: 'X',
          el_correo: 'x@prueba.test',
          la_empresa: toyota,
        });
        expect(error).not.toBeNull();
      }
      expect((await sesion.from('sede').insert({ empresa_id: kia, nombre: 'Intrusa' }).select()).data ?? []).toEqual([]);
    }

    const { data } = await comoServicio().from('empleado').select('id, empresa_id, sede_id').in('id', [elena, benito]).order('nombre_bloque');
    expect(data).toEqual([
      { id: benito, empresa_id: kia, sede_id: kiaCentro },
      { id: elena, empresa_id: kia, sede_id: kia212 },
    ]);
  });

  it('el administrador la cambia y queda', async () => {
    const { error } = await jefa.rpc('editar_empleado', {
      el_empleado: carla,
      el_nombre: 'CARLA',
      el_correo: 'carla@prueba.test',
      la_empresa: kia,
      la_sede: kiaCentro,
    });
    expect(error).toBeNull();
    const { data } = await comoServicio().from('empleado').select('empresa_id, sede_id').eq('id', carla).single();
    expect(data).toEqual({ empresa_id: kia, sede_id: kiaCentro });
  });
});
