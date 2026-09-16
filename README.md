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
