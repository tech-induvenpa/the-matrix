// QA de CEB-215 sobre la web real: `next dev` o `next start` contra el Supabase
// local, con sesiones de verdad canjeadas por /auth/confirmar. Siembra un
// equipo con un entregable arrastrado, un flujo atrasado y una funcion al dia,
// y mira en el HTML que cada quien vea lo suyo: pesos al supervisor, montos
// solo al administrador.
// Uso: WEB=http://localhost:3215 npx tsx pruebas/src/qa-ceb-215.mts
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

const WEB = process.env.WEB ?? 'http://localhost:3215';
const servicio = comoServicio();
const hoy = new Date().toISOString().slice(0, 10);
const haceDias = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

await vaciar();
const ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
const bruno = await sembrarEmpleado('BRUNO', 'bruno@prueba.test');
const sara = await sembrarEmpleado('SARA', 'sara@prueba.test');
const carla = await sembrarEmpleado('CARLA', 'carla@prueba.test');
// Sin funciones ni nada abierto: no aparece en ninguna grafica.
await sembrarEmpleado('DORA', 'dora@prueba.test');
await servicio.from('empleado').update({ supervisor_id: sara }).in('id', [ana, bruno]);
await servicio.from('bono').insert([
  { empleado_id: ana, monto: 1234, rige_desde: '2026-01-01' },
  { empleado_id: carla, monto: 999, rige_desde: '2026-01-01' },
]);

const funcion = (texto: string, tipo: string, periodicidad = 'mensual') => ({
  hash_identidad: `h-${texto}`,
  texto,
  importancia: 5,
  periodicidad,
  tipo_generado: tipo,
  fecha_alta: '2026-01-01',
});
// Un entregable mensual sin cumplir desde hace meses: arrastra.
const cierre = await sembrarFuncion(ana, { ...funcion('Cierre contable', 'entregable'), ponderacion: 30 });
// Un flujo atrasado, con su razon.
const facturas = await sembrarFuncion(ana, { ...funcion('Facturas', 'flujo'), ponderacion: 20 });
// Una funcion que nacio hoy: todavia no vence nada, esta al dia.
const nueva = await sembrarFuncion(ana, { ...funcion('Informe nuevo', 'entregable'), ponderacion: 10, fecha_alta: hoy });
await sembrarFuncion(carla, { ...funcion('Lo de Carla', 'entregable'), ponderacion: 45 });
// Otra cadencia: una semanal de bruno sin cumplir en todo septiembre.
const semanal = await sembrarFuncion(bruno, { ...funcion('Reporte semanal', 'entregable', 'semanal'), ponderacion: 15 });
await servicio.from('titularidad').update({ desde: '2026-09-01' }).eq('funcion_id', semanal);
// Las tenencias vienen de antes: el arrastre empieza cuando empezo a tenerla.
await servicio.from('titularidad').update({ desde: '2026-06-01' }).in('funcion_id', [cierre, facturas]);
await servicio.from('evento_flujo').insert({ funcion_id: facturas, estado: 'atrasado', razon: 'RAZON-DEL-ATRASO', en: haceDias(3) });
void nueva;
// Lo cerrado este mes: un "no pude" en el cierre (no corta su arrastre), un
// imprevisto marcado "no pude" y otro borrado, que no cuenta en nada.
const mes = hoy.slice(0, 7);
const { data: noPude } = await servicio
  .from('marca')
  .insert({ funcion_id: cierre, periodo: mes, resultado: 'no_pude', razon: 'RAZON-DEL-CIERRE', marcada_en: `${mes}-01T15:00:00Z` })
  .select('id')
  .single();
// Quien los registra y quien borra: la base pide un usuario de verdad.
const quien = (await (await comoAdministrador('jefa@prueba.test')).auth.getUser()).data.user!.id;
const imprevisto = (texto: string, extra: Record<string, unknown> = {}) => ({
  registrado_por: quien,
  empleado_id: ana,
  texto,
  vence: hoy,
  pedido_por_otro: 'el banco',
  pedido_en: `${mes}-01T12:00:00Z`,
  ...extra,
});
const { data: marcado, error: sinMarcado } = await servicio
  .from('imprevisto')
  .insert(imprevisto('IMPREVISTO-MARCADO', { resultado: 'no_pude', razon: 'RAZON-DEL-IMPREVISTO', marcada_en: `${mes}-01T16:00:00Z` }))
  .select('id')
  .single();
