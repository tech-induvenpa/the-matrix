# PRD: El perfil de la tarea, con sus comentarios

> Sale del `grill-with-docs` del 2026-09-29. Copia en el repo de CEB-198. El vocabulario está en `CONTEXT.md` (**Perfil de la tarea** y **Comentario**, nuevos). Sin ADR: ninguna decisión es cara de revertir.

## Problem Statement

Hoy una tarea solo habla a través de su marca. Todo lo que pasa antes --"el cliente cambió la fecha", "¿esto es para el cierre o para el informe?", "ojo, falta la firma de Carla"-- se dice por fuera del sistema, por WhatsApp o de pasillo, y se pierde. Cuando la tarea se marca "no pude", la razón llega sola, sin la conversación que la explica.

Además, el supervisor y el administrador no pueden abrir las ocurrencias de nadie: en el equipo y en la ficha del empleado solo ven sus imprevistos. No tienen dónde decir nada sobre una ocurrencia ajena aunque la estén viendo avanzar mal.

## Solution

**Cada tarea tiene un perfil.** Al hacer clic en una tarjeta de ocurrencia o de imprevisto (las delegaciones incluidas), la tarjeta se agranda en su lugar y muestra su historia como una línea de tiempo, con un emoji al principio de cada línea:

| Evento | Emoji | Cuándo aparece |
|---|---|---|
| Lo pidió X | 📥 | imprevisto |
| X te lo delegó | 🤝 | delegación |
| Devuelto por X: *razón* | ↩️ | delegación que nace de una devuelta |
| Comentario | 💬 | cada uno, con autor y fecha |
| Venció sin marca | ⏰ | solo si pasó el vencimiento sin marcar |
| Hecho / No pude / No lo tomé (*razón*) | ✅ / ❌ / 🙅 | al final, si está marcada |

Una ocurrencia no tiene evento de nacimiento: es calculada, empieza con su primer comentario. Los flujos no tienen perfil: no se marcan.

**Mientras la tarea no está marcada, se puede comentar.** Texto plano, sin adjuntos ni menciones. Un comentario no se edita ni se borra: un error se corrige con otro. Marcada, el perfil se sigue abriendo pero solo se lee; si se deshace la marca, se vuelve a poder comentar.

**Quién comenta y lee** (el círculo de hoy):

| Tarea de… | Comentan y leen |
|---|---|
| Un empleado | él, su supervisor y el administrador; en un imprevisto, además quien lo pidió |
| Un supervisor | él y el administrador |
| Una delegación | quien la recibe, el supervisor que la pidió y el administrador |

El perfil dice quién lo lee. La delegación y la ocurrencia que cumple tienen comentarios separados: quien la recibe no ve las tareas de su supervisor. En un traspaso, los comentarios de la ocurrencia abierta se van con ella, y los lee el círculo nuevo.

**Sin leer.** Un comentario de otro que no has visto enciende un punto en la tarjeta y, para el supervisor y el administrador, junto al nombre de la persona. Se apaga al abrir el perfil. Una tarea marcada no tiene nada sin leer.

**Lista por persona.** En el equipo del supervisor y en la ficha de cada empleado del administrador, las tareas abiertas de la persona --ocurrencias e imprevistos, sin separar-- en una sola lista ordenada por urgencia y luego importancia (un imprevisto cuenta con importancia 0). Desde ahí se abre el perfil y se comenta; no se marca ni se delega.

**Lo que pedí.** Un supervisor que pidió imprevistos a gente fuera de su equipo los ve abiertos en una sección propia, con su perfil y su punto de sin leer.

## User Stories

**Empleado**

