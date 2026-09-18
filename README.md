# Matriz de Eisenhower JFS

Cada empleado de JFS ve lo que le toca esta semana y deja constancia de lo que hizo
y de lo que no pudo. La matriz de Eisenhower es el marco de clasificación que decide
el orden y el color, nunca una pantalla.

El vocabulario está en [`CONTEXT.md`](./CONTEXT.md) y las decisiones de fondo en
[`docs/adr`](./docs/adr). El PRD técnico es **CEB-106**; esta base cubre por ahora
**CEB-107**.

## Forma del repositorio

```
packages/dominio/   logica pura, sin framework: calendario habil, ocurrencias, urgencia
apps/web/           Next: interfaz, rutas de servidor y adaptadores
supabase/           migraciones y datos de ejemplo
```

La frontera se sostiene sola: `packages/dominio` no declara ninguna dependencia y el
lint falla si intenta importar Next, React, Supabase o la app. Los componentes no
importan adaptadores; eso lo hacen las rutas de servidor (ADR 0005).

## Poner en marcha

```bash
pnpm install
cp .env.example apps/web/.env.local   # completar con el proyecto de Supabase
supabase start                        # la base local, en Docker, con volumen persistente
pnpm --filter @matriz/web dev
```

El desarrollo va contra la base local, no contra producción: en `.env.local` van
las claves que imprime `supabase start`. Los scripts leen primero las variables
del proceso, así que apuntar a producción es un gesto deliberado y no el descuido
de no mirar qué hay en el archivo:

```bash
env $(grep -v '^#' apps/web/.env.produccion.local | xargs) pnpm razones
```

Para tener datos con los que ver la aplicación:

```bash
pnpm importar --hoja "ADMINISTRACION " --crear-empleados --tipos-de-prueba --confirmar
pnpm acceso --confirmar   # sin esto los empleados existen en la base pero no ven nada
```

`pnpm invariantes` vacía las tablas locales. Si se lleva por delante los datos de
desarrollo, esos dos comandos los devuelven.

El correo de acceso tiene que apuntar a nuestro callback con el token en la
consulta, no en el fragmento: en **Authentication → Email Templates → Magic Link**,
el enlace va como

```
{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=magiclink
```

Con la plantilla por defecto, Supabase devuelve la sesion en el `#fragment`, que el
servidor nunca ve. Y en **URL Configuration**, la Site URL y las Redirect URLs deben
incluir el entorno desde el que se entra.

La base se crea con las migraciones de `supabase/migrations` y los datos de ejemplo de
`supabase/seed.sql`. Cada tabla nace con seguridad por fila activa y sin políticas no
devuelve nada: es cerrado por defecto y deliberado.

## Comprobar

```bash
pnpm test    # dominio, sin levantar Next
pnpm lint    # incluye la regla de fronteras
```

## Lo que falta

Las cinco periodicidades y el orden del plan (CEB-109), marcar (CEB-108), los flujos
(CEB-110), importar el documento (CEB-111) y la prueba de los doce invariantes
(CEB-118). Hasta entonces los datos se siembran a mano y solo se muestran funciones
mensuales de tipo entregable.

## Importar el documento

El documento de JFS es el formulario de entrada, no la base de datos (ADR 0001).
Se importa a mano, cuando alguien lo pide:

```bash
pnpm importar --pestanas                      # qué hojas tiene el documento
pnpm importar --hoja "FUNCIONES"              # muestra los cambios, no guarda nada
pnpm importar --hoja "FUNCIONES" --confirmar  # los aplica

# Sin acceso a Google, la salida de emergencia: exporta la hoja como TSV.
pnpm importar funciones.tsv
```

Lo que hace y lo que no:

- Lee bloques con celdas combinadas: el nombre del empleado es la fila
  combinada encima de cada encabezado `INDICADORES`. El bloque plantilla, sin
  nombre encima, se descarta; la fila de totales se salta sola.
- `MONTO`, `ASIGNACION` y `CLASIFICACION` **no se importan**: el sueldo nunca
  sale del documento.
- Un bloque que no existe en `empleado` no crea a nadie: se lista y se deja.
- Dos bloques con el mismo nombre no se importan: no se sabe de quién son.
- Lo que desaparece del documento se archiva (`activa = false`), nunca se borra:
  sus marcas siguen siendo ciertas.
- Un renombre se ve como un alta y una baja. Lo confirma una persona.
- El tipo y el día tope los propone el agente con `--tipificar` (CEB-114, Kimi).
  Sin él, la fila entra sin tipo: queda fuera del plan y a la vista de quien
  importa. El agente solo escribe `tipo_generado` y `dia_tope_generado`; lo que
  corrija una persona va en las columnas `_corregido` y siempre gana.

Para el agente hacen falta `AGENTE_API_KEY`, `AGENTE_MODELO` y `AGENTE_URL`.
Sirve cualquier API que hable el dialecto de OpenAI, así que **cambiar de
modelo o de proveedor es cambiar esas tres variables**, sin tocar código:

| Proveedor | `AGENTE_URL` | `AGENTE_MODELO` |
|---|---|---|
| Kimi (Moonshot) | `https://api.moonshot.ai/v1` | `kimi-k3` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Groq | `https://api.groq.com/openai/v1` | el que toque |
| OpenAI | `https://api.openai.com/v1` | el que toque |

Esa clave nunca va en una variable `NEXT_PUBLIC_`: el agente corre en la
importación, a mano, nunca en el navegador.

En `apps/web/.env.local` necesita tres cosas más: `SUPABASE_SERVICE_ROLE_KEY`,
`GOOGLE_CREDENCIALES` (ruta al JSON de la cuenta de servicio, que vive **fuera
del repo**) y `DOCUMENTO_ID`. El rol `service_role` se salta la seguridad por
fila, así que esto corre a mano y solo aquí, nunca desde el servidor web.

La cuenta de servicio entra al documento como una persona más: hay que
compartirle la copia. Solo pide `spreadsheets.readonly`; escribir la pestaña de
razones es otro alcance y otro ticket (CEB-116).

## Quién puede escribir en el documento

Cada superficie tiene un solo dueño de escritura, y eso lo hacen cumplir los
rangos protegidos de la hoja, no la buena conducta del código:

```bash
pnpm proteger              # dice qué protegería, no toca nada
pnpm proteger --confirmar  # protege lo que puede
```

- `RAZONES` la escribe **la aplicación**. Es una proyección que se regenera
  entera en cada marca, así que lo que alguien escriba ahí a mano se pierde. El
  comando la protege dejando solo a la cuenta de servicio.
- Las hojas de funciones las escribe **JFS**; la aplicación solo lee. Esa
  protección **no puede crearla el comando**: Google responde *"You can't remove
  yourself as an editor"* cuando la cuenta intenta excluirse a sí misma, y tiene
  razón — si pudiera excluirse también podría incluirse. La pone el dueño del
  documento a mano, en Datos → Proteger hojas y rangos → "Restringir quién puede
  editar" → Personalizado, quitando el visto a la cuenta de la aplicación.

El dueño se configura en `DUENO_DEL_DOCUMENTO`. Ojo con un límite de Google: el
propietario del archivo siempre puede editar todo y no se le puede excluir.
