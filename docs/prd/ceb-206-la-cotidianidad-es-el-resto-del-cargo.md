# PRD: La cotidianidad es el resto del cargo

> Copia en el repo de CEB-206.

> Sale del `grill-with-docs` del 2026-09-30. El vocabulario está en `CONTEXT.md` (**Cotidianidad**, antes Holgura, redefinida; **Ponderación**, **Reparto** y **Publicar** ajustados) y la decisión de fondo en el **ADR 0014**, que reemplaza, del ADR 0009, que la holgura se asigne como una función más.

## Problem Statement

Hoy la holgura es una función: el administrador tiene que darla de alta y ponerle peso a mano. Quien no la tiene recibe imprevistos que cuentan pero no pesan. Y el caso común --un supervisor o el administrador que le da trabajo a alguien fuera de sus funciones-- depende de que alguien se haya acordado de crear una "función" que no se repite, no se entrega y no se traspasa.

El resultado es que no sabemos cuánto le pesa a cada persona lo que le van asignando en su día, y la parte del cargo que debería medirlo a veces ni existe.

Además, cada cambio de peso reacomoda el reparto a su manera: al dar de alta, al cambiar un peso, al archivar, al eliminar y al traspasar. Algunos piden aprobación y otros aplican los números sin mostrarlos.

## Solution

**La cotidianidad es el resto del cargo:** cien menos la suma de las ponderaciones de sus funciones. No se crea, no se edita aparte y no se traspasa. Todo empleado nace con cotidianidad 100.

**Nunca baja del 10%.** Un reparto cuyas funciones suman más de 90 no se publica. Como siempre hay cotidianidad, todo imprevisto pesa: se cumple igual que la holgura, con imprevistos hechos sobre los esperados.

**Una sola regla para todo lo que mueve un peso** (dar de alta, cambiar, archivar, eliminar o traspasar una función): lo que entra o sale se compensa en proporción entre todo el resto, cotidianidad incluida. Si la cuenta deja la cotidianidad bajo el piso, queda en el piso y lo que falta sale de las funciones.

**El sistema propone y el administrador aprueba.** Cada cambio muestra el antes y el después de cada parte, con la cuenta en palabras ("entra Arqueo con 15; el resto, 85, se reparte en proporción…; la cotidianidad quedaría en 9,6, así que queda en 10 y…"). El administrador la ajusta si quiere y la aprueba.

**Los datos existentes se migran solos**, porque el sistema todavía no se usa en producción. Las funciones de holgura pasan a ser la cotidianidad de su titular. A quien quede bajo el piso se le sube la cotidianidad a 10 y se recalculan sus funciones en proporción hasta 90.

## User Stories

**Administrador**

1. Como administrador, quiero que una persona recién dada de alta tenga cotidianidad 100, para asignarle trabajo desde el primer día sin armar nada.
2. Como administrador, quiero que la cotidianidad no aparezca como una función que se crea, para no tener que acordarme de darla de alta.
3. Como administrador, quiero ver la cotidianidad en el reparto de cada persona como una fila más, calculada, para leer el cargo completo.
4. Como administrador, quiero que al dar de alta una función con su peso el sistema me proponga cómo queda el resto, cotidianidad incluida, para no hacer la cuenta a mano.
5. Como administrador, quiero que la propuesta me diga en palabras cómo se calculó, para validarla sin adivinar.
6. Como administrador, quiero ajustar la propuesta antes de aprobarla, para decidir qué pierde peso cuando la proporción no me convence.
7. Como administrador, quiero que nada cambie en la pantalla del empleado hasta que yo apruebe, para no publicar un reparto que no revisé.
8. Como administrador, quiero que al cambiar el peso de una función se aplique la misma regla y la misma confirmación, para no tener que recordar cómo se comporta cada caso.
9. Como administrador, quiero que al archivar una función su peso se reparta en proporción entre las demás y la cotidianidad, y verlo antes de aprobar, para que archivar no cambie números sin mostrarlos.
10. Como administrador, quiero lo mismo al eliminar una función creada por error.
11. Como administrador, quiero que un traspaso me proponga el reparto de los dos, quien entrega y quien recibe, con la misma regla, para ver el efecto en ambos antes de aprobarlo.
12. Como administrador, quiero que si la cuenta deja la cotidianidad bajo el 10%, quede en 10 y el resto salga de las funciones, y que la propuesta lo diga, para no tener que corregirlo yo.
13. Como administrador, quiero que la base rechace un reparto con la cotidianidad bajo el piso aunque se intente desde fuera de la pantalla, para que la regla no dependa de la interfaz.
14. Como administrador, quiero que una función nueva no pueda pesar más de 90, para no ofrecer algo que nunca se podría publicar.
15. Como administrador, quiero elegir el tipo de una función nueva entre entrega y flujo, sin la opción de holgura, porque la cotidianidad ya no se crea.
16. Como administrador, quiero ver en la descarga una fila de cotidianidad por persona, con su porción del bono y sus imprevistos, para liquidarla como cualquier otra parte del cargo.
17. Como administrador, quiero que las funciones de holgura que ya existen pasen a ser la cotidianidad de su titular sin intervención, para no rehacer repartos.
18. Como administrador, quiero que a quien quede bajo el piso tras la migración se le suba la cotidianidad a 10 y se le recalculen las funciones, para empezar con todos los repartos válidos.
19. Como administrador, quiero que la historia de las funciones de holgura migradas no se pierda, para poder saber después qué eran.