if (sinMarcado) throw sinMarcado;
// Dos abiertos de bruno, uno en plazo y otro vencido.
const { error: sinAbiertos } = await servicio.from('imprevisto').insert([
  imprevisto('ABIERTO-EN-PLAZO', { empleado_id: bruno }),
  imprevisto('ABIERTO-VENCIDO', { empleado_id: bruno, vence: `${mes}-10` }),
]);
if (sinAbiertos) throw sinAbiertos;
// El "no pude" del cierre se lo llevo ese imprevisto: intromision.
await servicio.from('intromision').insert({ imprevisto_id: marcado!.id, marca_id: noPude!.id });
await servicio.from('imprevisto').insert(
  imprevisto('IMPREVISTO-BORRADO', {
    resultado: 'no_pude',
    razon: 'no cuenta',
    marcada_en: `${mes}-01T17:00:00Z`,
    borrado_en: `${mes}-01T18:00:00Z`,
    borrado_por: quien,
  }),
);

await comoAdministrador('jefa@prueba.test');
const [sesionAna, , sesionSara] = await Promise.all(['ana', 'bruno', 'sara', 'carla'].map((n) => comoEmpleado(`${n}@prueba.test`)));

// Sara delega su caja diaria dos veces, y una se la devuelve a ana.
const caja = await sembrarFuncion(sara, { ...funcion('Caja de Sara', 'entregable', 'diaria'), ponderacion: 20 });
await servicio.from('titularidad').update({ desde: '2026-07-01' }).eq('funcion_id', caja);
const manana = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const { data: aAna, error: sinDelegar } = await sesionSara!.rpc('delegar', { la_funcion: caja, el_periodo: hoy, a_quien: ana, el_vence: hoy });
if (sinDelegar) throw sinDelegar;
await sesionAna!.rpc('marcar_imprevisto', { el_imprevisto: aAna, el_resultado: 'hecho', la_razon: null });
const { error: sinDevolver } = await sesionSara!.rpc('devolver', { la_delegacion: aAna, la_razon: 'faltan los anexos' });
if (sinDevolver) throw sinDevolver;
const { error: sinDelegarOtra } = await sesionSara!.rpc('delegar', { la_funcion: caja, el_periodo: manana, a_quien: bruno, el_vence: manana });
if (sinDelegarOtra) throw sinDelegarOtra;

async function sesion(correo: string): Promise<string> {
  const { data, error } = await servicio.auth.admin.generateLink({ type: 'magiclink', email: correo });
  if (error) throw error;
  const r = await fetch(`${WEB}/auth/confirmar?token_hash=${data.properties.hashed_token}&type=magiclink`, { redirect: 'manual' });
  const cookies = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  if (!cookies) throw new Error(`Sin sesion para ${correo}: ${r.status}`);
  return cookies;
}

const pagina = async (cookie: string, ruta: string) => {
  const r = await fetch(`${WEB}${ruta}`, { headers: { cookie }, redirect: 'manual' });
  return { status: r.status, html: await r.text() };
};
// Lo que se pinta, sin los scripts de Next (repiten el contenido) y sin el
// comentario con que React separa el texto fijo de lo interpolado.
const texto = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!-- -->/g, '');

