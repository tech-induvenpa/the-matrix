// Pestana de razones (CEB-116). Proyeccion, no persistencia: se regenera
// entera desde la base.
//
//   pnpm razones              -> dice que escribiria, no toca nada
//   pnpm razones --confirmar  -> la regenera
//
// Es lo unico que la aplicacion escribe en el documento. Solo lleva lo que el
// empleado escribio con sus palabras: ningun numero calculado vuelve a la
// hoja, porque entonces el documento dejaria de ser el formulario de entrada
// y pasaria a ser una pantalla del sistema (ADR 0001).
import { createClient } from '@supabase/supabase-js';
import { razonesParaElDocumento } from '@matriz/dominio';
import { credenciales, crearPestanaSiFalta, escribirFilas, limpiarRango } from '../apps/web/src/lib/hoja.ts';
import { entorno } from './entorno.mts';

const confirmar = process.argv.includes('--confirmar');
const PESTANA = 'RAZONES';


const supabase = createClient(entorno('NEXT_PUBLIC_SUPABASE_URL'), entorno('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

const [{ data: marcas }, { data: eventos }, { data: funciones }, { data: empleados }] = await Promise.all([
  supabase.from('marca').select('funcion_id, periodo, resultado, razon, marcada_en').not('razon', 'is', null),
  supabase.from('evento_flujo').select('funcion_id, estado, razon, en').not('razon', 'is', null),
  supabase.from('funcion').select('id, texto, empleado_id'),
  supabase.from('empleado').select('id, nombre_bloque'),
]);

const funcionPor = new Map((funciones ?? []).map((f) => [f.id, f]));
const empleadoPor = new Map((empleados ?? []).map((e) => [e.id, e.nombre_bloque]));

const razones = razonesParaElDocumento(
  (marcas ?? []).map((m) => ({
    funcionId: m.funcion_id,
    periodo: m.periodo,
    resultado: m.resultado as 'hecho' | 'no_pude',
    razon: m.razon ?? undefined,
    en: m.marcada_en,
  })),
  (eventos ?? []).map((e) => ({
    funcionId: e.funcion_id,
    estado: e.estado as 'al_dia' | 'atrasado',
    razon: e.razon ?? undefined,
    en: e.en,
  })),
);

// Lo mas nuevo arriba, y una columna por cosa que JFS necesita saber.
const ENCABEZADO = ['FECHA', 'PERSONA', 'FUNCIÓN', 'QUÉ PASÓ', 'RAZÓN'];

const filas = razones.map((r) => {
  const funcion = funcionPor.get(r.funcionId);
  return [
    r.en,
    empleadoPor.get(funcion?.empleado_id ?? '') ?? '',
    funcion?.texto ?? '',
    r.periodo ? 'no pude' : 'me atrasé',
    r.razon,
  ];
});

console.log(`\n${filas.length} razones para la pestaña "${PESTANA}"`);
for (const f of filas.slice(0, 6)) console.log(`  ${f[0]}  ${f[1]?.slice(0, 14).padEnd(16)} ${f[4]?.slice(0, 46)}`);
if (filas.length > 6) console.log(`  … y ${filas.length - 6} más`);

if (!confirmar) {
  console.log('\nNada se escribió. Repite con --confirmar.\n');
  process.exit(0);
}

const documentoId = entorno('DOCUMENTO_ID');
const cuenta = credenciales(entorno('GOOGLE_CREDENCIALES'));

if (await crearPestanaSiFalta(documentoId, PESTANA, cuenta)) console.log(`Pestaña "${PESTANA}" creada.`);

// Se regenera entera: primero se limpia lo de la vuelta anterior.
await limpiarRango(documentoId, `${PESTANA}!A:E`, cuenta);
const celdas = await escribirFilas(documentoId, `${PESTANA}!A1`, [ENCABEZADO, ...filas], cuenta);

console.log(`\n${celdas} celdas escritas. Ninguna fuera de "${PESTANA}".\n`);