**Empleado**

20. Como empleado, quiero ver en mi mes cuánto de mi cargo es cotidianidad y cuánto de mi bono vale, para entender que lo que me piden cuenta.
21. Como empleado, quiero que todo imprevisto que me asignan pese en mi cargo, para que el trabajo que me cae no sea invisible.
22. Como empleado, quiero que mi reparto no cambie hasta que el administrador lo publique, como hoy.

**Supervisor**

23. Como supervisor, quiero pedirle trabajo a mi gente sabiendo que pesa en su cargo, para asignar sin crear funciones.
24. ~~Como supervisor, quiero seguir sin ver pesos de nadie, cotidianidad incluida (INV-3), para no saber lo que no me corresponde.~~ **Cambió el 30/09/2026 (ADR 0015):** el supervisor ve las ponderaciones de su gente, cotidianidad incluida, y su ponderación arrastrada; sigue sin ver bonos ni montos.

## End-to-End Invariants

Los de CEB-106, CEB-128, CEB-145, CEB-146, CEB-147, CEB-184, CEB-192 y CEB-198 siguen vigentes, salvo **INV-14**, que se reescribe aquí. Cada invariante necesita su prueba de trazador sobre el cableado real (Supabase local, sesiones reales, sin llave de servicio en el servidor web), y este PRD no se cierra hasta que pasen. El job `invariantes` de CI las corre.

**INV-14 (reescrito) · Ningún reparto publicado deja la cotidianidad bajo el 10%.**
Prueba: como administrador, por consulta directa, publicar un reparto cuyas funciones suman 95 → rechazado; 90 → aceptado. Un traspaso que dejaría a quien recibe con funciones en 92 → rechazado. Archivar y eliminar no pueden dejar a nadie bajo el piso. Una persona sin funciones publicadas es válida (cotidianidad 100).

**INV-38 · La cotidianidad nunca es una función.**
Prueba: como administrador, por consulta directa, dar de alta o editar una función con tipo holgura → rechazado. Tras la migración no queda ninguna función de holgura vigente en el reparto de nadie, y cada persona que tenía una tiene ahora la cotidianidad que esa función pesaba, o 10 si pesaba menos.

**INV-39 · Todo imprevisto pesa por la cotidianidad de su empleado.**
Prueba: una persona dada de alta sin funciones y otra con funciones que suman 90. En la descarga, cada una tiene una fila de cotidianidad, con 100% y 10% de su bono respectivamente, cumplida con sus imprevistos: un "hecho" suma y un "no pude" resta. Nadie queda con imprevistos que cuentan pero no pesan.

## Implementation Decisions

**El dominio puro**

- **La propuesta de reparto** es el módulo profundo: toda la regla vive aquí, y las cinco pantallas solo la piden y la pintan. Recibe las ponderaciones vigentes de las funciones de una persona y un cambio (una función que entra con un peso, una que cambia de peso o una que sale), y devuelve el antes y el después de cada función y de la cotidianidad, más los datos para contar la cuenta en palabras: lo proporcional, si la cotidianidad tocó el piso y cuánto salió de las funciones por eso. La cotidianidad no se guarda: es 100 menos las funciones. El redondeo se cobra en la parte que más pesa, como hoy.
- El piso es una constante del dominio (10) que comparten la propuesta y la validación de publicar.
- **Publicar** pasa a validar que las funciones sumen a lo sumo 90, en vez de exactamente 100. Un cargo sin funciones es publicable.
- **El reparto del mes** suma una tajada de cotidianidad (100 menos las funciones), con su porción del bono.
- **La descarga** da a cada persona una fila de cotidianidad, siempre, con su porción del bono y cumplida con sus imprevistos. Reemplaza a la fila de la función de holgura.
- "Holgura" deja de ser un tipo de función en el dominio, la tipificación y el agente de la ingesta. El importador ignora las filas de holgura del documento: esa porción es la cotidianidad.

