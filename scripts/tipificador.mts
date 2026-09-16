// Agente de tipificacion (CEB-114). Implementa el puerto Tipificador contra
// cualquier API que hable el dialecto de OpenAI: Kimi, DeepSeek, Groq, la
// propia OpenAI. El proveedor no aparece en el codigo, solo en el entorno
// (AGENTE_URL, AGENTE_MODELO, AGENTE_API_KEY), asi que cambiarlo no es un
// cambio de programa sino de configuracion.
//
// El agente PROPONE: escribe tipo_generado y dia_tope_generado y nada mas. Lo
// que una persona corrija vive en las columnas _corregido y siempre gana. Una
// propuesta que no pase interpretar() deja la fila sin tipo, fuera del plan y
// a la vista de quien importa.
import type { Propuesta, Tipificador } from '@matriz/dominio';

const INSTRUCCIONES = `Clasificas funciones de trabajo de un grupo de empresas venezolano.
Cada función viene escrita por su gerencia, en mayúsculas y con la cadencia metida en la propia frase.

Devuelve JSON: {"tipo": string, "diaTope": number|null, "confianza": number}

tipo, exactamente uno de:
- "entregable": produce algo concreto con fecha. Se termina. Ej: "CIERRE FINANCIERO AUTO BENGALA (ANTES DEL 3 DE CADA MES)", "DECLARACIONES AL SENIAT".
- "flujo": trabajo continuo que se sostiene, no se termina. Ej: "CUENTAS POR PAGAR MDV", "REGISTRO DE FACTURAS", "RECEPCION DE VEHICULOS".
- "area": una responsabilidad amplia del cargo, no una tarea. Ej: "ASISTENCIA A LA GERENCIA", "TESORERIA".
- "holgura": espacio para lo imprevisto. Ej: "URGENTES", "URGENTES (SOLICITAR REINTEGROS, REVISAR CORREOS ETC)".

diaTope: si la frase dice un día del mes ("ANTES DEL 3", "FECHA TOPE 02 DE CADA MES"), ese número. Si no, null.
Las áreas y las holguras nunca llevan diaTope: no se agendan.

confianza: 0 a 1. Si la frase es ambigua, baja de 0.6 y que lo revise una persona.
Responde solo el JSON.`;

type Ajustes = { clave: string; modelo: string; url: string };

// Un fallo de red no es una duda del modelo, pero acaba igual: la funcion se
// queda sin tipo. Dos reintentos cortos separan una cosa de la otra.
const INTENTOS = 3;
const espera = (ms: number) => new Promise((sigue) => setTimeout(sigue, ms));

export function tipificadorRemoto({ clave, modelo, url }: Ajustes): Tipificador {
  return {
    async proponer(texto: string): Promise<Propuesta> {
      let ultimoFallo: unknown;

      for (let intento = 1; intento <= INTENTOS; intento++) {
        try {
          return await preguntar(texto);
        } catch (fallo) {
          ultimoFallo = fallo;
          if (intento < INTENTOS) await espera(intento * 500);
        }
      }
      throw ultimoFallo;
    },
  };

  async function preguntar(texto: string): Promise<Propuesta> {
      const respuesta = await fetch(`${url}/chat/completions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${clave}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: modelo,
          // ponytail: sin temperature. Cada proveedor tiene sus manias (kimi-k3
          // solo admite 1) y su valor por defecto sirve: lo que importa es que
          // el JSON sea valido, y de eso se encarga response_format.
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: INSTRUCCIONES },
            { role: 'user', content: texto },
          ],
        }),
      });

      if (!respuesta.ok) {
        const detalle = await respuesta.text();
        throw new Error(`${modelo} respondió ${respuesta.status}: ${detalle.slice(0, 300)}`);
      }

      const datos = (await respuesta.json()) as { choices?: { message?: { content?: string } }[] };
      const contenido = datos.choices?.[0]?.message?.content;
      if (!contenido) throw new Error(`${modelo} respondió sin contenido`);

      // Lo que venga se valida con interpretar(): aqui solo se parsea.
      const crudo = JSON.parse(contenido) as { tipo?: string; diaTope?: number | null; confianza?: number };
      return {
        tipo: String(crudo.tipo ?? ''),
        diaTope: crudo.diaTope ?? undefined,
        confianza: Number(crudo.confianza ?? 0),
      };
  }
}