let fallos = 0;
function criterio(nombre: string, ok: boolean) {
  if (!ok) fallos++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${nombre}`);
}

const [cSara, cJefa, cAna] = await Promise.all(['sara', 'jefa', 'ana'].map((n) => sesion(`${n}@prueba.test`)));

// CEB-217 · El supervisor abre el perfil de su gente, con pesos.
let r = await pagina(cSara, `/equipo/${ana}`);
let html = texto(r.html);
criterio('sara: abre el perfil de ana en su propia pagina', r.status === 200 && html.includes('Su reparto') && html.includes('Sus tareas abiertas'));
criterio('sara: ve el peso de cada funcion y la cotidianidad', html.includes('30%') && html.includes('20%') && html.includes('cotidianidad 40%'));
criterio('sara: ni bono ni montos', !/\$\d/.test(html) && !html.includes('1234') && !html.includes('1.234') && !html.includes('Su bono'));
criterio('sara: puede pedirle una nueva tarea', html.includes('＋ Nueva tarea'));
criterio('sara: no edita su reparto', !html.includes('?editar='));
r = await pagina(cSara, `/equipo/${carla}`);
criterio('sara: carla no es de su gente, 404', r.status === 404);
r = await pagina(cAna, `/equipo/${bruno}`);
criterio('ana: no supervisa, 404', r.status === 404);

// CEB-219 · Cada funcion dice como va en su fila.
for (const [quien, cookie, ruta] of [
  ['jefa', cJefa, `/admin/${ana}`],
  ['sara', cSara, `/equipo/${ana}`],
] as const) {
  html = texto((await pagina(cookie, ruta)).html);
  criterio(`${quien}: el entregable arrastrado dice periodos y desde cuando`, /arrastra \d+ periodos, desde el 30 jun/.test(html));
  criterio(`${quien}: el flujo atrasado dice desde cuando y su razon`, html.includes('atrasado desde el') && html.includes('RAZON-DEL-ATRASO'));
  criterio(`${quien}: la funcion al dia no dice nada`, (html.match(/arrastra \d+ periodo/g) ?? []).length === 1);
}

// CEB-220 · Las cerradas del mes, plegadas en el perfil.
for (const [quien, cookie, ruta] of [
  ['jefa', cJefa, `/admin/${ana}`],
  ['sara', cSara, `/equipo/${ana}`],
] as const) {
  html = texto((await pagina(cookie, ruta)).html);
  // Dos marcadas y la delegacion que sara le devolvio.
  criterio(`${quien}: las cerradas del mes, plegadas y contadas`, html.includes('Cerradas del mes (3)') && !/<details[^>]*open[^>]*>\s*<summary>Cerradas/.test(html));
  criterio(`${quien}: cada una con su resultado y su razon`, html.includes('no pude: RAZON-DEL-CIERRE') && html.includes('no pude: RAZON-DEL-IMPREVISTO'));
  criterio(`${quien}: el imprevisto borrado no esta`, !html.includes('IMPREVISTO-BORRADO'));
  html = texto((await pagina(cookie, `${ruta}?tarea=i:${marcado!.id}`)).html);
  criterio(`${quien}: al abrir una se ve su historia, sin poder comentar`, html.includes('No pude: “RAZON-DEL-IMPREVISTO”') && !html.includes('Escribe un comentario'));
}

// CEB-221 · El tablero: cuanto del cargo esta sin cumplir.
// Ana: el cierre (30) arrastra 4 periodos, uno desplazado (7,5); su cotidianidad
// (40) tuvo un imprevisto esperado y no lo cumplio (40). Total, 70.
html = texto((await pagina(cJefa, '/admin')).html);
criterio('jefa: la barra de ana dice cuanto esta sin cumplir y cuanto se desplazo', html.includes('70% sin cumplir') && html.includes('7,5% lo desplazó lo no planificado'));
criterio('jefa: con su monto', html.includes('$863,8'));
criterio('jefa: la barra lleva a su perfil', html.includes(`href="/admin/${ana}"`));
criterio('jefa: alguien nuevo, plegado al final', /<details class="nuevo-item"><summary>＋ Alguien nuevo/.test(html));
html = texto((await pagina(cJefa, '/admin?q=zzzz')).html);
criterio('jefa: el filtro acota el tablero', !html.includes('70% sin cumplir'));
html = texto((await pagina(cSara, '/equipo')).html);
criterio('sara: la misma barra, sin montos', html.includes('70% sin cumplir') && !/\$\d/.test(html) && html.includes(`href="/equipo/${ana}"`));
criterio('sara: solo su gente', !html.includes('CARLA'));
criterio('sara: no da de alta a nadie', !html.includes('Alguien nuevo'));

// CEB-222 · La linea del arrastre.
for (const [quien, cookie, ruta, perfil] of [
  ['jefa', cJefa, '/admin', `/admin/${ana}`],
  ['sara', cSara, '/equipo', `/equipo/${ana}`],
] as const) {
  html = texto((await pagina(cookie, ruta)).html);
  const linea = html.slice(html.indexOf('Desde cuándo'));
  criterio(`${quien}: un tramo por funcion que arrastra, de cadencias distintas`, linea.includes('Cierre contable · 4 periodos, desde el 30 jun') && /Reporte semanal · \d+ periodos, desde el/.test(linea));
  criterio(`${quien}: lo mas viejo primero`, linea.indexOf('ANA') < linea.indexOf('BRUNO'));
  criterio(`${quien}: quien no arrastra no ocupa espacio`, !linea.includes('DORA</strong>'));
  criterio(`${quien}: el tramo lleva al perfil`, linea.includes(`href="${perfil}"`));
}

// CEB-223 · La carga de imprevistos. Bruno: tres abiertos (uno es la
// delegacion de sara) con cotidianidad 85.
for (const [quien, cookie, ruta] of [
  ['jefa', cJefa, '/admin'],
  ['sara', cSara, '/equipo'],
] as const) {
  html = texto((await pagina(cookie, ruta)).html);
  const carga = html.slice(html.indexOf('Cuánto le cae para su tamaño'), html.indexOf('Las personas'));
  criterio(`${quien}: la carga de bruno por cada 10% de su cotidianidad`, carga.includes('0,4 por cada 10%') && carga.includes('3 abiertos, cotidianidad 85%'));
  criterio(`${quien}: partida en en plazo y vencidos`, carga.includes('0,1 vencidos por cada 10%'));
  criterio(`${quien}: lo marcado no carga a nadie`, !carga.includes('ANA'));
  criterio(`${quien}: la barra lleva al perfil`, carga.includes(`href="${ruta === '/admin' ? '/admin' : '/equipo'}/${bruno}"`));
}

// CEB-224 · Las mas delegadas, y la señal en la fila.
for (const [quien, cookie, ruta] of [
  ['jefa', cJefa, '/admin'],
  ['sara', cSara, '/equipo'],
] as const) {
  html = texto((await pagina(cookie, ruta)).html);
  const delegadas = html.slice(html.indexOf('Las más delegadas'), html.indexOf('Las personas'));
  criterio(`${quien}: la caja de sara, en proporcion, con quien delega y lo devuelto`, /Caja de Sara.*% de sus ocurrencias.*delega SARA · delegada 2 veces \(1 devuelta\)/s.test(delegadas));
}
html = texto((await pagina(cJefa, `/admin/${sara}`)).html);
criterio('jefa: la señal en la fila de la funcion de quien delega', html.includes('🤝 delegada 2 veces (1 devuelta)'));
html = texto((await pagina(cJefa, `/admin/${sara}?editar=${caja}`)).html);
criterio('jefa: y junto a "Pasársela a"', /🤝 delegada 2 veces \(1 devuelta\) en 90 días.*Pasársela a/s.test(html));

// CEB-225 · Se borran las pantallas viejas.
html = texto((await pagina(cJefa, '/admin')).html);
criterio('jefa: el menu es El equipo · El calendario · Descargar', html.includes('El calendario') && html.includes('Descargar') && !html.includes('Qué se arrastra') && !html.includes('Qué dijeron'));
criterio('jefa: "Qué se arrastra" ya no existe', (await pagina(cJefa, '/admin/reporte')).status === 404);
criterio('jefa: "Qué dijeron" ya no existe', (await pagina(cJefa, '/admin/razones')).status === 404);
html = texto((await pagina(cSara, '/equipo')).html);
criterio('sara: sin acordeon ni "Lo que dijo"', !html.includes('<details') && !html.includes('Lo que dijo'));

console.log(fallos ? `\n${fallos} criterios fallaron` : '\nTodo en orden');
process.exit(fallos ? 1 : 0);
