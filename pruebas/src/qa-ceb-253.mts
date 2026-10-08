// QA de CEB-253 (delegar un imprevisto) sobre la web real: `next dev` o `next start`
// contra el Supabase local, con sesiones de verdad canjeadas por /auth/confirmar.
// Una supervisora recibe un imprevisto y se lo delega a alguien a su cargo;
// se mira en el HTML lo que ve cada quien.
// Uso: WEB=http://localhost:3000 npx tsx pruebas/src/qa-ceb-253.mts
import { comoAdministrador, comoEmpleado, comoServicio, sembrarEmpleado, vaciar } from './entorno';

const WEB = process.env.WEB ?? 'http://localhost:3000';
const servicio = comoServicio();
const hoy = new Date().toISOString().slice(0, 10);

await vaciar();
const ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
const benito = await sembrarEmpleado('BENITO', 'benito@prueba.test');
await sembrarEmpleado('CARLA', 'carla@prueba.test');
await servicio.from('empleado').update({ supervisor_id: ana }).eq('id', benito);
await servicio.from('bono').insert({ empleado_id: benito, monto: 777, rige_desde: '2026-01-01' });

await comoAdministrador('jefa@prueba.test');
const [sesionAna, sesionBenito] = await Promise.all(['ana', 'benito'].map((n) => comoEmpleado(`${n}@prueba.test`)));
const uidAna = (await sesionAna!.auth.getUser()).data.user!.id;

const { data: original, error } = await servicio
  .from('imprevisto')
  .insert({ empleado_id: ana, texto: 'REVISAR-FACTURA', vence: hoy, importancia: 7, pedido_por_otro: 'FINANZAS', registrado_por: uidAna })
  .select('id')
  .single();
if (error) throw error;

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
  return { status: r.status, html: (await r.text()).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!-- -->/g, '') };
};

let fallos = 0;
function criterio(nombre: string, ok: boolean) {
  if (!ok) fallos++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${nombre}`);
}

const [cAna, cBenito] = await Promise.all(['ana', 'benito'].map((n) => sesion(`${n}@prueba.test`)));

// Antes de delegar: ana ve su imprevisto con el boton de delegar; benito no ve nada.
let r = await pagina(cAna!, '/');
criterio('ana: ve su imprevisto abierto', r.status === 200 && r.html.includes('REVISAR-FACTURA'));
criterio('ana: tiene el boton Delegar en el imprevisto', r.html.includes('aria-label="Delegar"'));

// Delega a benito.
const { data: nueva, error: sinDelegar } = await sesionAna!.rpc('delegar_imprevisto', { el_imprevisto: original!.id, a_quien: benito });
if (sinDelegar) throw sinDelegar;

r = await pagina(cAna!, '/');
criterio('ana: lo delegado sale a "Delegadas", con a quien y para cuando', r.html.includes('Delegadas') && r.html.includes('Delegada a BENITO'));
criterio('ana: ya no ofrece delegarlo otra vez', !r.html.includes('aria-label="Delegar"'));

r = await pagina(cBenito!, '/');
criterio('benito: le llega "delegado por ANA"', r.html.includes('REVISAR-FACTURA') && /delegado por\s*ANA/.test(r.html));
criterio('benito: ve el pedido original (quien lo pidio y que decia)', r.html.includes('pedido original') && r.html.includes('FINANZAS'));
criterio('benito: no puede volver a delegarlo', !r.html.includes('aria-label="Delegar"'));
criterio('benito: nada de dinero ni pesos', !/\$\d/.test(r.html) && !r.html.includes('777'));

// Benito lo marca hecho: ana lo revisa, el original sigue siendo suyo.
const { error: sinMarcar } = await sesionBenito!.rpc('marcar_imprevisto', { el_imprevisto: nueva, el_resultado: 'hecho', la_razon: null });
if (sinMarcar) throw sinMarcar;
r = await pagina(cAna!, '/');
criterio('ana: ve "Hecho por BENITO · revisalo" y puede aprobar o devolver', r.html.includes('Hecho por BENITO') && r.html.includes('Aprobar') && r.html.includes('Devolver'));
const { data: o } = await servicio.from('imprevisto').select('resultado, empleado_id').eq('id', original!.id).single();
criterio('el original sigue abierto y de ana', o!.resultado === null && o!.empleado_id === ana);

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
