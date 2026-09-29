# PRD: Cada empleado pertenece a una empresa del grupo

> Sale del `grill-with-docs` del 2026-09-29. Copia en el repo de CEB-184. El vocabulario está en `CONTEXT.md` (**Empresa**, **Sede**, y **Día hábil** / **Día no hábil**, que ahora son del grupo).

## Problem Statement

JFS es un grupo de empresas: KIA, Changan, Toyota e Induvenpa, más la gente que trabaja para el grupo y no para una sola. El sistema no lo sabe: todos los empleados son "de JFS", sin más. Cuando el administrador quiere ver cómo va la gente de Toyota, o qué se arrastra en un concesionario de KIA, tiene que saber de memoria quién es de dónde y recorrer persona por persona. Al supervisor le pasa lo mismo con su equipo cuando tiene gente de varias empresas.

## Solution

**Cada empleado pertenece a exactamente una empresa**: la que le paga, no para la que trabaja (eso lo dicen sus funciones). Las empresas son cinco: KIA, Changan, Toyota, Induvenpa y **Holding**, que es la de quien trabaja para el grupo. JFS sigue siendo el grupo, no una empresa más.

**Una persona puede tener una sede**: uno de los concesionarios de una empresa que tiene varios. Hoy solo KIA y Changan, con dos cada una. La sede siempre es de la empresa de la persona. **Sin sede significa todas las sedes de su empresa**: quien cubre los dos concesionarios de KIA aparece al buscar cualquiera de ellos. No tener sede no es un dato que falta.

**La empresa y la sede agrupan y no limitan nada.** Se supervisa y se traspasa entre empresas, y el calendario es uno para todo el grupo. Son un dato de la persona hoy: si cambia de empresa, todo su pasado se agrupa con la nueva.

**Se filtra por empresa y por sede, y se busca por texto**, en El equipo, Qué se arrastra y Razones del administrador, y en la pantalla de equipo del supervisor. El buscador encuentra por nombre de la persona, de su empresa o sede, o por el texto de una de sus funciones, sin distinguir mayúsculas ni tildes. La lista de empresas y sedes es fija: una nueva entra por migración, no desde la pantalla.

## User Stories

**Administrador**

1. Como administradora, quiero elegir la empresa de alguien al darlo de alta, para que nadie entre al sistema sin saber de dónde es.
2. Como administradora, quiero elegir opcionalmente su sede al darlo de alta, para distinguir el concesionario cuando importa.
3. Como administradora, quiero que el selector de sede solo me ofrezca sedes de la empresa elegida, para no poder equivocarme de concesionario.
4. Como administradora, quiero cambiar la empresa y la sede de alguien desde su ficha, para que el sistema siga a la realidad cuando cambia de nómina o de concesionario.
5. Como administradora, quiero quitarle la sede a alguien, para decir que cubre todos los concesionarios de su empresa.
6. Como administradora, quiero que al cambiarle la empresa a alguien se le quite una sede que ya no corresponde, para que nunca quede con una sede de otra empresa.
7. Como administradora, quiero ver la empresa (y la sede, si tiene) de cada persona en la lista de El equipo, para saber de dónde es cada quien de un vistazo.
8. Como administradora, quiero filtrar El equipo por empresa, para ver solo a la gente de Toyota.
9. Como administradora, quiero filtrar El equipo por sede, para ver solo a la gente de un concesionario de KIA, incluida la que cubre los dos.
10. Como administradora, quiero filtrar Qué se arrastra por empresa o sede, para saber qué está fallando en una empresa sin leer a todos.
11. Como administradora, quiero filtrar Razones por empresa o sede junto con los filtros de persona y función que ya existen, para leer las razones de una empresa.
12. Como administradora, quiero que el filtro viva en la dirección de la página, para poder compartir o volver a "Qué se arrastra en Changan".
13. Como administradora, quiero que el filtro de sede solo aparezca cuando la empresa elegida tiene sedes, para no ver opciones vacías en Toyota, Induvenpa u Holding.
14. Como administradora, quiero poder quitar el filtro y volver a ver a todo el grupo, para no perder la vista completa.
15. Como administradora, quiero que filtrar no cambie el orden de Qué se arrastra, para que siga ordenado por ponderación arrastrada.
16a. Como administradora, quiero buscar por el texto de una función ("cierre"), por el nombre de una persona o por el de una empresa, para llegar a lo que busco sin recorrer la lista.
16b. Como administradora, quiero que la búsqueda se combine con el filtro de empresa y sede, para encontrar "los cierres de la gente de Toyota".
16c. Como administradora, quiero que la búsqueda no distinga mayúsculas ni tildes, para que "funcion" encuentre "función".
16. Como administradora, quiero seguir pudiendo supervisar y traspasar entre empresas, para que la pertenencia no me estorbe el reparto.

