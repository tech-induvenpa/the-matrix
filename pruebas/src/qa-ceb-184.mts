// QA de CEB-184 sobre la web real: `next start` contra el Supabase local, con
// sesiones de verdad canjeadas por /auth/confirmar. Siembra, pide las paginas
// con la cookie de cada quien y mira quien aparece en el HTML.
// Uso: WEB=http://localhost:3107 npx tsx pruebas/src/qa-ceb-184.mts
import { comoAdministrador, comoServicio, empresa, sembrarEmpleado, sembrarFuncion, sembrarSede, vaciar } from './entorno';

const WEB = process.env.WEB ?? 'http://localhost:3107';
const servicio = comoServicio();

await vaciar();
const kia = await empresa('KIA');
const toyota = await empresa('Toyota');
const valencia = await sembrarSede(kia, 'Valencia');
const maracay = await sembrarSede(kia, 'Maracay');

const ana = await sembrarEmpleado('ANA', 'ana@prueba.test', { empresa_id: kia, sede_id: valencia });
const benito = await sembrarEmpleado('BENITO', 'benito@prueba.test', { empresa_id: kia, sede_id: maracay });
const carla = await sembrarEmpleado('CARLA', 'carla@prueba.test', { empresa_id: kia });
const dario = await sembrarEmpleado('DARIO', 'dario@prueba.test', { empresa_id: toyota });
await sembrarEmpleado('ELENA', 'elena@prueba.test', { empresa_id: kia, sede_id: valencia });
const f = (texto: string) => ({ hash_identidad: `h-${texto}`, texto, importancia: 5, periodicidad: 'mensual', tipo_generado: 'entregable', fecha_alta: '2026-01-01' });
await sembrarFuncion(benito, f('Cierre Auto Bengala'));
const conciliacion = await sembrarFuncion(dario, f('Conciliación bancaria'));
const caja = await sembrarFuncion((await servicio.from('empleado').select('id').eq('nombre_bloque', 'ELENA').single()).data!.id, f('Cierre de caja'));
await servicio.from('marca').insert([
  { funcion_id: conciliacion, periodo: '2026-08', resultado: 'no_pude', razon: 'RAZON-DE-DARIO' },
  { funcion_id: caja, periodo: '2026-08', resultado: 'no_pude', razon: 'RAZON-DE-ELENA' },
]);
await servicio.from('empleado').update({ supervisor_id: ana }).in('id', [benito, carla, dario]);

// Usuarios de auth y vinculos: el administrador y quienes van a entrar.
await comoAdministrador('jefa@prueba.test');
for (const correo of ['ana@prueba.test', 'elena@prueba.test']) {
  const { data } = await servicio.auth.admin.listUsers();
  let u = data.users.find((x) => x.email === correo);
  if (!u) u = (await servicio.auth.admin.createUser({ email: correo, email_confirm: true })).data.user!;
  await servicio.from('empleado').update({ auth_user_id: u.id }).eq('correo', correo);
}

// La sesion como la obtiene un navegador: el enlace del correo, canjeado por la web.
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

