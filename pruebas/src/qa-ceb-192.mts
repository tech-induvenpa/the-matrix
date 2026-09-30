// QA de CEB-192 sobre la web real: `next start` contra el Supabase local, con
// sesiones de verdad canjeadas por /auth/confirmar. Siembra a Ana (supervisora
// de Benito) con imprevistos y una delegacion, pide las paginas con la cookie
// de cada quien y mira el selector y las tarjetas en el HTML.
// Uso: WEB=http://localhost:3192 npx tsx pruebas/src/qa-ceb-192.mts
// Con ENLACE=ana imprime ademas un enlace para entrar como Ana en el navegador.
import { Calendario } from '@matriz/dominio';
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

const WEB = process.env.WEB ?? 'http://localhost:3192';
const servicio = comoServicio();
const hoy = new Date().toISOString().slice(0, 10);
const haceDias = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
const fechaCorta = (instante: string) => {
  const f = instante.slice(0, 10);
  const mes = new Intl.DateTimeFormat('es', { month: 'short', timeZone: 'UTC' })
    .format(new Date(`${f}T00:00:00Z`))
    .replace('.', '');
  return `${+f.slice(8, 10)} ${mes}`;
};

await vaciar();
const ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
const benito = await sembrarEmpleado('BENITO', 'benito@prueba.test');
await servicio.from('empleado').update({ supervisor_id: ana }).eq('id', benito);
const cierre = await sembrarFuncion(ana, {
  hash_identidad: 'h-cierre', texto: 'Cierre mensual', importancia: 8, periodicidad: 'mensual', tipo_generado: 'entregable', fecha_alta: '2026-01-01',
});
await comoAdministrador('jefa@prueba.test');
const sesionAna = await comoEmpleado('ana@prueba.test');
await comoEmpleado('benito@prueba.test');
const { data: yo } = await servicio.from('empleado').select('auth_user_id').eq('id', ana).single();

const { data: dias } = await servicio.from('dia_no_habil').select('desde, hasta');
const calendario = Calendario.con(dias ?? []);
const pedidoAyer = haceDias(1);
const { error } = await servicio.from('imprevisto').insert([
  { empleado_id: ana, texto: 'Informe para auditoría', pedido_en: pedidoAyer, vence: calendario.sumarHabiles(hoy, 12), pedido_por_otro: 'Carla', registrado_por: yo!.auth_user_id },
  { empleado_id: ana, texto: 'Llamar al banco', pedido_en: new Date().toISOString(), vence: hoy, pedido_por_otro: 'Carla', registrado_por: yo!.auth_user_id },
  { empleado_id: benito, texto: 'Archivar facturas', pedido_en: new Date().toISOString(), vence: calendario.sumarHabiles(hoy, 4), pedido_por_otro: 'Ana', registrado_por: yo!.auth_user_id },
]);
if (error) throw error;

// Una delegacion de verdad, por delegar(), y luego su pedido se atrasa dos dias
// para ver la fecha corta en vez de "hoy".
const periodo = hoy.slice(0, 7);
const finDeMes = new Date(Date.UTC(+hoy.slice(0, 4), +hoy.slice(5, 7), 0)).toISOString().slice(0, 10);
const { data: delegacion, error: sinDelegar } = await sesionAna.rpc('delegar', {
  la_funcion: cierre, el_periodo: periodo, a_quien: benito, el_vence: calendario.habilAnterior(finDeMes),
});
if (sinDelegar) throw sinDelegar;
const pedidoDelegacion = haceDias(2);
await servicio.from('imprevisto').update({ pedido_en: pedidoDelegacion }).eq('id', delegacion);

// La sesion como la obtiene un navegador: el enlace del correo, canjeado por la web.
async function enlace(correo: string) {
  const { data, error } = await servicio.auth.admin.generateLink({ type: 'magiclink', email: correo });
  if (error) throw error;
  return `${WEB}/auth/confirmar?token_hash=${data.properties.hashed_token}&type=magiclink`;
}
async function sesion(correo: string): Promise<string> {
  const r = await fetch(await enlace(correo), { redirect: 'manual' });
  const cookies = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  if (!cookies) throw new Error(`Sin sesion para ${correo}: ${r.status}`);
  return cookies;
}
// El texto visible: sin etiquetas ni los comentarios que React mete entre nodos.
const texto = async (cookie: string, ruta: string) => {
  const html = await (await fetch(`${WEB}${ruta}`, { headers: { cookie }, redirect: 'manual' })).text();
  return { html, texto: html.replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|\s+/g, ' ') };
};

let fallos = 0;
function criterio(nombre: string, ok: boolean, detalle = '') {
  if (!ok) fallos++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${nombre}${ok ? '' : `  → ${detalle}`}`);
}
const selector = (html: string) => {
  const s = html.match(/<select[^>]*name="urgencia"[\s\S]*?<\/select>/)?.[0] ?? '';
  return { valores: [...s.matchAll(/<option[^>]*value="(\d)"/g)].map((m) => m[1]).join(''), porDefecto: s.match(/<option[^>]*value="(\d)"[^>]*selected/)?.[1] };
};

const [cAna, cBenito, cJefa] = await Promise.all([sesion('ana@prueba.test'), sesion('benito@prueba.test'), sesion('jefa@prueba.test')]);

// CEB-193: el mismo selector para empleado, supervisor y administrador.
const semana = await texto(cAna, '/');
const equipo = await texto(cAna, '/equipo');
const ficha = await texto(cJefa, `/admin/${benito}`);
for (const [quien, p, cuantos] of [['empleado', semana, 1], ['supervisor', equipo, 1], ['administrador', ficha, 1]] as const) {
  const s = selector(p.html);
  criterio(`CEB-193 selector del ${quien}: diez opciones de 9 a 0, 8 por defecto`, s.valores === '9876543210' && s.porDefecto === '8', JSON.stringify(s));
  void cuantos;
}

// CEB-195: cuando se pidio, en cada pantalla.
criterio('CEB-195 empleado: pedido otro dia dice "el <fecha corta>"', semana.texto.includes(`pedido por Carla el ${fechaCorta(pedidoAyer)}`), fechaCorta(pedidoAyer));
criterio('CEB-195 empleado: pedido hoy dice "hoy"', semana.texto.includes('pedido por Carla hoy ·'));
criterio('CEB-195 supervisor: la tarjeta de su gente dice cuando se pidio', equipo.texto.includes('pedido por Ana hoy ·'));
const deBenito = await texto(cBenito, '/');
criterio('CEB-195 delegacion, vista de quien la recibe: "delegado por ANA el <fecha>"', deBenito.texto.includes(`delegado por ANA el ${fechaCorta(pedidoDelegacion)}`), deBenito.texto.match(/delegado por[^·]*·/)?.[0] ?? 'sin "delegado por"');
criterio('CEB-195 delegacion, vista del supervisor en El equipo', equipo.texto.includes(`delegado por ANA el ${fechaCorta(pedidoDelegacion)}`), equipo.texto.match(/delegado por[^·]*·/)?.[0] ?? 'sin "delegado por"');
criterio('CEB-195 administrador: la ficha dice cuando se pidio', ficha.texto.includes('pedido por Ana hoy ·'));

console.log(fallos ? `\n${fallos} FAIL` : '\nTodo PASS');
if (process.env.ENLACE === 'ana') console.log(await enlace('ana@prueba.test'));
process.exit(fallos ? 1 : 0);