**Supervisor**

17. Como supervisora con gente de varias empresas, quiero filtrar mi equipo por empresa o sede, para concentrarme en un concesionario.
18. Como supervisora, quiero ver la empresa de cada persona de mi equipo, para saber de dónde es.
18a. Como supervisora, quiero buscar en mi equipo por persona, empresa o texto de función, para encontrar rápido a quién le toca algo.
19. Como supervisora, quiero que el filtro y la búsqueda nunca me muestren a nadie que no esté a mi cargo, para que filtrar no sea una forma de ver más.
20. Como supervisora, quiero no poder cambiar la empresa ni la sede de nadie, porque eso es del administrador.

**Empleado**

21. Como empleado, quiero que pertenecer a una empresa no cambie mi pantalla ni mi calendario, porque el grupo descansa entero.

## End-to-End Invariants

Los de CEB-106, CEB-128, CEB-145, CEB-146 y CEB-147 siguen vigentes; INV-2 e INV-3 en particular no cambian. Cada invariante necesita su prueba de trazador sobre el cableado real (Supabase local, sesiones reales de administrador, supervisor y empleado, sin llave de servicio en el servidor web), y este PRD no se cierra hasta que pasen.

**INV-29 · Filtrar y buscar solo acotan lo que ya se ve.** Una persona aparece al filtrar por su empresa; al filtrar por una sede, aparece si es de esa sede o si no tiene sede y su empresa es la de la sede; nunca aparece bajo otra empresa. Ningún filtro ni búsqueda le muestra a alguien más de lo que vería sin filtrar.
Prueba: KIA con dos sedes; una persona en la sede A, otra en la B, otra de KIA sin sede, otra de Toyota. Como administrador: filtrar KIA trae a las tres de KIA; filtrar la sede A trae a la de A y a la sin sede; filtrar Toyota trae solo a la de Toyota. Como supervisora con gente de KIA y Toyota y un vecino de KIA fuera de su equipo: filtrar KIA nunca trae al vecino, y buscar el nombre del vecino o el texto de una función suya no trae nada.

**INV-30 · La sede de una persona siempre es de su empresa.**
Prueba: dar de alta con una sede de otra empresa se rechaza; editar la sede a una de otra empresa se rechaza; cambiar la empresa de alguien con sede sin quitarle la sede se rechaza o se la quita, nunca la deja cruzada. Consulta directa a la base: ninguna fila de empleado con sede de otra empresa.

**INV-31 · Solo el administrador escribe la empresa y la sede de alguien.**
Prueba: un empleado y una supervisora intentan cambiar su propia empresa, la de otro y la sede de alguien de su equipo, por la web y por consulta directa a la base; se rechazan todos. El administrador lo hace y queda.

## Implementation Decisions

**El modelo**

- Una tabla `empresa` (nombre) y una tabla `sede` (nombre, empresa). Fijas: la migración del esquema carga las cinco empresas; las sedes llegan con la tarea HITL. No hay pantalla para editar ninguna de las dos.
- `empleado` suma `empresa_id` y `sede_id`, esta última nullable. Una clave foránea compuesta de `(sede_id, empresa_id)` contra `sede` hace que la base rechace una sede de otra empresa (INV-30 por construcción).
- `empresa_id` nace nullable porque la gente de hoy no tiene empresa. La tarea final (HITL) carga la lista persona → empresa → sede y vuelve obligatoria la columna. Hasta entonces, alguien sin empresa simplemente no aparece al filtrar por ninguna; no hay opción "sin empresa" en la pantalla.
- Sin historia: la empresa es la de hoy. Sin restricciones sobre supervisión, traspaso ni calendario.
- Nombres de las sedes: los da la tarea HITL. La migración del esquema no las inventa: las sedes se cargan junto con la lista.

**El acceso** (ADR 0004)

- Empresa y sede las escribe solo el administrador, por `dar_de_alta` y `editar_empleado`, que suman los dos parámetros (la sede, opcional). Los empleados no reciben permiso de columna sobre ellas.
- `empresa` y `sede` se pueden leer por cualquier sesión autenticada: son nombres del grupo, no datos de nadie.
- El supervisor sigue leyendo a su gente solo por `lo_de_mi_gente`, que suma empresa y sede de cada persona. El filtro se aplica sobre lo que ya devuelve; nunca es un parámetro que amplíe la consulta (INV-29).