let fallos = 0;
function criterio(nombre: string, ok: boolean, detalle = '') {
  if (!ok) fallos++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${nombre}${ok ? '' : `  → ${detalle}`}`);
}
// Cada pantalla pinta a la persona de su lista de una forma; los nombres
// aparecen tambien en otros lados (las casillas de la descarga, "quien lo
// pidio"), asi que se busca la forma de la lista y no el nombre suelto.
const FORMA = { equipo: (n: string) => `>${n}<span`, reporte: (n: string) => `>${n}</a>`, supervisor: (n: string) => `margin-right:12px">${n}<` };
let forma = FORMA.equipo;
const quienes = (html: string, nombres: string[]) => nombres.filter((n) => html.includes(forma(n)));
const esperar = (nombre: string, html: string, deben: string[], todos = ['ANA', 'BENITO', 'CARLA', 'DARIO', 'ELENA']) => {
  const hay = quienes(html, todos);
  criterio(nombre, JSON.stringify(hay) === JSON.stringify(deben), `aparecen ${JSON.stringify(hay)}, se esperaba ${JSON.stringify(deben)}`);
};

const jefa = await sesion('jefa@prueba.test');
const sesionAna = await sesion('ana@prueba.test');
const sesionElena = await sesion('elena@prueba.test');

// El equipo del administrador (CEB-185, CEB-186, CEB-187)
let p = await pagina(jefa, '/admin');
criterio('boot: /admin responde 200 al administrador', p.status === 200, String(p.status));
esperar('El equipo sin filtro muestra a todos', p.html, ['ANA', 'BENITO', 'CARLA', 'DARIO', 'ELENA']);
criterio('El equipo muestra empresa y sede de cada quien', p.html.includes('KIA · Valencia') && />Toyota</.test(p.html));
criterio('el alta pide la empresa (desplegable obligatorio)', /<select[^>]*name="pertenencia"[^>]*required/.test(p.html));
criterio('las opciones ofrecen sedes solo de KIA', p.html.includes('KIA · Maracay') && !p.html.includes('Toyota · '));
criterio('sin filtro no hay "quitar filtro"', !p.html.includes('quitar filtro'));
esperar('filtrar KIA', (await pagina(jefa, `/admin?en=${kia}`)).html, ['ANA', 'BENITO', 'CARLA', 'ELENA']);
esperar('filtrar KIA · Valencia trae a los de Valencia y a la sin sede', (await pagina(jefa, `/admin?en=${kia}/${valencia}`)).html, ['ANA', 'CARLA', 'ELENA']);
esperar('filtrar Toyota', (await pagina(jefa, `/admin?en=${toyota}`)).html, ['DARIO']);
esperar('buscar "CONCILIACION" (sin tilde ni minusculas)', (await pagina(jefa, '/admin?q=CONCILIACION')).html, ['DARIO']);
esperar('KIA + "cierre"', (await pagina(jefa, `/admin?en=${kia}&q=cierre`)).html, ['BENITO', 'ELENA']);
esperar('buscar por nombre de sede', (await pagina(jefa, '/admin?q=maracay')).html, ['BENITO']);
p = await pagina(jefa, `/admin?en=${toyota}`);
criterio('filtrando hay "quitar filtro" y el desplegable conserva la eleccion', p.html.includes('quitar filtro') && new RegExp(`value="${toyota}" selected`).test(p.html));

// La ficha (CEB-185, CEB-186)
p = await pagina(jefa, `/admin/${benito}?editar=persona`);
criterio('la ficha muestra su empresa y sede', p.html.includes('KIA · Maracay'));
criterio('la ficha edita empresa y sede con la actual elegida', new RegExp(`value="${kia}/${maracay}" selected`).test(p.html));

// Que se arrastra y Razones (CEB-188)
forma = FORMA.reporte;
p = await pagina(jefa, `/admin/reporte?en=${toyota}`);
esperar('Qué se arrastra filtrado por Toyota', p.html, ['DARIO']);
p = await pagina(jefa, '/admin/reporte?q=cierre');
criterio('Qué se arrastra con "cierre" deja solo filas de cierre', p.html.includes('Cierre Auto Bengala') && p.html.includes('Cierre de caja') && !p.html.includes('Conciliación bancaria'));
p = await pagina(jefa, '/admin/reporte');
const orden = ['BENITO', 'DARIO', 'ELENA'].map((n) => p.html.indexOf(forma(n)));
const ordenFiltrado = (await pagina(jefa, `/admin/reporte?en=${kia}`)).html;
criterio('filtrar no reordena Qué se arrastra', ordenFiltrado.indexOf(forma('BENITO')) < ordenFiltrado.indexOf(forma('ELENA')) === orden[0]! < orden[2]!);
p = await pagina(jefa, `/admin/razones?en=${toyota}`);
criterio('Razones por Toyota trae la de DARIO y no la de ELENA', p.html.includes('RAZON-DE-DARIO') && !p.html.includes('RAZON-DE-ELENA'));
p = await pagina(jefa, `/admin/razones?funcion=${caja}&en=${toyota}`);
criterio('Razones combina funcion con empresa ("y")', !p.html.includes('RAZON-DE-ELENA') && !p.html.includes('RAZON-DE-DARIO'));
p = await pagina(jefa, `/admin/razones?funcion=${caja}&q=elena`);
criterio('Razones conserva ?funcion= al filtrar', p.html.includes('RAZON-DE-ELENA') && p.html.includes(`name="funcion" value="${caja}"`));

// El supervisor (CEB-189)
forma = FORMA.supervisor;
p = await pagina(sesionAna, '/equipo');
criterio('boot: /equipo responde 200 a la supervisora', p.status === 200, String(p.status));
esperar('la supervisora ve a su gente y no a la vecina', p.html, ['BENITO', 'CARLA', 'DARIO']);
criterio('la supervisora ve la empresa de su gente', p.html.includes('KIA · Maracay'));
esperar('supervisora filtra KIA', (await pagina(sesionAna, `/equipo?en=${kia}`)).html, ['BENITO', 'CARLA']);
p = await pagina(sesionAna, '/equipo?q=elena');
esperar('buscar a la vecina no la trae', p.html, []);
p = await pagina(sesionAna, `/equipo?q=${encodeURIComponent('cierre de caja')}`);
criterio('buscar una funcion de la vecina no trae nada', quienes(p.html, ['ELENA']).length === 0 && p.html.includes('Nadie de tu equipo coincide'));

// El empleado (historia 21) y el acceso
p = await pagina(sesionElena, '/');
criterio('la pantalla del empleado sigue respondiendo', p.status === 200, String(p.status));
p = await pagina(sesionElena, '/admin');
criterio('un empleado no entra a /admin', p.status !== 200 || !p.html.includes('Alguien nuevo'), String(p.status));

console.log(fallos ? `\n${fallos} FAIL` : '\nTodo PASS');
process.exit(fallos ? 1 : 0);