1. Como empleado, quiero hacer clic en una tarea y ver su perfil en la misma tarjeta, para no perder de vista mi lista.
2. Como empleado, quiero escribir un comentario en una tarea sin marcar, para dejar constancia de lo que está pasando antes de cerrarla.
3. Como empleado, quiero ver los comentarios en orden con su fecha y quién los escribió, para seguir la conversación.
4. Como empleado, quiero saber quién lee lo que escribo, para escribir sabiendo quién está al otro lado.
5. Como empleado, quiero ver un punto en la tarjeta cuando mi supervisor o el administrador me comentan, para enterarme sin abrir cada tarea.
6. Como empleado, quiero que el punto se apague al abrir el perfil, para saber qué ya leí.
7. Como empleado, quiero que mis propios comentarios nunca cuenten como sin leer, para que el punto signifique algo.
8. Como empleado, quiero ver en el perfil de un imprevisto quién me lo pidió y cuándo, para tener el contexto al lado de la conversación.
9. Como empleado, quiero ver en el perfil de una delegación quién me la delegó y, si viene de una devuelta, la razón con que me la devolvieron, para saber qué corregir.
10. Como empleado, quiero ver en el perfil cuándo venció una tarea que no marqué a tiempo, para situar los comentarios antes y después de vencer.
11. Como empleado, quiero ver al final del perfil mi marca con su razón, para que la historia termine donde terminó.
12. Como empleado, quiero poder abrir el perfil de una tarea ya marcada desde "ya resueltas" o desde el mes, para releer lo que se dijo.
13. Como empleado, quiero que una tarea marcada ya no acepte comentarios, para que nadie reescriba la historia después del cierre.
14. Como empleado, quiero que al deshacer una marca se pueda volver a comentar, para que la tarea reabierta vuelva a estar viva.
15. Como empleado, quiero que un comentario no se pueda editar ni borrar, para que lo que se dijo antes de la marca no cambie después.
16. Como empleado, quiero que cada línea del perfil empiece con un emoji del evento, para leer la historia de un vistazo.
17. Como empleado, quiero que el perfil tenga su propio link, para llegar directo a una tarea desde un aviso o compartirla.
18. Como empleado, quiero cerrar el perfil con otro clic o con Esc, y que abrir otro cierre el anterior, para no llenar la pantalla.
19. Como empleado que recibe un traspaso, quiero ver los comentarios que tenía la ocurrencia abierta, para heredar el contexto junto con el trabajo.
20. Como empleado que traspasó una función, quiero dejar de ver los comentarios de la ocurrencia que ya no es mía, igual que dejo de verla.

**Supervisor**

21. Como supervisor, quiero ver las tareas abiertas de cada persona de mi equipo en una sola lista, ocurrencias e imprevistos juntos, para ver qué le aprieta hoy.
22. Como supervisor, quiero que esa lista se ordene por urgencia y luego importancia, para que lo que vence antes esté arriba.
23. Como supervisor, quiero que ese orden no delate la ponderación de nadie, para no saber lo que no me corresponde.
24. Como supervisor, quiero abrir el perfil de la tarea de alguien de mi equipo y comentarla, para decirle algo sin salir del sistema.
25. Como supervisor, quiero que desde esa lista no se pueda marcar ni delegar, para que quien marca siga siendo el titular.
26. Como supervisor, quiero ver un punto junto al nombre de quien tiene comentarios sin leer para mí, para saber a quién mirar.
27. Como supervisor, quiero comentar en mis propias tareas y que las lea el administrador, para dejar constancia como cualquier empleado.
28. Como supervisor, quiero que mi equipo no vea los comentarios de mis ocurrencias, porque no ve mis tareas.
29. Como supervisor, quiero conversar con quien recibió una delegación en el perfil de la delegación, para hablarle de lo que le pedí.
30. Como supervisor, quiero ver en una sección "Lo que pedí" los imprevistos abiertos que le pedí a gente de otros equipos, para seguirlos y comentarlos.
31. Como supervisor, quiero que al cambiarme a alguien del equipo deje de ver sus comentarios, igual que dejo de verlo a él.

**Administrador**

32. Como administrador, quiero la misma lista por persona en la ficha de cada empleado, para seguir a cualquiera.
33. Como administrador, quiero comentar en cualquier tarea abierta de cualquier empleado o supervisor, para dar indicaciones donde está el trabajo.
34. Como administrador, quiero ver un punto junto al nombre de cada persona con comentarios sin leer para mí, porque solo tengo la vista de personas.
35. Como administrador, quiero que la base rechace un comentario de quien no está en el círculo, aunque lo intente desde fuera de la pantalla, para que la regla no dependa de la interfaz.
36. Como administrador, quiero que la base rechace un comentario en una tarea marcada, por la misma razón.
37. Como administrador, quiero que la fecha de un comentario la ponga la base, para que nadie la corra.

## End-to-End Invariants

Los de CEB-106, CEB-128, CEB-145, CEB-146, CEB-147, CEB-184 y CEB-192 siguen vigentes. Cada invariante necesita su prueba de trazador sobre el cableado real (Supabase local, sesiones reales de empleado, supervisor y administrador, sin llave de servicio en el servidor web), y este PRD no se cierra hasta que pasen.

**INV-34 · Solo el círculo de hoy lee y escribe los comentarios de una tarea.**
Prueba: con un empleado A (supervisor S), un empleado B de otro equipo (supervisor S2) y el administrador. Un comentario en una ocurrencia de A: lo leen A, S y el administrador; B y S2 no lo ven ni pueden comentar. En un imprevisto de A pedido por S2: S2 lo lee y comenta. En una ocurrencia de S: la leen S y el administrador; A no. En una delegación de S a A: la leen A, S y el administrador, y A sigue sin ver los de la ocurrencia de S. Tras traspasar a B la función de A con la ocurrencia abierta: B y S2 la leen con sus comentarios anteriores; A y S ya no.

