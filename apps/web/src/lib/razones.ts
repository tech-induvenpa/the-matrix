import { createClient } from '@supabase/supabase-js';
import { razonesParaElDocumento } from '@matriz/dominio';
import { credencialesDelEntorno, crearPestanaSiFalta, escribirFilas, limpiarRango } from '@/lib/hoja';

// Proyeccion, no persistencia (CEB-116): la pestana se regenera entera desde la
// base. Por eso una falla no se acumula: la siguiente regeneracion la corrige
// sola, sin llevar cuenta de lo que quedo pendiente.
const PESTANA = 'RAZONES';
const ENCABEZADO = ['FECHA', 'PERSONA', 'FUNCIÓN', 'QUÉ PASÓ', 'RAZÓN'];

// service_role: la pestana es de JFS y lleva las razones de todo el equipo, no
// las de quien acaba de marcar. Esto nunca se expone en una respuesta.
const servicio = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

export async function proyectarRazones(): Promise<void> {
  const supabase = servicio();

  const [{ data: marcas }, { data: eventos }, { data: funciones }, { data: empleados }] =
    await Promise.all([
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

  const documentoId = process.env.DOCUMENTO_ID!;
  const cuenta = credencialesDelEntorno();

  await crearPestanaSiFalta(documentoId, PESTANA, cuenta);
  await limpiarRango(documentoId, `${PESTANA}!A:E`, cuenta);
  await escribirFilas(documentoId, `${PESTANA}!A1`, [ENCABEZADO, ...filas], cuenta);
}
