// Adaptador de Google Sheets (CEB-111). Lee el documento tal como esta, con
// sus celdas combinadas: el valor va en la primera celda del rango combinado y
// el resto llega vacio, que es justo lo que espera el lector de bloques.
//
// ponytail: el JWT se firma con node:crypto y se pide el token a mano. Son
// treinta lineas y evita arrastrar googleapis entero. Techo: si algun dia hace
// falta Drive, Docs o subir archivos, ahi si vale la pena la libreria oficial.
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

type Credenciales = { client_email: string; private_key: string };

const SOLO_LECTURA = 'https://www.googleapis.com/auth/spreadsheets.readonly';
// Escribir pide el alcance completo. Lo que impide tocar lo que no toca son los
// rangos protegidos del documento, no el alcance (CEB-116).
const CON_ESCRITURA = 'https://www.googleapis.com/auth/spreadsheets';

const enBase64Url = (texto: string) => Buffer.from(texto).toString('base64url');

export function credenciales(ruta: string): Credenciales {
  return JSON.parse(readFileSync(ruta, 'utf8')) as Credenciales;
}

async function token(cred: Credenciales, alcance: string): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = enBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const cuerpo = enBase64Url(
    JSON.stringify({
      iss: cred.client_email,
      scope: alcance,
      aud: 'https://oauth2.googleapis.com/token',
      iat: ahora,
      exp: ahora + 3600,
    }),
  );
  const firma = createSign('RSA-SHA256')
    .update(`${cabecera}.${cuerpo}`)
    .sign(cred.private_key)
    .toString('base64url');

  const respuesta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${cabecera}.${cuerpo}.${firma}`,
    }),
  });

  const datos = (await respuesta.json()) as { access_token?: string; error_description?: string };
  if (!datos.access_token) throw new Error(`No se pudo autenticar: ${datos.error_description ?? 'sin detalle'}`);
  return datos.access_token;
}

async function pedir<T>(
  url: string,
  cred: Credenciales,
  alcance = SOLO_LECTURA,
  cuerpo?: unknown,
): Promise<T> {
  const respuesta = await fetch(url, {
    method: cuerpo ? 'POST' : 'GET',
    headers: {
      authorization: `Bearer ${await token(cred, alcance)}`,
      ...(cuerpo ? { 'content-type': 'application/json' } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });

  if (!respuesta.ok) {
    const { error } = (await respuesta.json()) as { error?: { message?: string } };
    const mensaje = error?.message ?? respuesta.statusText;
    if (respuesta.status === 403 && mensaje.includes('has not been used'))
      throw new Error(`Falta habilitar la API de Sheets en el proyecto.\n  ${mensaje}`);
    if (respuesta.status === 403)
      throw new Error(`La cuenta de servicio no tiene acceso al documento. Compártelo con ${cred.client_email}.\n  ${mensaje}`);
    throw new Error(mensaje);
  }

  return (await respuesta.json()) as T;
}

export async function pestanas(documentoId: string, cred: Credenciales): Promise<string[]> {
  const datos = await pedir<{ sheets: { properties: { title: string } }[] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${documentoId}?fields=sheets.properties.title`,
    cred,
  );
  return datos.sheets.map((h) => h.properties.title);
}

// Las filas llegan recortadas: una fila corta no tiene las celdas del final.
// El lector de bloques ya trata la celda ausente como vacia.
export async function leerPestana(
  documentoId: string,
  pestana: string,
  cred: Credenciales,
): Promise<string[][]> {
  const rango = encodeURIComponent(`'${pestana.replace(/'/g, "''")}'`);
  const datos = await pedir<{ values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${documentoId}/values/${rango}?majorDimension=ROWS`,
    cred,
  );
  return datos.values ?? [];
}

export type Celda = { rango: string; valor: string };

// Escribe celdas sueltas, cada una con su rango en notacion A1. No toca nada
// mas: no hay forma de que una escritura se lleve por delante una columna
// entera por descuido.
export async function escribirCeldas(
  documentoId: string,
  celdas: readonly Celda[],
  cred: Credenciales,
): Promise<number> {
  if (!celdas.length) return 0;

  const datos = await pedir<{ totalUpdatedCells?: number }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${documentoId}/values:batchUpdate`,
    cred,
    CON_ESCRITURA,
    {
      valueInputOption: 'RAW',
      data: celdas.map((c) => ({ range: c.rango, values: [[c.valor]] })),
    },
  );

  return datos.totalUpdatedCells ?? 0;
}

// La columna 0 es A: el documento empieza en la B.
export const letraDeColumna = (indice: number): string => {
  let n = indice;
  let letra = '';
  do {
    letra = String.fromCharCode(65 + (n % 26)) + letra;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letra;
};
