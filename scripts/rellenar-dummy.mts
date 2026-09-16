// Rellena la COPIA del documento con importancia y periodicidad de prueba, para
// poder ver la aplicacion funcionando antes de que JFS puntue de verdad.
//
//   pnpm dummy                 -> dice que escribiria, no toca nada
//   pnpm dummy --confirmar     -> lo escribe
//
// Escribe DOS columnas y nada mas: Importante y Urgente. No toca INDICADORES,
// PONDERACION, MONTO ni ASIGNACION. Esto no es parte del producto: es un andamio
// para la demo, y se borra cuando el documento tenga sus propios valores.
import { readFileSync } from 'node:fs';
import { credenciales, escribirCeldas, leerPestana, letraDeColumna, pestanas, type Celda } from './hoja.mts';

const confirmar = process.argv.includes('--confirmar');

function entorno(clave: string): string {
  const secretos = readFileSync(new URL('../apps/web/.env.local', import.meta.url), 'utf8');
  const linea = secretos.split('\n').find((l) => l.startsWith(`${clave}=`));
  if (!linea) throw new Error(`Falta ${clave} en apps/web/.env.local`);
  return linea.slice(clave.length + 1).trim();
}

const documentoId = entorno('DOCUMENTO_ID');
const cuenta = credenciales(entorno('GOOGLE_CREDENCIALES'));

const COL_IMPORTANTE = 3;
const COL_URGENTE = 4;
const COL_INDICADOR = 1;
const COL_PONDERACION = 5;

const esEncabezado = (fila: string[] | undefined) =>
  (fila?.[COL_INDICADOR] ?? '').trim().toUpperCase().startsWith('INDICADOR');

// La cadencia ya esta escrita en el nombre, en prosa. Cuando se deja leer, se
// respeta; cuando no, se reparte para que la demo tenga las cinco.
function periodicidadDe(texto: string, ponderacion: number): string {
  const t = texto.toUpperCase();
  if (/TRIMESTRAL/.test(t)) return 'trimestral';
  if (/15 D[IÍ]AS|QUINCEN/.test(t)) return 'quincenal';
  if (/CADA MES|MENSUAL|VEZ AL MES|FECHA TOPE/.test(t)) return 'mensual';
  if (/SEMANAL|CADA SEMANA/.test(t)) return 'semanal';
  if (/URGENTES|DIARI|CAJA CHICA|RECEPCION/.test(t)) return 'diaria';
  // Sin pista en el texto, nunca "diaria": este documento es de pagos,
  // declaraciones y cierres, y una funcion de verdad diaria casi siempre es un
  // flujo, no un entregable. Ponerla diaria convertia un pago de condominio en
  // una tarea de todos los dias.
  if (ponderacion >= 20) return 'mensual';
  if (ponderacion >= 10) return 'semanal';
  return 'mensual';
}

// La ponderacion es lo unico real que hay, asi que hace de sombra de la
// importancia. Con un poco de varianza estable por el texto: si la importancia
// fuera una funcion exacta del peso, todo caeria en el mismo cuadrante y la
// pantalla no mostraria lo que sabe hacer.
const importanciaDe = (ponderacion: number, texto: string) => {
  const base = ponderacion >= 25 ? 7 : ponderacion >= 15 ? 6 : ponderacion >= 10 ? 5 : ponderacion >= 5 ? 4 : 3;
  const varianza = [...texto].reduce((t, c) => t + c.charCodeAt(0), 0) % 4;
  return Math.min(9, base + varianza);
};

const celdas: Celda[] = [];
const resumen: Record<string, number> = {};

for (const hoja of await pestanas(documentoId, cuenta)) {
  const filas = await leerPestana(documentoId, hoja, cuenta);
  const rango = (columna: number, fila: number) => `'${hoja}'!${letraDeColumna(columna)}${fila + 1}`;

  for (const [n, fila] of filas.entries()) {
    if (esEncabezado(fila)) {
      // Sin encabezado, el lector no mira esas columnas aunque tengan valores.
      if ((fila[COL_IMPORTANTE] ?? '').trim() !== 'Importante')
        celdas.push({ rango: rango(COL_IMPORTANTE, n), valor: 'Importante' });
      if ((fila[COL_URGENTE] ?? '').trim() !== 'Urgente')
        celdas.push({ rango: rango(COL_URGENTE, n), valor: 'Urgente' });
      continue;
    }

    const texto = (fila[COL_INDICADOR] ?? '').trim();
    const ponderacion = Number((fila[COL_PONDERACION] ?? '').trim());
    // Solo filas de datos: con texto, con ponderacion, y que no sean el nombre
    // del bloque siguiente.
    if (!texto || !ponderacion || esEncabezado(filas[n + 1])) continue;

    const periodicidad = periodicidadDe(texto, ponderacion);
    resumen[periodicidad] = (resumen[periodicidad] ?? 0) + 1;

    celdas.push({ rango: rango(COL_IMPORTANTE, n), valor: String(importanciaDe(ponderacion, texto)) });
    celdas.push({ rango: rango(COL_URGENTE, n), valor: periodicidad });
  }
}

console.log(`\nDocumento: ${documentoId}`);
console.log(`Celdas a escribir: ${celdas.length} (solo columnas Importante y Urgente)`);
console.log('Reparto de periodicidades:');
for (const [p, cuantas] of Object.entries(resumen).sort((a, b) => b[1] - a[1]))
  console.log(`  ${p.padEnd(11)} ${cuantas}`);

if (!confirmar) {
  console.log('\nNada se escribió. Repite con --confirmar.\n');
  process.exit(0);
}

console.log(`\nEscritas ${await escribirCeldas(documentoId, celdas, cuenta)} celdas.\n`);
