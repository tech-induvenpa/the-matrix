# PRD: El imprevisto elige su vencimiento

> Sale del `grill-with-docs` del 2026-09-29. Copia en el repo de CEB-192. El vocabulario está en `CONTEXT.md` (**Imprevisto** redefinido, **Cobertura del calendario** con su excepción) y la decisión de fondo en el **ADR 0013**, que reemplaza el vencimiento del **ADR 0009**.

## Problem Statement

Un imprevisto hoy solo puede vencer **hoy o mañana**. Pero cae trabajo que se hace una sola vez, no está en el reparto de nadie y no aprieta: un informe para dentro de dos semanas, un trámite para fin de mes. No es una función, porque no se repite, pero tampoco es para mañana.

Hoy ese trabajo o se infla a "para mañana" --y aparece vencido y con retraso al día siguiente, contando en contra de la holgura sin que nadie haya fallado-- o no se anota, y la holgura no lo ve. En los dos casos la cifra de imprevistos miente.

Además, la tarjeta de un imprevisto abierto no dice **cuándo se pidió**. Con imprevistos de un día daba igual; con imprevistos que pueden estar abiertos semanas, es el dato que dice cuánto lleva ahí.

## Solution

**Quien anota un imprevisto elige su urgencia, de 0 a 9, y el sistema guarda el vencimiento que le corresponde.** Cada urgencia vence en el tope de su tramo, en días hábiles desde hoy:

| Urgencia | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
|---|---|---|---|---|---|---|---|---|---|---|
| Vence en (días hábiles) | 0 (hoy) | 1 | 2 | 4 | 7 | 9 | 14 | 17 | 21 | 29 |
| Emoji | 🔥 | 🔥 | 💣 | 💣 | 🧠 | 🧠 | 🍃 | 🍃 | 🍃 | 🍃 |

Desde ahí la urgencia se calcula como la de cualquier ocurrencia y sube sola con los días (ADR 0003 intacto): se declara **para cuándo** se necesita, nunca cuánto aprieta.

**El selector** es un desplegable de diez opciones, cada una con emoji, número y la fecha en que vencería (`🧠 5 · mié 7 oct`). Por defecto, **8 (mañana)**: quien anota como siempre no nota el cambio. Es el mismo formulario para el empleado y para el supervisor que pide un imprevisto.

**El emoji sale de la urgencia**, en todo el sistema: 🔥 9–8, 💣 7–6, 🧠 5–4, 🍃 3–0. Esto también cambia el emoji de las ocurrencias (lo que vence en 4 días hábiles pasa a 💣; en 8 o 9, a 🧠).

**Los días se cuentan de lunes a viernes aunque pasen la cobertura del calendario.** Dentro de la cobertura se saltan los días no hábiles cargados; más allá, solo los fines de semana. Cuando el administrador carga días no hábiles nuevos, el vencimiento de un imprevisto abierto que caiga en uno se corre al hábil siguiente, sin avisar.

**La tarjeta muestra cuándo se pidió**: *"pedido por Carla el 29 sep · vence el 7 de oct"* (o *"hoy"* si es de hoy). También en la vista del supervisor y en las delegaciones (*"delegado por Carla el 29 sep · …"*).

## User Stories

**Empleado**

1. Como empleado, quiero anotar un imprevisto que no es para mañana, para que el trabajo de una sola vez quede registrado sin inventarle prisa.
2. Como empleado, quiero elegir la urgencia con un número de 0 a 9, para decir para cuándo lo necesitan con la misma escala que ya veo en mis tareas.
3. Como empleado, quiero ver junto a cada número su emoji y la fecha en que vencería, para no elegir "3" sin saber que me da tres semanas.
4. Como empleado, quiero que por defecto venga "8 · mañana", para que anotar lo de siempre siga siendo un solo paso.
5. Como empleado, quiero poder seguir eligiendo "9 · hoy", para lo que de verdad es para hoy.
6. Como empleado, quiero que un imprevisto anotado en 3 vaya subiendo de urgencia solo con los días, para que me avise cuando se acerque y no quede dormido en 🍃.
7. Como empleado, quiero que un imprevisto con vencimiento lejano no aparezca como vencido ni con retraso mientras no llegue su fecha, para que no cuente en contra de mi holgura antes de tiempo.
8. Como empleado, quiero ver en la tarjeta de cada imprevisto abierto el día en que me lo pidieron, para saber cuánto lleva ahí.
9. Como empleado, quiero que si me lo pidieron hoy diga "hoy", para leerlo de un vistazo.
10. Como empleado, quiero que el emoji de un imprevisto y el de una tarea con la misma urgencia sean el mismo, para leer una sola escala en toda la pantalla.
11. Como empleado, quiero poder elegir una urgencia cuya fecha caiga el año que viene aunque el calendario todavía no esté cargado, para no depender de que alguien cargue los feriados.
12. Como empleado, quiero que si luego cargan un feriado justo en el día en que vence mi imprevisto, se corra al hábil siguiente, para no quedar venciendo en un día en que nadie trabaja.
13. Como empleado, quiero marcar hecho, "no pude" o "no lo tomé" un imprevisto de cualquier urgencia igual que antes, para que nada más cambie.
14. Como empleado, quiero poder vincular un imprevisto lejano como intromisión solo si se pidió antes del vencimiento de lo que no cumplí, igual que hoy, para que la regla no cambie.

