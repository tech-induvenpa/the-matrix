// Importar el documento (CEB-111). A demanda, sin scheduler:
//
//   pnpm importar --pestanas                      -> que hojas tiene el documento
//   pnpm importar --hoja "FUNCIONES"              -> muestra los cambios, no toca nada
//   pnpm importar --hoja "FUNCIONES" --confirmar  -> los aplica
//   pnpm importar funciones.tsv                   -> lo mismo desde un TSV exportado
//
// Banderas: --tipificar pide el tipo al agente (CEB-114), --crear-empleados
// siembra los bloques que no existen con un correo inventado, y
// --tipos-de-prueba deduce el tipo del texto sin llamar a ningun modelo.
//
// El lector se encarga de los bloques y las celdas combinadas. Las columnas
// MONTO, ASIGNACION y CLASIFICACION no se importan (ADR 0001): el sueldo nunca
// sale del documento.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { identidadDe, interpretar, leerBloques, normalizar, reconciliar } from '@matriz/dominio';
import type { FilaDelDocumento, FuncionExistente } from '@matriz/dominio';
import { credenciales, leerPestana, pestanas } from '../apps/web/src/lib/hoja.ts';
import { tipificadorRemoto } from './tipificador.mts';
import { entorno } from './entorno.mts';

const argumentos = process.argv.slice(2);
const confirmar = argumentos.includes('--confirmar');
const crearEmpleados = argumentos.includes('--crear-empleados');
const tiposDePrueba = argumentos.includes('--tipos-de-prueba');
const tipificar = argumentos.includes('--tipificar');

const PERIODICIDADES = ['diaria', 'semanal', 'quincenal', 'mensual', 'trimestral'];

// Andamio de demo: el tipo lo propone el agente (CEB-114). Mientras no haya
// clave, se deduce del texto para poder ver la aplicacion llena. La propuesta
// pasa por interpretar(), la misma puerta que usara el agente de verdad.
function propuestaDePrueba(texto: string) {
  const t = texto.toUpperCase();
  const tipo = /URGENTES|IMPREVISTO/.test(t)
    ? 'holgura'
    : /ASISTENCIA A LA GERENCIA|GESTION ADMINISTRATIVA|LOGISTICA|VALIDACION DE LOS PROCESOS|ESTUDIO DE MERCADO/.test(t)
      ? 'area'
      : /CUENTAS POR (PAGAR|COBRAR)|CONCILIACI|REGISTRO DE FACTURAS|DIGITALIZAR|SEGUIMIENTO|CONTROL DE|RECEPCION|FACTURACION|TESORERIA|CAJA CHICA|REVISAR|REVISION DE|COMPRAS DE/.test(t)
        ? 'flujo'
        : 'entregable';

  // La fecha tope tambien esta escrita en prosa dentro del nombre.
  const dia = t.match(/(?:ANTES DEL|FECHA TOPE(?: DE ENTREGA)?|ENTREGA EL)\s*(\d{1,2})/)?.[1];

  return interpretar({ tipo, diaTope: dia ? Number(dia) : undefined, confianza: 0.7 });
}
const soloPestanas = argumentos.includes('--pestanas');
const dondeHoja = argumentos.indexOf('--hoja');
const pestana = dondeHoja >= 0 ? argumentos[dondeHoja + 1] : undefined;
const archivo = argumentos.find((a) => !a.startsWith('--') && a !== pestana);


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
  console.error('Banderas: --tipificar, --crear-empleados, --tipos-de-prueba');
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

// El nombre del bloque se compara normalizado en los dos lados: en la hoja
// lleva espacios de mas y parentesis, y eso no puede decidir de quien es una
// funcion.
const { data: empleados } = await supabase.from('empleado').select('id, nombre_bloque');
const porBloque = Object.fromEntries((empleados ?? []).map((e) => [normalizar(e.nombre_bloque), e.id]));

let { filas, bloquesDesconocidos, bloquesAmbiguos } = leerBloques(cuadricula, porBloque);

// Datos de prueba: un bloque desconocido normalmente NO crea empleado (se
// lista y ya). Con --crear-empleados se siembran con un correo inventado, que
// es lo unico que falta para ver la aplicacion llena.
if (crearEmpleados && bloquesDesconocidos.length) {
  const correoDe = (bloque: string) =>
    `${bloque.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}@jfs.test`;

  const nuevos = bloquesDesconocidos.map((b) => ({ nombre_bloque: b, correo: correoDe(b) }));
  console.log(`
Creando ${nuevos.length} empleados de prueba:`);
  for (const e of nuevos) console.log(`    · ${e.nombre_bloque} → ${e.correo}`);

  if (confirmar) {
    const { error } = await supabase.from('empleado').insert(nuevos);
    if (error) throw error;
    const { data: todos } = await supabase.from('empleado').select('id, nombre_bloque');
    const actualizado = Object.fromEntries((todos ?? []).map((e) => [normalizar(e.nombre_bloque), e.id]));
    ({ filas, bloquesDesconocidos, bloquesAmbiguos } = leerBloques(cuadricula, actualizado));
  }
}

