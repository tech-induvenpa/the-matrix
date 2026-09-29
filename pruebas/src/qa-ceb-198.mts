// QA de CEB-198 sobre la web real: `next start` contra el Supabase local, con
// sesiones de verdad canjeadas por /auth/confirmar. Siembra, comenta como cada
// quien y mira en el HTML que perfil, punto, lista y "lo que pedi" salgan a
// quien corresponde.
// Uso: WEB=http://localhost:3198 npx tsx pruebas/src/qa-ceb-198.mts
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

const WEB = process.env.WEB ?? 'http://localhost:3198';
const servicio = comoServicio();
const mes = new Date().toISOString().slice(0, 7);
const hoy = new Date().toISOString().slice(0, 10);

await vaciar();
const ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
const bruno = await sembrarEmpleado('BRUNO', 'bruno@prueba.test');
const sara = await sembrarEmpleado('SARA', 'sara@prueba.test');
const sofia = await sembrarEmpleado('SOFIA', 'sofia@prueba.test');
await servicio.from('empleado').update({ supervisor_id: sara }).eq('id', ana);
await servicio.from('empleado').update({ supervisor_id: sofia }).eq('id', bruno);

const f = (texto: string) => ({ hash_identidad: `h-${texto}`, texto, importancia: 5, periodicidad: 'mensual', tipo_generado: 'entregable', fecha_alta: '2026-01-01' });
const caja = await sembrarFuncion(ana, f('Cierre de caja'));
const conciliacion = await sembrarFuncion(ana, f('Conciliacion'));

const jefa = await comoAdministrador('jefa@prueba.test');
const sAna = await comoEmpleado('ana@prueba.test');
await comoEmpleado('bruno@prueba.test');
const sSara = await comoEmpleado('sara@prueba.test');
const sSofia = await comoEmpleado('sofia@prueba.test');
const uid = async (s: typeof jefa) => (await s.auth.getUser()).data.user!.id;

const { data: pedido, error: sinPedido } = await servicio
  .from('imprevisto')
  .insert({ empleado_id: ana, texto: 'Pedido de Sofia', vence: hoy, pedido_por: await uid(sSofia), registrado_por: await uid(sSofia) })
  .select('id')
  .single();
if (sinPedido) throw sinPedido;

await sSara.from('comentario').insert({ funcion_id: caja, periodo: mes, texto: 'COMENTARIO-DE-SARA' });
await jefa.from('comentario').insert({ funcion_id: caja, periodo: mes, texto: 'COMENTARIO-DE-LA-JEFA' });
await sAna.from('comentario').insert({ funcion_id: conciliacion, periodo: mes, texto: 'ANTES-DE-MARCAR' });
await sAna.from('marca').insert({ funcion_id: conciliacion, periodo: mes, resultado: 'hecho' });

async function sesion(correo: string): Promise<string> {
  const { data, error } = await servicio.auth.admin.generateLink({ type: 'magiclink', email: correo });
  if (error) throw error;
  const r = await fetch(`${WEB}/auth/confirmar?token_hash=${data.properties.hashed_token}&type=magiclink`, { redirect: 'manual' });
  const cookies = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  if (!cookies) throw new Error(`Sin sesion para ${correo}: ${r.status}`);
  return cookies;
}

const pagina = async (cookie: string, ruta: string) => (await fetch(`${WEB}${ruta}`, { headers: { cookie }, redirect: 'manual' })).text();

let fallos = 0;
function criterio(nombre: string, ok: boolean) {
  if (!ok) fallos++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${nombre}`);
}

const deCaja = `o:${caja}:${mes}`;
const PUNTO = 'comentarios sin leer';
const [cAna, cBruno, cSara, cSofia, cJefa] = await Promise.all(
  ['ana', 'bruno', 'sara', 'sofia', 'jefa'].map((n) => sesion(`${n}@prueba.test`)),
);

let html = await pagina(cAna, '/');
criterio('ana: la tarjeta abre su perfil por la URL', html.includes(`tarea=${encodeURIComponent(deCaja)}`));
criterio('ana: el imprevisto tambien abre su perfil', html.includes(`tarea=${encodeURIComponent(`i:${pedido!.id}`)}`));
criterio('ana: punto de sin leer en su tarjeta', html.includes(PUNTO));
criterio('ana: cerrado, el perfil no se pinta', !html.includes('COMENTARIO-DE-SARA'));

html = await pagina(cAna, `/?tarea=${deCaja}`);
criterio('ana: abierto, la historia con los comentarios en orden', html.indexOf('COMENTARIO-DE-SARA') > 0 && html.indexOf('COMENTARIO-DE-SARA') < html.indexOf('COMENTARIO-DE-LA-JEFA'));
criterio('ana: sabe quien lo lee', html.includes('Lo leen: ANA, SARA y el administrador'));
criterio('ana: puede comentar', html.includes('Escribe un comentario'));

html = await pagina(cAna, `/?tarea=i:${pedido!.id}`);
criterio('ana: el imprevisto dice quien lo pidio y quien lo lee', html.includes('Lo pidió SOFIA') && html.includes('Lo leen: ANA, SARA, SOFIA y el administrador'));

html = await pagina(cAna, `/mes?tarea=o:${conciliacion}:${mes}`);
criterio('ana: una tarea marcada se abre desde el mes y solo se lee', html.includes('ANTES-DE-MARCAR') && html.includes('✅') && !html.includes('Escribe un comentario'));

html = await pagina(cBruno, `/?tarea=${deCaja}`);
criterio('bruno: no lee lo de ana aunque ponga la URL', !html.includes('COMENTARIO-DE-SARA'));

html = await pagina(cSara, '/equipo');
criterio('sara: la lista por persona trae ocurrencias e imprevistos', html.includes('Sus tareas abiertas') && html.includes('Cierre de caja') && html.includes('Pedido de Sofia'));
criterio('sara: desde la lista no se marca ni se delega', !html.includes('¡Hecho!') && !html.includes('aria-label="Delegar"'));
criterio('sara: punto junto a ana por el comentario de la jefa', html.includes(PUNTO));

html = await pagina(cSara, `/equipo?tarea=${deCaja}`);
criterio('sara: abre el perfil desde el equipo y comenta', html.includes('COMENTARIO-DE-LA-JEFA') && html.includes('Escribe un comentario'));

html = await pagina(cSofia, '/');
// React separa el texto fijo de lo interpolado con un comentario.
criterio('sofia: lo que pidio fuera de su equipo', html.includes('Lo que pedí') && /Se lo pediste a (<!-- -->)?ANA/.test(html));

html = await pagina(cJefa, '/admin');
criterio('jefa: punto junto a ana', html.includes(PUNTO));
html = await pagina(cJefa, `/admin/${ana}?tarea=${deCaja}`);
criterio('jefa: la ficha trae la lista y el perfil', html.includes('Sus tareas abiertas') && html.includes('COMENTARIO-DE-SARA'));

console.log(fallos ? `\n${fallos} criterios fallaron` : '\nTodo en orden');
process.exit(fallos ? 1 : 0);