**El dominio puro**

- **Filtro del equipo**, un módulo nuevo y profundo:
  - `coincide(persona, filtro)`: dados `{nombre, empresa, sede | null, funciones}` de una persona y un filtro `{empresa?, sede?, texto?}`, dice si entra. Sin filtro, entra todo. Con empresa, entra si es su empresa. Con sede, entra si es su sede, o si no tiene sede y la sede es de su empresa. Con texto, entra si el texto aparece en su nombre, en el de su empresa o sede, o en el texto de alguna de sus funciones, sin distinguir mayúsculas ni tildes. Todo lo que trae el filtro se combina con "y".
  - Cada pantalla decide qué muestra de quien entra: El equipo, la persona; Qué se arrastra y Razones, sus filas (si el texto coincide por función, solo las de esa función).
  - Dadas las empresas y sedes, arma las opciones del filtro: la sede solo se ofrece para empresas que tienen sedes.
  - Todas las pantallas filtran con él; ninguna reimplementa la regla de "sin sede es todas" ni la de comparar texto.

**Las lecturas**

- `gente`, `reporte`, `razonesDelEquipo` y `lo_de_mi_gente` suman empresa y sede de cada persona. El filtro se aplica en el servidor con `coincide`, después de leer.

**La pantalla**

- Un filtro compartido de empresa y sede que vive en la dirección (`?empresa=…&sede=…&q=…`), como Razones ya usa `?persona=` y `?funcion=`. Sin JavaScript de cliente más allá de lo que ya use la pantalla.
- Va en El equipo (admin), Qué se arrastra, Razones y equipo (supervisor). Filtrar no cambia el orden de ninguna lista.
- La lista de El equipo muestra la empresa y la sede de cada persona; la de supervisor, la empresa en el resumen de cada acordeón.
- Dar de alta suma "Empresa" (obligatoria) y "Sede" (opcional, solo con las de esa empresa). La ficha del empleado suma lo mismo para editar.

## Testing Decisions

- Un buen test prueba comportamiento externo (entradas del dominio contra salidas, o sesiones reales contra la base) y nunca la forma interna.
- **Dominio puro, con tests unitarios**: Filtro del equipo — texto sin mayúsculas ni tildes; texto por nombre, por empresa, por función; texto combinado con empresa; sin filtro entra todo; por empresa; por sede con sede propia; sin sede entra en todas las sedes de su empresa y en ninguna de otra; una sede de otra empresa nunca coincide; opciones de filtro sin sedes para las empresas que no tienen. Prior art: `imprevistos.test.ts`, `delegacion.test.ts`.
- **Pruebas de trazador** en `pruebas/` para INV-29, INV-30 e INV-31, contra Supabase local con sesiones reales. Prior art: `inv-2-aislamiento`, `inv-25-supervisor`.
- **Sin tests de módulo** para la web: queda cubierta por INV-29.

## Out of Scope

- **Calendario por empresa.** El grupo descansa entero; si un día Toyota tiene un feriado propio, es otro PRD.
- **Límites por empresa**: supervisar o traspasar solo dentro de la misma empresa.
- **Un administrador por empresa**, o cualquier forma de multi-tenant.
- **Historia de pertenencia.** La empresa es la de hoy.
- **Editar empresas y sedes desde la pantalla.** Se agregan por migración.
- **Varias empresas por persona.** Para quién trabaja lo dicen sus funciones.
- **Que el empleado vea su empresa** en su propia pantalla.
- **Una columna de empresa en la descarga.** Que la pida el uso.

## Further Notes

- **Holding** existe para que nadie quede sin empresa: la gente del grupo tiene un empleador y un filtro, y no hay un caso "sin empresa" que cuidar en cada pantalla.
- **Sede** y no *sucursal* ni *concesionario*: Holding también podría tener sedes y no vende carros.
- El glosario decía "Día hábil: un día en que esta empresa trabaja" y "cuando la empresa descansa, descansa entera". Ahora dice el grupo: con cinco empresas, "esta empresa" era ambiguo.
- Las sedes (CEB-191): KIA · 212, KIA · Centro, Changan · Caracas y Changan · Auto Bengala. Toyota e Induvenpa tienen sede única, así que no tienen ninguna cargada. "Cierre Auto Bengala" es una función sobre esa sede de Changan.
