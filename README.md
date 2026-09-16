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
pnpm --filter @matriz/web dev
```

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
# Exporta la hoja de funciones como TSV, con sus bloques tal cual.
pnpm importar funciones.tsv              # muestra los cambios, no guarda nada
pnpm importar funciones.tsv --confirmar  # los aplica
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
- El tipo y el día tope los propone el agente (CEB-114). Sin él, la fila entra
  sin tipo: queda fuera del plan y a la vista de quien importa.

Necesita `SUPABASE_SERVICE_ROLE_KEY` en `apps/web/.env.local`. Ese rol se salta
la seguridad por fila, así que solo corre aquí, a mano, nunca desde el servidor
web.
