// Importar el documento (CEB-111). A demanda, sin scheduler:
//
//   pnpm importar --pestanas                      -> que hojas tiene el documento
//   pnpm importar --hoja "FUNCIONES"              -> muestra los cambios, no toca nada
//   pnpm importar --hoja "FUNCIONES" --confirmar  -> los aplica
//   pnpm importar funciones.tsv                   -> lo mismo desde un TSV exportado
//
// El lector se encarga de los bloques y las celdas combinadas. Las columnas
// MONTO, ASIGNACION y CLASIFICACION no se importan (ADR 0001): el sueldo nunca
// sale del documento.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { identidadDe, leerBloques, reconciliar } from '@matriz/dominio';
import type { FilaDelDocumento, FuncionExistente } from '@matriz/dominio';
import { credenciales, leerPestana, pestanas } from './hoja.mts';

const argumentos = process.argv.slice(2);
const confirmar = argumentos.includes('--confirmar');
const soloPestanas = argumentos.includes('--pestanas');
const dondeHoja = argumentos.indexOf('--hoja');
const pestana = dondeHoja >= 0 ? argumentos[dondeHoja + 1] : undefined;
const archivo = argumentos.find((a) => !a.startsWith('--') && a !== pestana);

// Las credenciales se leen, nunca se imprimen.
function entorno(clave: string): string {
  const desdeElProceso = process.env[clave];
  if (desdeElProceso) return desdeElProceso;

  const secretos = readFileSync(new URL('../apps/web/.env.local', import.meta.url), 'utf8');
  const linea = secretos.split('\n').find((l) => l.startsWith(`${clave}=`));
  if (!linea) throw new Error(`Falta ${clave} en apps/web/.env.local`);
  return linea.slice(clave.length + 1).trim();
}

const documento = () => ({
  id: entorno('DOCUMENTO_ID'),
  cuenta: credenciales(entorno('GOOGLE_CREDENCIALES')),
});

if (soloPestanas) {
  const { id, cuenta } = documento();
  for (const nombre of await pestanas(id, cuenta)) console.log(`  · ${nombre}`);
  process.exit(0);
}

if (!pestana && !archivo) {
  console.error('Uso: pnpm importar --hoja "<pestaña>" | <archivo.tsv> [--confirmar]');
  console.error('     pnpm importar --pestanas');
  process.exit(1);
}

const cuadricula = pestana
  ? await (async () => {
      const { id, cuenta } = documento();
      return leerPestana(id, pestana, cuenta);
    })()
  : readFileSync(archivo!, 'utf8')
      .split('\n')
      .map((linea) => linea.split('\t'));

// service_role se salta la seguridad por fila: esto no corre en el servidor web,
// corre a mano y solo aqui (ADR 0004).
const supabase = createClient(
  entorno('NEXT_PUBLIC_SUPABASE_URL'),
  entorno('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } },
);

const { data: empleados } = await supabase.from('empleado').select('id, nombre_bloque');
const porBloque = Object.fromEntries((empleados ?? []).map((e) => [e.nombre_bloque, e.id]));

const { filas, bloquesDesconocidos, bloquesAmbiguos } = leerBloques(cuadricula, porBloque);

const { data: actuales } = await supabase
  .from('funcion')
  .select('id, hash_identidad, texto, periodicidad, ponderacion, importancia, dia_tope_generado, dia_tope_corregido')
  .eq('activa', true);

const existentes: FuncionExistente[] = (actuales ?? []).map((f) => ({
  identidad: f.hash_identidad,
  periodicidad: f.periodicidad,
  ponderacion: f.ponderacion,
  importancia: f.importancia,
  diaTope: f.dia_tope_corregido ?? f.dia_tope_generado ?? undefined,
}));

const textoDe = new Map((actuales ?? []).map((f) => [f.hash_identidad, f.texto]));
const { altas, cambios, bajas } = reconciliar(existentes, filas);

console.log(`\nLeídas ${filas.length} funciones de ${Object.keys(porBloque).length} bloques conocidos.`);
if (bloquesDesconocidos.length) console.log(`  Bloques que no existen en la base: ${bloquesDesconocidos.join(', ')}`);
if (bloquesAmbiguos.length) console.log(`  Bloques con el nombre repetido, sin importar: ${bloquesAmbiguos.join(', ')}`);

console.log(`\n  ${altas.length} nuevas`);
for (const f of altas) console.log(`    + ${f.nombre}`);
console.log(`  ${cambios.length} cambiadas`);
for (const c of cambios) console.log(`    ~ ${c.fila.nombre}`);
console.log(`  ${bajas.length} desaparecidas`);
for (const id of bajas) console.log(`    - ${textoDe.get(id) ?? id}`);

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
