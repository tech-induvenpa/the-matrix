import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Las claves del Supabase local no se escriben en ningun sitio: se le preguntan
// al CLI cada vez. Asi nadie confunde las de local con las del proyecto real.
function delCli(): Record<string, string> {
  const salida = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
    cwd: new URL('../..', import.meta.url).pathname,
    encoding: 'utf8',
  });

  return Object.fromEntries(
    salida
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => {
        const [clave, ...resto] = l.split('=');
        return [clave!.trim(), resto.join('=').trim().replace(/^"|"$/g, '')];
      }),
  );
}

const env = delCli();
export const URL_LOCAL = env.API_URL ?? 'http://127.0.0.1:54321';
const ANON = env.ANON_KEY!;
const SERVICIO = env.SERVICE_ROLE_KEY!;

// El cliente que se salta la seguridad por fila. Solo para montar el escenario
// y para comprobar desde fuera lo que deberia haber quedado.
export const comoServicio = (): SupabaseClient =>
  createClient(URL_LOCAL, SERVICIO, { auth: { persistSession: false } });

// Un empleado de verdad, con su sesion: es lo unico que prueba la seguridad por
// fila. Un cliente de servicio disfrazado no probaria nada.
export async function comoEmpleado(correo: string): Promise<SupabaseClient> {
  const servicio = comoServicio();
  const clave = `prueba-${correo}`;

  const { data: creado, error } = await servicio.auth.admin.createUser({
    email: correo,
    password: clave,
    email_confirm: true,
  });
  if (error && !error.message.includes('already been registered')) throw error;

  // vaciar() limpia las tablas pero no los usuarios de auth, asi que en la
  // segunda corrida createUser no devuelve nada: hay que ir a buscarlo. Sin
  // esto el empleado se queda sin auth_user_id y no ve ni lo suyo.
  let usuario = creado?.user ?? null;
  if (!usuario) {
    const { data } = await servicio.auth.admin.listUsers();
    usuario = data.users.find((u) => u.email === correo) ?? null;
  }
  if (!usuario) throw new Error(`No se pudo resolver el usuario de ${correo}`);

  // En produccion se entra por el enlace del correo, sin contrasena. Aqui hace
  // falta una para poder abrir sesion desde una prueba, y el usuario puede
  // haber nacido por cualquier camino -- incluido dar_de_alta, que no pone
  // ninguna. Asi que se le pone siempre.
  await servicio.auth.admin.updateUserById(usuario.id, { password: clave });

  // El vinculo se rehace siempre: la fila del empleado es nueva en cada prueba.
  const { error: sinVinculo } = await servicio
    .from('empleado')
    .update({ auth_user_id: usuario.id })
    .eq('correo', correo);
  if (sinVinculo) throw sinVinculo;

  const cliente = createClient(URL_LOCAL, ANON, { auth: { persistSession: false } });
  const { error: fallo } = await cliente.auth.signInWithPassword({ email: correo, password: clave });
  if (fallo) throw fallo;

  return cliente;
}

// El administrador no es un empleado: es una fila en su propia tabla, atada al
// usuario de autenticacion. Entra por el mismo sitio que todo el mundo.
export async function comoAdministrador(correo: string): Promise<SupabaseClient> {
  const servicio = comoServicio();
  const clave = `prueba-${correo}`;

  const { data: creado, error } = await servicio.auth.admin.createUser({
    email: correo,
    password: clave,
    email_confirm: true,
  });
  if (error && !error.message.includes('already been registered')) throw error;

  let usuario = creado?.user ?? null;
  if (!usuario) {
    const { data } = await servicio.auth.admin.listUsers();
    usuario = data.users.find((u) => u.email === correo) ?? null;
  }
  if (!usuario) throw new Error(`No se pudo resolver el usuario de ${correo}`);

  const { error: sinAlta } = await servicio
    .from('administrador')
    .upsert({ auth_user_id: usuario.id }, { onConflict: 'auth_user_id' });
  if (sinAlta) throw sinAlta;

  const cliente = createClient(URL_LOCAL, ANON, { auth: { persistSession: false } });
  const { error: fallo } = await cliente.auth.signInWithPassword({ email: correo, password: clave });
  if (fallo) throw fallo;

  return cliente;
}

// Cada prueba monta su escenario desde cero: nada de datos heredados. El reloj
// no se vacia: vuelve al de las pruebas.
export async function vaciar(): Promise<void> {
  const servicio = comoServicio();
  for (const tabla of ['reapertura', 'bono', 'intromision', 'imprevisto', 'evento_flujo', 'marca', 'titularidad', 'funcion', 'empleado', 'administrador']) {
    const columna = tabla === 'administrador' ? 'auth_user_id' : 'id';
    // Tragarse este error costo una tarde: una restriccion nueva bloqueaba el
    // borrado, las tablas quedaban con datos de la corrida anterior, y el fallo
    // aparecia lejos, como una clave duplicada.
    const { error } = await servicio.from(tabla).delete().not(columna, 'is', null);
    if (error) throw new Error(`No se pudo vaciar ${tabla}: ${error.message}`);
  }
  await fijarReloj(RELOJ_DE_LAS_PRUEBAS);
}

