// Importar el documento (CEB-111). A demanda, sin scheduler:
//
//   pnpm importar funciones.tsv            -> muestra los cambios, no toca nada
//   pnpm importar funciones.tsv --confirmar -> los aplica
//
// El TSV sale de exportar la hoja de funciones tal cual, con sus bloques y sus
// celdas combinadas: el lector se encarga de esa forma. Las columnas MONTO,
// ASIGNACION y CLASIFICACION no se importan (ADR 0001) y el sueldo nunca sale
// del documento.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { identidadDe, leerBloques, reconciliar } from '@matriz/dominio';
import type { FilaDelDocumento, FuncionExistente } from '@matriz/dominio';

const [archivo, ...banderas] = process.argv.slice(2);
const confirmar = banderas.includes('--confirmar');

if (!archivo) {
  console.error('Uso: pnpm importar <archivo.tsv> [--confirmar]');
  process.exit(1);
}

// Las credenciales se leen, nunca se imprimen.
function entorno(clave: string): string {
  const desdeElProceso = process.env[clave];
  if (desdeElProceso) return desdeElProceso;

  const secretos = readFileSync(new URL('../apps/web/.env.local', import.meta.url), 'utf8');
  const linea = secretos.split('\n').find((l) => l.startsWith(`${clave}=`));
  if (!linea) throw new Error(`Falta ${clave} en apps/web/.env.local`);
  return linea.slice(clave.length + 1).trim();
}

// service_role se salta la seguridad por fila: esto no corre en el servidor web,
// corre a mano y solo aqui (ADR 0004).
const supabase = createClient(
  entorno('NEXT_PUBLIC_SUPABASE_URL'),
  entorno('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } },
);

const cuadricula = readFileSync(archivo, 'utf8')
  .split('\n')
  .map((linea) => linea.split('\t'));

const { data: empleados } = await supabase.from('empleado').select('id, nombre_bloque');
const porBloque = Object.fromEntries((empleados ?? []).map((e) => [e.nombre_bloque, e.id]));

const { filas, bloquesDesconocidos, bloquesAmbiguos } = leerBloques(cuadricula, porBloque);

const { data: actuales } = await supabase
  .from('funcion')
  .select('id, hash_identidad, periodicidad, ponderacion, importancia, dia_tope_generado, dia_tope_corregido')
  .eq('activa', true);

const existentes: FuncionExistente[] = (actuales ?? []).map((f) => ({
  identidad: f.hash_identidad,
  periodicidad: f.periodicidad,
  ponderacion: f.ponderacion,
  importancia: f.importancia,
  diaTope: f.dia_tope_corregido ?? f.dia_tope_generado ?? undefined,
}));

const { altas, cambios, bajas } = reconciliar(existentes, filas);

console.log(`\nLeídas ${filas.length} funciones de ${Object.keys(porBloque).length} bloques conocidos.`);
if (bloquesDesconocidos.length) console.log(`  Bloques que no existen en la base: ${bloquesDesconocidos.join(', ')}`);
if (bloquesAmbiguos.length) console.log(`  Bloques con el nombre repetido, sin importar: ${bloquesAmbiguos.join(', ')}`);

console.log(`\n  ${altas.length} nuevas`);
for (const f of altas) console.log(`    + ${f.nombre}`);
console.log(`  ${cambios.length} cambiadas`);
for (const c of cambios) console.log(`    ~ ${c.fila.nombre}`);
console.log(`  ${bajas.length} desaparecidas`);
for (const id of bajas) console.log(`    - ${id}`);

// Un renombre se ve como una baja y un alta; confirmarlo es de una persona, y
// no hay heuristica de similitud que lo adivine.
if (altas.length && bajas.length) {
  console.log('\n  Ojo: hay altas y bajas a la vez. Si alguna es un renombre, arréglalo a mano.');
}

if (!confirmar) {
  console.log('\nNada se guardó. Repite con --confirmar para aplicarlo.\n');
  process.exit(0);
}

// El tipo lo propone el agente (CEB-114); sin el, la fila queda sin tipo,
// fuera del plan y a la vista de quien importa.
const paraInsertar = altas.map((f: FilaDelDocumento) => ({
  empleado_id: f.empleadoId,
  hash_identidad: identidadDe(f),
  texto: f.nombre,
  ponderacion: f.ponderacion ?? 0,
  importancia: f.importancia ?? 0,
  periodicidad: f.periodicidad ?? 'mensual',
}));

if (paraInsertar.length) {
  const { error } = await supabase.from('funcion').insert(paraInsertar);
  if (error) throw error;
}

for (const c of cambios) {
  const { error } = await supabase
    .from('funcion')
    .update({
      ponderacion: c.fila.ponderacion ?? 0,
      importancia: c.fila.importancia ?? 0,
      periodicidad: c.fila.periodicidad ?? 'mensual',
    })
    .eq('hash_identidad', c.identidad);
  if (error) throw error;
}

// Lo que desaparecio del documento se archiva, nunca se borra: sus marcas
// siguen siendo ciertas.
for (const identidad of bajas) {
  const { error } = await supabase.from('funcion').update({ activa: false }).eq('hash_identidad', identidad);
  if (error) throw error;
}

console.log(`\nListo: ${altas.length} altas, ${cambios.length} cambios, ${bajas.length} archivadas.\n`);