**La base** (una migración nueva)

- El trigger del reparto cambia de "suma 100" a "las funciones vigentes publicadas suman a lo sumo 90". Una persona sin funciones sigue siendo válida.
- Dar de alta o editar una función con tipo holgura se rechaza.
- **Migración:** cada función de holgura vigente se archiva, con lo que conserva su historia (ADR 0008), y su titularidad se cierra. Su peso pasa a ser, por construcción, la cotidianidad. A quien queda con las funciones sobre 90, sus funciones se recalculan en proporción hasta 90. Corre sin aprobación porque no hay uso en producción.
- Las funciones que hoy mueven pesos (archivar, eliminar, traspasar, ajustar ponderación) siguen recibiendo los pesos que calcula el dominio. Ahora los calcula la propuesta nueva, y la base comprueba el piso.

**La pantalla**

- **El reparto** muestra la cotidianidad como una fila calculada, no editable, que se mueve sola al editar los pesos de las funciones.
- **Una sola confirmación para los cinco momentos.** Antes y después por parte, la cuenta en palabras, ajuste posible y aprobar. Archivar, eliminar y traspasar dejan de aplicar pesos sin mostrarlos.
- **El formulario de alta** (rama `feature/perfil-y-agregar-funcion`): sin la opción "Holgura", peso de 0 a 90, y el texto dice que el resto y la cotidianidad se reacomodan en proporción. Crear lleva a la confirmación.
- **El mes del empleado** muestra la cotidianidad como una porción más, con su monto.
- **El supervisor** ~~sigue sin ver pesos (INV-3): la cotidianidad no aparece en lo que ve de su gente.~~ Cambió el 30/09/2026 (ADR 0015): ve la cotidianidad de su gente como una parte más de su cargo, sin monto.

## Testing Decisions

- Un buen test prueba comportamiento externo --entradas del dominio contra salidas, o sesiones reales contra la base--, nunca la forma interna.
- **Dominio, propuesta de reparto:** cada tipo de cambio (entra, cambia, sale); la proporción incluye a la cotidianidad; el piso se respeta y lo que falta sale de las funciones en proporción; el redondeo cierra en 100; una persona sin funciones; una función nueva de 90; el ejemplo del grill (Cierre 60, Conciliación 28, cotidianidad 12, entra algo con 20 → cotidianidad 10, Cierre 48, Conciliación 22). Prior art: `reparto-de-un-cargo.test.ts`.
- **Dominio, publicar:** a lo sumo 90, cargo vacío publicable. Prior art: el mismo archivo.
- **Dominio, reparto del mes y descarga:** la tajada y la fila de cotidianidad, con su bono y su cumplimiento. Prior art: `reparto.test.ts`, `descarga.test.ts`, `holgura.test.ts`.
- **Base:** INV-14 reescrito, INV-38 e INV-39 en `pruebas/`. Prior art: `inv-14-ponderacion.test.ts`, `inv-15-traspaso.test.ts`, `inv-23-bono.test.ts`.
- **Pantalla:** sin runner de tests en la web. La confirmación y el formulario se cubren con los tests de la propuesta y un paso de QA manual sobre la web real, como `qa-ceb-198.mts`.

## Out of Scope

- **Qué pasa con las áreas.** Siguen como están, sin crearse desde la pantalla, hasta que se repiensen aparte.
- **Un piso distinto por persona o por empresa.** Es uno para todos.
- **Bloquear imprevistos por falta de cotidianidad.** Nunca falta: el piso lo impide.
- **Renombrar "holgura" en el código y la base** más allá de lo que esta feature toca.
- ~~**Que el supervisor vea la cotidianidad de su gente.** Es peso (INV-3).~~ Entra con el ADR 0015 (30/09/2026), fuera de este PRD: lo construye el tablero del equipo.

## Further Notes

- El piso existe para que todo imprevisto pese. Con 1% pesaría casi nada; 10% es la decisión de negocio.
- La regla única reemplaza cinco comportamientos distintos. Donde hoy se aplican pesos sin mostrarlos (archivar, eliminar, traspasar), ahora aparece una confirmación: es un paso más a propósito.
- Se descartó que el peso de una función nueva salga solo de la cotidianidad: se prefirió la proporción con todo el resto, que es la aritmética que el reparto ya usaba, con la confirmación haciendo explícito lo que cambia (ADR 0014).