**INV-35 · Una tarea marcada no admite comentarios; deshacer la marca los vuelve a admitir.**
Prueba: comentar una ocurrencia y un imprevisto abiertos → aceptado. Marcarlos → comentar por consulta directa, como titular y como administrador → rechazado. Deshacer la marca de la ocurrencia → aceptado otra vez. Una ocurrencia vencida sin marca → aceptado.

**INV-36 · Un comentario nunca cambia ni desaparece, y su fecha la pone la base.**
Prueba: como autor y como administrador, intentar por consulta directa editar el texto, el autor o la fecha de un comentario, o borrarlo → sin efecto. Insertar un comentario con una fecha o un autor inventados → se rechaza: esas columnas no se escriben, como `pedido_en` en el imprevisto. Nunca queda una fecha ni un autor que no pusiera la base.

**INV-37 · "Sin leer" se enciende con el comentario de otro y se apaga al abrir el perfil.**
Prueba: S comenta en una tarea de A → para A está sin leer, en la tarjeta; para el administrador, sin leer junto al nombre de A; para S, no. A abre el perfil por la acción del servidor → para A ya no está sin leer; para el administrador sigue. A comenta → para A no se enciende nada. A marca la tarea → para el administrador ya no hay nada sin leer en ella.

## Implementation Decisions

**El dominio puro**

- **Línea de tiempo**: `lineaDeTiempo(tarea, comentarios, hoy)` devuelve los eventos ordenados por fecha, cada uno `{ tipo, emoji, quien, cuando, texto? }`. `tarea` es una ocurrencia (con su vencimiento y su marca, si tiene) o un imprevisto (con quien lo pidió, cuándo, si es delegación, la devolución que lo originó y su marca). Arma 📥, 🤝, ↩️, 💬, ⏰ (solo si `vence < hoy` y no hay marca, fechado en el vencimiento) y ✅/❌/🙅 con razón. Es el módulo profundo: toda la regla del perfil vive aquí y la pantalla solo pinta.
- **Sin leer**: `sinLeer(comentarios, vistoEn, yo, marcada)` es verdadero si hay un comentario de otro posterior a `vistoEn` (o cualquiera de otro si nunca se abrió) y la tarea no está marcada. Un agregado por persona (`haySinLeer` sobre sus tareas) alimenta el punto junto al nombre.
- **Lista por persona**: `listaDeTareas(ocurrencias, imprevistos, hoy, calendario)` mezcla las abiertas (sin marca, vencidas o no, sin borrar) y ordena por urgencia descendente, luego importancia descendente; un imprevisto cuenta con importancia 0. No mira la ponderación.
- **Círculo**: quién lee es regla de la base, no del dominio; el dominio solo arma el texto de "lo leen: …" para la pantalla.

**La base** (una migración nueva)

- **`comentario`**: `id`, `funcion_id` + `periodo` **o** `imprevisto_id` (un check exige exactamente uno), `autor` (usuario, lo pone la base con `auth.uid()`), `escrito_en` (lo pone la base), `texto` no vacío. Solo se concede insert y select: sin update ni delete para nadie.
- **Seguridad por fila**: el select y el insert se permiten si quien consulta es el titular de hoy de la función (o el empleado del imprevisto), su supervisor de hoy, el administrador o, en un imprevisto, quien lo pidió (`pedido_por`). Se resuelve con una función `puede_ver_tarea(...)` `security definer`, hermana de las que ya usa el supervisor. Como el círculo se calcula al leer, el traspaso y el cambio de supervisor no tocan ninguna fila.
- **Un trigger al insertar** rechaza el comentario si la tarea tiene marca (fila en `marca` para la ocurrencia, `resultado` no nulo en el imprevisto) o si el imprevisto está borrado.
- **`comentario_visto`**: `(usuario, funcion_id + periodo | imprevisto_id, visto_en)`, único por usuario y tarea; cada quien solo lee y escribe lo suyo. Abrir el perfil hace upsert con `now()` de la base.
- **Lectura para el supervisor y el administrador**: hoy no leen las ocurrencias ni las marcas de otros como tarjetas. La lista por persona necesita las funciones abiertas de la persona con su importancia y su periodicidad, sin ponderación para el supervisor; se reutiliza lo que ya lee el supervisor de su equipo (CEB-145) y se amplía lo que falte con la misma regla.
- **"Lo que pedí"**: una consulta de los imprevistos abiertos con `pedido_por = auth.uid()` cuyo empleado no es del equipo de quien consulta, hermana de la de delegadas. Quien lo pidió ya puede leer esas filas por la regla del círculo.

