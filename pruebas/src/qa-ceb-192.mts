// QA de CEB-192 en el navegador: siembra a Ana (supervisora de Benito) con
// imprevistos abiertos y deja un enlace de entrada como Ana.
// Uso: WEB=http://localhost:3192 npx tsx pruebas/src/qa-ceb-192.mts
import { Calendario } from '@matriz/dominio';
import { comoAdministrador, comoServicio, sembrarEmpleado, sembrarFuncion, vaciar } from './entorno';

const WEB = process.env.WEB ?? 'http://localhost:3192';
const servicio = comoServicio();
const hoy = new Date().toISOString().slice(0, 10);

await vaciar();
const ana = await sembrarEmpleado('ANA', 'ana@prueba.test');
const benito = await sembrarEmpleado('BENITO', 'benito@prueba.test');
await servicio.from('empleado').update({ supervisor_id: ana }).eq('id', benito);
await sembrarFuncion(ana, { hash_identidad: 'h-cierre', texto: 'Cierre mensual', importancia: 8, periodicidad: 'mensual', tipo_generado: 'entregable', fecha_alta: '2026-01-01' });
await comoAdministrador('jefa@prueba.test');

const { data: usuarios } = await servicio.auth.admin.listUsers();
let u = usuarios.users.find((x) => x.email === 'ana@prueba.test');
if (!u) u = (await servicio.auth.admin.createUser({ email: 'ana@prueba.test', email_confirm: true })).data.user!;
await servicio.from('empleado').update({ auth_user_id: u.id }).eq('id', ana);

const { data: dias } = await servicio.from('dia_no_habil').select('desde, hasta');
const calendario = Calendario.con(dias ?? []);
const ayer = new Date(Date.now() - 864e5).toISOString();
const { error } = await servicio.from('imprevisto').insert([
  { empleado_id: ana, texto: 'Informe para auditoría', pedido_en: ayer, vence: calendario.sumarHabiles(hoy, 12), pedido_por_otro: 'Carla', registrado_por: u.id },
  { empleado_id: ana, texto: 'Llamar al banco', pedido_en: new Date().toISOString(), vence: hoy, pedido_por_otro: 'Carla', registrado_por: u.id },
  { empleado_id: benito, texto: 'Archivar facturas', pedido_en: new Date().toISOString(), vence: calendario.sumarHabiles(hoy, 4), pedido_por_otro: 'Ana', registrado_por: u.id },
]);
if (error) throw error;

const { data } = await servicio.auth.admin.generateLink({ type: 'magiclink', email: 'ana@prueba.test' });
console.log(`${WEB}/auth/confirmar?token_hash=${data!.properties.hashed_token}&type=magiclink`);