// Una hoja solo da de baja lo suyo. Comparar contra TODAS las funciones
// activas archivaba las de ADMINISTRACION al importar VENTAS: cada hoja veia
// al resto del documento como desaparecido.
// ponytail: el universo son los empleados con filas en esta hoja. Si a alguien
// le vacian todas sus filas, las suyas siguen activas hasta que su hoja lo
// vuelva a traer; archivarlas pediria saber que bloques trae la hoja aunque
// vengan vacios, y eso todavia no ha hecho falta.
const deEstaHoja = [...new Set(filas.map((f) => f.empleadoId))];

const { data: actuales } = await supabase
  .from('funcion')
  .select('id, hash_identidad, texto, periodicidad, ponderacion, importancia, dia_tope_generado, dia_tope_corregido')
  .eq('activa', true)
  .in('empleado_id', deEstaHoja);

const existentes: FuncionExistente[] = (actuales ?? []).map((f) => ({
  identidad: f.hash_identidad,
  periodicidad: f.periodicidad,
  ponderacion: f.ponderacion,
  importancia: f.importancia,
}));

const textoDe = new Map((actuales ?? []).map((f) => [f.hash_identidad, f.texto]));

// Una periodicidad que no existe no se corrige a ojo: la fila se queda fuera y
// se lista, para que se arregle donde se escribio.
const sinPeriodicidad = filas.filter((f) => !PERIODICIDADES.includes(f.periodicidad ?? ''));
filas = filas.filter((f) => PERIODICIDADES.includes(f.periodicidad ?? ''));

const { altas, cambios, bajas } = reconciliar(existentes, filas);

console.log(`\nLeídas ${filas.length} funciones de ${Object.keys(porBloque).length} bloques conocidos.`);
if (bloquesDesconocidos.length) console.log(`  Bloques que no existen en la base: ${bloquesDesconocidos.join(', ')}`);
if (bloquesAmbiguos.length) console.log(`  Bloques con el nombre repetido, sin importar: ${bloquesAmbiguos.join(', ')}`);
if (sinPeriodicidad.length) {
  console.log(`  ${sinPeriodicidad.length} filas sin periodicidad, fuera de la importación:`);
  for (const f of sinPeriodicidad.slice(0, 8)) console.log(`    ? ${f.nombre}`);
}

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

// El tipo lo propone el agente (CEB-114). Solo corre sobre filas nuevas, solo
// escribe los campos _generado, y una falla deja la fila sin tipo: fuera del
// plan y a la vista de quien importa.
const propuestas = new Map<string, ReturnType<typeof interpretar>>();

if (tipificar && altas.length) {
  const agente = tipificadorRemoto({
    clave: entorno('AGENTE_API_KEY'),
    modelo: entorno('AGENTE_MODELO'),
    url: entorno('AGENTE_URL'),
  });

  console.log(`\nTipificando ${altas.length} funciones nuevas...`);
  for (const f of altas) {
    try {
      propuestas.set(f.nombre, interpretar(await agente.proponer(f.nombre)));
    } catch (fallo) {
      console.log(`    ! ${f.nombre.slice(0, 50)} — ${(fallo as Error).message.slice(0, 80)}`);
    }
  }

  const sinTipo = altas.length - [...propuestas.values()].filter((p) => p.acepta).length;
  if (sinTipo) console.log(`  ${sinTipo} quedan sin tipo y fuera del plan hasta que alguien las revise.`);
}

const paraInsertar = altas.map((f: FilaDelDocumento) => {
  const propuesta = propuestas.get(f.nombre) ?? (tiposDePrueba ? propuestaDePrueba(f.nombre) : undefined);
  return {
    empleado_id: f.empleadoId,
    hash_identidad: identidadDe(f),
    texto: f.nombre,
    ponderacion: f.ponderacion ?? 0,
    importancia: f.importancia ?? 0,
    periodicidad: f.periodicidad!,
    tipo_generado: propuesta?.acepta ? propuesta.tipo : null,
    dia_tope_generado: propuesta?.acepta ? (propuesta.diaTope ?? null) : null,
  };
});

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
      periodicidad: c.fila.periodicidad!,
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