**La pantalla**

- **`PerfilDeTarea`**: se abre dentro de `Tarjeta` y de `TarjetaDeImprevisto` al hacer clic; la tarjeta crece en su lugar. El estado vive en la URL (`?tarea=o:<funcion>:<periodo>` o `?tarea=i:<imprevisto>`): una a la vez, se cierra con otro clic o Esc. Pinta la línea de tiempo, la caja de comentario (solo si no está marcada) y "lo leen: …". Al abrir, registra que lo vio.
- Se abre desde toda tarjeta de tarea: la semana, el mes, "ya resueltas", "lo que te cayó", delegadas, "lo que pedí" y la lista por persona. No desde los flujos.
- **Lista por persona** en el equipo del supervisor y en la ficha del empleado del administrador, con tarjetas de solo lectura (sin hecho, no pude ni delegar) más el perfil. En el imprevisto se conserva lo que cada rol ya puede hacer hoy (borrar lo que registró).
- **El punto de sin leer** en cada tarjeta y junto al nombre de cada persona en el equipo y en la lista de empleados del administrador.
- **"Lo que pedí"**: sección del supervisor, calcada de delegadas.

## Testing Decisions

- Un buen test prueba comportamiento externo --entradas del dominio contra salidas, o sesiones reales contra la base-- y nunca la forma interna.
- **Dominio, línea de tiempo**: orden por fecha; emoji de cada tipo; ⏰ solo si venció sin marca, y no si se marcó antes o todavía no vence; la marca al final con su razón; imprevisto con 📥, delegación con 🤝, delegación que viene de una devuelta con ↩️ y su razón; ocurrencia sin evento de nacimiento. Prior art: `delegacion.test.ts`, `intromision.test.ts`.
- **Dominio, sin leer**: comentario de otro posterior a la vista → sí; anterior → no; propio → no; nunca abierto → sí; marcada → no; el agregado por persona. Prior art: `racha.test.ts`.
- **Dominio, lista por persona**: mezcla ocurrencias e imprevistos; solo abiertas (incluye vencidas); orden por urgencia y luego importancia; imprevisto con importancia 0 va al final de su empate; la ponderación no altera el orden. Prior art: `seleccion.test.ts`, `urgencia.test.ts`.
- **Base**: INV-34, INV-35, INV-36 e INV-37 en `pruebas/` contra Supabase local con sesiones reales. Prior art: `inv-25-supervisor.test.ts` (círculo del supervisor), `inv-15-traspaso.test.ts` (traspaso), `inv-18-imprevistos.test.ts`.
- **Pantalla**: la web no tiene runner de tests y no se suma uno por esto; el perfil, el punto y "lo que pedí" se cubren con los tests de dominio de arriba, INV-37 por la acción del servidor y un paso de QA manual.

## Out of Scope

- **Comentar flujos.** No se marcan: no tienen un antes y un después.
- **Editar o borrar comentarios.** Si algún día molesta, borrar con rastro como el imprevisto es lo siguiente.
- **Adjuntos, menciones, formato, reacciones.**
- **Notificaciones fuera de la app** (correo, push) y un contador global en la navegación.
- **Sin leer en tareas marcadas.**
- **Traspasos, cambios de ponderación o intromisiones en la línea de tiempo.** Abren preguntas de visibilidad (el supervisor no ve ponderaciones); entran cuando alguien los pida.
- **Que el supervisor o el administrador marquen o deleguen tareas ajenas.** Lo dicen en un comentario; marca el titular.
- **"Lo que pedí" para el administrador.** Ya ve a todos.

## Further Notes

- El perfil es el lugar donde después pueden entrar más cosas de la tarea; hoy es comentarios más los eventos que ya están en la base, sin datos nuevos salvo el comentario y la vista.
- El orden de la lista por persona es a propósito sin ponderación: ordenar por peso real delataría al supervisor el ranking de lo que pesa en el cargo de su gente.
- El círculo se calcula siempre con el de hoy, no con el de cuando se escribió: es la misma regla que ya tiene el supervisor ("cuando se lo cambian, deja de verlo").
- Quien lo pidió es casi siempre el administrador o el propio supervisor, que ya están en el círculo; solo agrega a alguien cuando lo pide el supervisor de otro equipo (`puede_pedir` lo permite). Un pedido en texto libre (`pedido_por_otro`) no tiene cuenta y no comenta.
