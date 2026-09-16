# Un solo desplegable: Next, con el dominio en un paquete puro

**Reemplaza la decision del 2026-09-15 de separar un backend NestJS de la interfaz.**

El monorepo tiene dos espacios de trabajo: `packages/dominio`, puro y sin framework
--calendario habil, ocurrencias, plan, cierre de mes, lector del documento y
reconciliacion--, y `apps/web`, una aplicacion Next con la interfaz, sus rutas de
servidor, los adaptadores y el comando de importacion. Un solo desplegable.

Descartamos el backend NestJS aparte por cuatro razones. Con la sesion en cookies
de Supabase, cada consulta desde el servidor de Next ya lleva el token del
empleado, asi que la seguridad por fila aplica sin plomeria; un backend separado
obliga a reenviar y verificar ese token a mano, que es justo de lo que depende el
INV-2. El dominio puro convierte la eleccion de adaptador en una decision barata:
hoy rutas de servidor, mañana controladores, sin tocar logica ni tests. Hay un
solo consumidor, la interfaz, y dos desplegables para nueve usuarios cuestan CORS,
variables duplicadas y un proceso mas en cada prueba de trazador. Y el dominio es
calculo sobre fechas y filas, no agregados con invariantes: el andamiaje CQRS del
equipo no tendria que sostener.

## Consecuencias

- `packages/dominio` no importa nada de `apps/web`, y lo impide el paquete, no una
  convencion de carpetas. Una regla de lint impide ademas que los componentes
  importen adaptadores.
- Señal de fuga: si un test del dominio necesita levantar Next, la logica se
  filtro a la interfaz.
- La llave de servicio solo la usan la importacion y la proyeccion de razones, que
  corren en servidor. El navegador nunca consulta tablas.
- Se pierde el andamiaje NestJS que el equipo genera con su skill; la disciplina
  hexagonal se sostiene con la frontera de paquetes y la regla de lint.
- El dia que haya un segundo consumidor --la pantalla de JFS, las herramientas de
  la etapa 5 u otro sistema-- se agrega una aplicacion que importa el mismo
  dominio, y se mueve el adaptador. Revisar entonces, no antes.