**Supervisor**

15. Como supervisor, quiero pedirle a alguien de mi equipo un imprevisto con la urgencia que corresponda, para no pedirle "para mañana" algo que es para fin de mes.
16. Como supervisor, quiero ver en las tarjetas de imprevistos de mi equipo cuándo se pidió cada uno, para saber qué lleva más tiempo abierto.
17. Como supervisor, quiero que mis delegaciones sigan venciendo con su ocurrencia, sin selector de urgencia, para que delegar no cambie.
18. Como supervisor, quiero ver "delegado por … el 29 sep" en las delegaciones, para saber cuándo la hice.

**Administrador**

19. Como administrador, quiero anotar imprevistos para cualquiera con el mismo selector, para no tener un formulario distinto.
20. Como administrador, quiero cargar los días no hábiles del año siguiente sin revisar imprevistos a mano, para que los vencimientos que caen en feriados se corran solos.
21. Como administrador, quiero que un imprevisto cuente en la holgura del mes en que vence, para juzgarlo cuando ya se le puede exigir.
22. Como administrador, quiero que la base rechace un imprevisto que venza antes de pedirse o a más de 29 días hábiles, para que nadie esquive la escala desde fuera de la pantalla.
23. Como administrador, quiero que correr vencimientos por un feriado nuevo nunca toque imprevistos marcados, borrados, ya vencidos ni delegaciones, para que el pasado no se reescriba.

## End-to-End Invariants

Los de CEB-106, CEB-128, CEB-145, CEB-146, CEB-147 y CEB-184 siguen vigentes, salvo **INV-18**, que se reescribe aquí. Cada invariante necesita su prueba de trazador sobre el cableado real (Supabase local, sesiones reales de empleado, supervisor y administrador, sin llave de servicio en el servidor web), y este PRD no se cierra hasta que pasen.

**INV-18 (reescrito) · Un imprevisto vence entre el día en que se pidió y 29 días hábiles después; una delegación, con su ocurrencia.**
Prueba: como empleado, insertar por consulta directa un imprevisto que vence ayer → rechazado; que vence a 29 días hábiles → aceptado; a 30 → rechazado. Uno que vence más allá de la cobertura del calendario, contando lunes a viernes → aceptado. Las pruebas de delegación de INV-18 siguen pasando sin cambios.

**INV-32 · La urgencia que se elige al anotar es la que la pantalla muestra ese día.**
Prueba: para cada urgencia de 0 a 9, registrar un imprevisto por la acción del servidor con esa urgencia; leer la fila y calcular su urgencia y su emoji desde hoy: son la elegida y el emoji de la tabla. Con un feriado cargado dentro del tramo, sigue siendo la elegida.

**INV-33 · Cargar días no hábiles nunca deja un imprevisto abierto venciendo en un día no hábil, y no toca nada más.**
Prueba: crear un imprevisto abierto que vence el día D, uno marcado, uno borrado y una delegación que también vencen en D, y uno abierto que vence en D+3. Como administrador, cargar D como no hábil. El abierto pasa al hábil siguiente a D; los demás conservan su vencimiento; el de D+3 no se mueve. Su fecha de pedido no cambia en ninguno.

## Implementation Decisions

**El dominio puro**

- **Vencimiento por urgencia**, reemplaza al `Plazo` `'hoy' | 'manana'`: `vencimientoPorUrgencia(pedido, urgencia, calendario)` devuelve la fecha que está `N` días hábiles después de `pedido`, con `N` el tope del tramo de esa urgencia (la tabla de arriba; la urgencia 0 usa 29). Con 0 días devuelve el hábil siguiente o igual a `pedido`, como hoy "para hoy". Cuenta de lunes a viernes saltando los días no hábiles que conoce el calendario; no conoce la cobertura y no la necesita.
- La tabla de márgenes de urgencia es una sola y la comparten `urgenciaDe` y `vencimientoPorUrgencia`: una va de días a urgencia, la otra de urgencia a días. Para toda urgencia `u` y todo `pedido`, `urgenciaDe(habilesEntre(pedido, vencimientoPorUrgencia(pedido, u)))` es `u`.
- **Emoji por urgencia**: `emojiDe` pasa a recibir la urgencia, no los días que faltan. 🔥 9–8, 💣 7–6, 🧠 5–4, 🍃 3–0. Quienes lo llaman (tarjeta de ocurrencia y de imprevisto) le pasan `urgenciaDe(faltan)`.
- **Opciones del selector**: una función pura que, dados hoy y el calendario, devuelve las diez opciones `{ urgencia, emoji, vence }` de 9 a 0. La pantalla solo las pinta; así el selector se puede probar sin probar React.