// Una funcion y su vinculo con el titular, que desde CEB-130 son dos filas.
// Devuelve el id de la funcion, que es lo que las pruebas necesitan.
export async function sembrarFuncion(
  empleadoId: string,
  funcion: Record<string, unknown> & { ponderacion?: number },
): Promise<string> {
  const servicio = comoServicio();
  const { ponderacion = 10, ...campos } = funcion;

  const { data, error } = await servicio.from('funcion').insert(campos).select('id').single();
  if (error) throw error;

  const { error: sinVinculo } = await servicio
    .from('titularidad')
    .insert({ funcion_id: data.id, empleado_id: empleadoId, ponderacion, publicado_en: new Date().toISOString() });
  if (sinVinculo) throw sinVinculo;

  return data.id as string;
}

export async function sembrarEmpleado(
  nombreBloque: string,
  correo: string,
  pertenencia: { empresa_id?: string; sede_id?: string } = {},
): Promise<string> {
  const servicio = comoServicio();
  const { data, error } = await servicio
    .from('empleado')
    .insert({ nombre_bloque: nombreBloque, correo, ...pertenencia })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

// Las empresas y las sedes son fijas y las siembran las migraciones (CEB-184,
// CEB-191): se buscan por nombre, y vaciar() no las toca.
export async function empresa(nombre: string): Promise<string> {
  const { data, error } = await comoServicio().from('empresa').select('id').eq('nombre', nombre).single();
  if (error) throw error;
  return data.id as string;
}

export async function sede(empresaId: string, nombre: string): Promise<string> {
  const { data, error } = await comoServicio()
    .from('sede')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('nombre', nombre)
    .single();
  if (error) throw error;
  return data.id as string;
}

// El reloj de la base (0032). Lo que depende de "ahora" -- el cierre del mes y
// sus reaperturas -- pregunta a ahora(), que es este instante si hay uno y
// now() si no. Asi se prueba el minuto antes y el minuto despues del cierre
// sin esperar a fin de mes, con la base real. Solo lo mueve la llave de
// servicio; vaciar() lo devuelve al de las pruebas, y null a now().
export async function fijarReloj(instante: string | null): Promise<void> {
  const servicio = comoServicio();
  const { error } = instante
    ? await servicio.from('reloj').upsert({ unico: true, instante }, { onConflict: 'unico' })
    : await servicio.from('reloj').delete().eq('unico', true);
  if (error) throw error;
}

// Las pruebas corren con el reloj de la base a mitad del mes en curso: el 15,
// al mediodia de Caracas (ADR 0017). Con la fecha real, lo que marca "este
// mes" fallaria cada fin de mes que cae en fin de semana o feriado, entre el
// cierre del ultimo habil y el fin del mes calendario. Lo fija reloj.ts antes
// de cada archivo y lo deja vacio al terminar; las del cierre (INV-43, INV-44)
// fijan el suyo.
export const RELOJ_DE_LAS_PRUEBAS = new Date(
  `${new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 7)}-15T12:00:00-04:00`,
).toISOString();

// Las descargas son CSV con punto y coma, como las lee Excel en español. Esto
// las lee como una hoja: respeta las comillas (un punto y coma dentro de un
// texto no parte la celda) y resuelve las formulas de pura aritmetica que
// escribe la descarga de siempre (=K2/L2*(1-I2), =M2*N2/100).
export function leerHoja(csv: string): { cabecera: string[]; filas: Record<string, string | number>[] } {
  const lineas: string[][] = [];
  let celda = '';
  let fila: string[] = [];
  let entreComillas = false;
  const texto = csv.replace(/^\uFEFF/, '');
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (entreComillas && c === '"' && texto[i + 1] === '"') {
      celda += '"';
      i++;
    } else if (c === '"') {
      entreComillas = !entreComillas;
    } else if (!entreComillas && c === ';') {
      fila.push(celda);
      celda = '';
    } else if (!entreComillas && c === '\n') {
      fila.push(celda);
      lineas.push(fila);
      fila = [];
      celda = '';
    } else {
      celda += c;
    }
  }
  fila.push(celda);
  lineas.push(fila);

  const [cabecera = [], ...resto] = lineas;
  const valor = (n: number, col: number): number => {
    const bruto = resto[n - 2]?.[col] ?? '';
    if (!bruto.startsWith('=')) return Number(bruto || 0);
    // ponytail: las formulas son solo referencias y aritmetica; se sustituyen
    // las referencias por su valor y se evalua lo que queda.
    const aritmetica = bruto.slice(1).replace(/([A-Z])(\d+)/g, (_, l: string, r: string) => `(${valor(+r, l.charCodeAt(0) - 65)})`);
    return Function(`return ${aritmetica}`)() as number;
  };

  return {
    cabecera,
    filas: resto.map((celdas, i) =>
      Object.fromEntries(cabecera.map((c, col) => [c, celdas[col]?.startsWith('=') ? valor(i + 2, col) : (celdas[col] ?? '')])),
    ),
  };
}