**La base** (una migración nueva)

- `imprevisto_vence_a_tiempo` se reescribe: un imprevisto que no es delegación se acepta si `pedido <= vence <= pedido + 29 días hábiles`. Hace falta una función SQL que sume días hábiles (lunes a viernes, saltando `dia_no_habil`), hermana de `habil_siguiente`.
- **Un trigger nuevo sobre `dia_no_habil`** (insert y update): para cada imprevisto abierto (sin marca, sin borrar, que no es delegación y cuyo vencimiento no pasó) con vencimiento dentro del tramo cargado, lo mueve a `habil_siguiente` del fin del tramo. No avisa a nadie ni deja rastro aparte: el vencimiento es un dato derivado del pedido y la urgencia elegida, no un juicio de nadie.
- La validación de INV-18 corre solo al insertar, así que la corrida al hábil siguiente --que puede dejar un imprevisto a 30 días hábiles de su pedido-- no choca con ella. El trigger corre con los permisos de su dueño (`security definer`), porque quien carga el calendario no tiene permiso de escribir `vence`.
- Sin columna nueva: la urgencia elegida no se guarda, se guarda la fecha. `pedido_en` ya existe.

**La pantalla**

- `NuevoImprevisto`: el `select name="plazo"` pasa a `select name="urgencia"` con las diez opciones (`🧠 5 · mié 7 oct`), `defaultValue` 8. La acción `registrarImprevisto` lee la urgencia, la valida como entero 0–9 (8 si no llega) y calcula el vencimiento con `vencimientoPorUrgencia`.
- `TarjetaDeImprevisto`: la línea de abajo suma la fecha de pedido, con la fecha corta que ya usa "Lo que te cayó este mes": `pedido por Carla el 29 sep · vence el 7 de oct`, o `pedido por Carla hoy · …`. Igual con "delegado por".
- Las delegaciones no usan el selector: siguen venciendo con su ocurrencia.

## Testing Decisions

- Un buen test prueba comportamiento externo --entradas del dominio contra salidas, o sesiones reales contra la base-- y nunca la forma interna.
- **Dominio, vencimiento**: cada urgencia de 0 a 9 da su fecha; salta fines de semana; salta feriados cargados; más allá de lo cargado cuenta solo lunes a viernes; pedido en sábado; la ida y vuelta `urgenciaDe(…vencimientoPorUrgencia(u)) === u` para todas las urgencias. Prior art: `imprevistos.test.ts`.
- **Dominio, emoji**: la tabla completa urgencia → emoji. Prior art: los tests de urgencia existentes.
- **Dominio, opciones del selector**: diez opciones de 9 a 0, con su emoji y su fecha; la 8 es mañana. Cubre la parte testeable del formulario sin montar React: la web no tiene runner de tests y no vamos a sumarle uno por esto.
- **Web, tarjeta**: el texto de "pedido por … el …" sale de una función pura de formato (hoy vs. fecha corta) con su test unitario; el resto de la pantalla lo cubren INV-32 y un paso de QA manual.
- **Base, triggers**: INV-18 reescrito e INV-33 en `pruebas/`, contra Supabase local con sesiones reales. Prior art: `inv-18-imprevistos.test.ts`, `inv-8-cobertura.test.ts`.
- **Trazador de punta a punta**: INV-32 contra la acción del servidor real. Prior art: `inv-20-intromision.test.ts`.

## Out of Scope

- **Guardar la urgencia elegida.** Se guarda la fecha; el número se deriva.
- **Editar el vencimiento de un imprevisto ya anotado.** Un imprevisto no se edita: si está mal, se borra y se anota otro.
- **Elegir una fecha exacta en un calendario.** La escala de urgencia es la forma de decir para cuándo.
- **Que la urgencia de las delegaciones se elija.** Siguen venciendo con su ocurrencia (ADR 0012).
- **Recalcular vencimientos cuando se borra un día no hábil.** Solo se corren al cargar; quitar un feriado no los adelanta.
- **Corregir el día hábil de menos** que tiene un imprevisto cuando se carga un feriado antes de su vencimiento.
- **Importancia para imprevistos.** Siguen sin importancia ni ponderación; pesan por la holgura.

## Further Notes

- El ADR 0009 decía *"lo que se necesita para el viernes no es un imprevisto, se planifica"*. El ADR 0013 lo reemplaza: lo que hace imprevisto a un imprevisto es ser de una vez y estar fuera del reparto, no la prisa.
- La urgencia 0 era "22 días hábiles o más" sin techo; como vencimiento se fija en 29 (unas seis semanas), el valor que ya tenía en la tabla.
- Un imprevisto cuenta para la holgura del mes en que **vence**, no del mes en que se pidió (ya era así; ahora se nota).
- Cambiar el emoji a la urgencia mueve dos tramos en las ocurrencias: 4 días hábiles pasa de 🧠 a 💣, y 8–9 de 🍃 a 🧠. Es a propósito: una sola escala.
