# PRD: El tablero del equipo y el perfil de la persona

> Copia en el repo de CEB-215.

> Sale del `grill-with-docs` del 2026-09-30. El vocabulario está en `CONTEXT.md` (**Supervisor** y **Delegación** ajustados; **Ponderación arrastrada**, **Arrastre**, **Cotidianidad** e **Intromisión** sin cambios) y la decisión de fondo en el **ADR 0015**, que reemplaza, de CEB-145 e INV-3, que el supervisor no vea pesos. El PRD de CEB-206 quedó anotado con ese cambio.

## Problem Statement

Para saber cómo va su gente, el administrador tiene cuatro sitios que responden la misma pregunta desde ángulos distintos: "Qué se arrastra", "Qué dijeron", la descarga, y dentro de cada persona una lista de funciones con su estado. El supervisor tiene su propia versión: un acordeón por persona con sus funciones y "Lo que dijo".

Son pantallas difíciles de entender. "Qué se arrastra" mezcla lo que está sin cumplir ahora mismo con lo que pasó en el mes (imprevistos, delegaciones, ponderación desplazada), cada sección con su propia unidad. "Qué dijeron" es una lista larga de textos sin contexto. Y todas son listas: no hay nada que se lea de un vistazo.

Además, el supervisor no ve pesos, así que no puede saber cuánto le pesa a alguien lo que le pide: veinte imprevistos no son lo mismo con cotidianidad noventa que con diez. Por eso tampoco podía compartir una pantalla con el administrador: hasta el orden de una lista le delataba los pesos.

## Solution

**Un tablero gráfico, "El equipo", que es la pantalla de entrada del administrador y del supervisor.** Lee el estado de *ahora mismo*, no un balance del mes. Tiene cuatro gráficas y, debajo, la lista de personas, que lleva al perfil de cada una:

1. **Cuánto del cargo está sin cumplir:** una barra por persona con su ponderación arrastrada, de mayor a menor, partida en un segmento por función y uno de cotidianidad. Lo que un imprevisto vinculado desplazó se pinta rayado: la misma barra dice "35% sin cumplir, y 15% de eso lo desplazó lo no planificado". El administrador ve además el monto; el supervisor no.
2. **Desde cuándo:** una línea de tiempo por persona donde cada función con arrastre es un tramo desde que empezó hasta hoy. Lo más viejo es lo que más salta.
3. **Cuánto le cae para su tamaño:** los imprevistos abiertos de cada persona por cada 10% de su cotidianidad, partidos en en plazo y vencidos.
4. **Las más delegadas:** las funciones cuyas ocurrencias más se delegaron en los últimos noventa días, en proporción y no en veces, con lo devuelto en otro tono. Una delegación que se repite es un traspaso que nadie ha hecho.

**El supervisor ve pesos, no montos (ADR 0015).** Ve las ponderaciones de su gente, cotidianidad incluida, y lo que está sin cumplir en peso. No ve bonos ni dólares.

**El detalle vive en el perfil de la persona**, que ya tiene dos columnas: lo que cambia poco a un lado y lo del día al otro.

- En la columna fija, cada función dice cómo está: "arrastra 3 periodos, desde el 1 sept", un flujo atrasado con su razón vigente, o la señal de que se delega seguido. Si está al día, no dice nada.
- En la columna de la derecha, debajo de las tareas abiertas, van plegadas las **cerradas del mes en curso**, cada una con su timeline de solo lectura: ahí está cada razón en su contexto.
- El supervisor tiene su propia página por persona, igual al perfil del administrador pero sin editar y sin montos. El acordeón desaparece.

**Las razones, para análisis, salen en la descarga:** una columna RAZÓN al final.

**Se eliminan** "Qué se arrastra", "Qué dijeron", y del lado del supervisor la lista de funciones y "Lo que dijo" del acordeón. Nada se pierde: cambia de sitio.

## User Stories

**Administrador: el tablero**

1. Como administrador, quiero que "El equipo" sea un tablero gráfico, para ver de un vistazo cómo está mi gente sin leer listas.
2. Como administrador, quiero ver una barra por persona con cuánto de su cargo está sin cumplir ahora mismo, para saber a quién atender primero.
3. Como administrador, quiero que las barras vayan de mayor a menor ponderación arrastrada, porque es lo único comparable entre personas y cadencias.
4. Como administrador, quiero que cada barra se divida por función, para ver si es una función grande sin cumplir o muchas pequeñas.
5. Como administrador, quiero que la cotidianidad sin cumplir sea un segmento más de la barra, para ver lo previsto y lo imprevisto en la misma unidad.
6. Como administrador, quiero que lo que un imprevisto vinculado desplazó se vea rayado dentro de la barra, para distinguir lo que no se hizo por la persona de lo que no se hizo porque le cayó trabajo encima.
7. Como administrador, quiero ver el monto de lo sin cumplir junto a cada barra, para dimensionarlo en dinero.
8. Como administrador, quiero una línea de tiempo con cada arrastre desde que empezó hasta hoy, para ver qué lleva más tiempo pudriéndose.
9. Como administrador, quiero ver cuántos imprevistos abiertos tiene cada persona por cada 10% de su cotidianidad, para saber a quién le está cayendo demasiado para su tamaño.
10. Como administrador, quiero que esa carga se parta en en plazo y vencidos, para distinguir lo que aún se puede hacer de lo que ya se atrasó.
11. Como administrador, quiero ver las funciones que más se delegan en proporción a sus ocurrencias, para detectar traspasos que nadie ha hecho.
12. Como administrador, quiero que esa gráfica no ponga siempre arriba a las diarias, para comparar funciones de cadencias distintas.
13. Como administrador, quiero que una sola delegación no aparezca como patrón, para que la gráfica no se llene de casos sueltos.
14. Como administrador, quiero ver en esa gráfica cuánto de lo delegado se devolvió y quién lo delega, para entender si el problema es de reparto o de calidad.
15. Como administrador, quiero que un clic en una barra, un tramo o un nombre me lleve al perfil de esa persona, para pasar de la señal al detalle.
16. Como administrador, quiero ver la lista de personas debajo de las gráficas, para llegar a cualquiera aunque no tenga nada pendiente.
17. Como administrador, quiero que el filtro de empresa, sede y texto siga acotando el tablero, para mirar una empresa a la vez.
18. Como administrador, quiero dar de alta a alguien nuevo desde el tablero, plegado al final, para no perder lo que hoy hace "El equipo".
19. Como administrador, quiero que el menú quede en El equipo, El calendario y Descargar, para no tener pantallas que responden lo mismo.

**Administrador: el perfil**

20. Como administrador, quiero ver en el reparto de cada persona si una función arrastra y desde cuándo, para leer el estado de su cargo donde está su reparto.
21. Como administrador, quiero que un flujo atrasado muestre desde cuándo y su razón vigente en su fila, para no buscarla en otra pantalla.
22. Como administrador, quiero que una función al día no diga nada, para que lo que sí dice algo salte a la vista.
23. Como administrador, quiero ver en la fila de una función que se delega seguido cuántas veces y cuántas se devolvieron, al lado de la opción de pasársela a otra persona, para actuar donde veo la señal.
24. Como administrador, quiero ver plegadas las tareas cerradas del mes en curso de cada persona, para acordarme de lo que pasó sin ir a la descarga.
25. Como administrador, quiero abrir una tarea cerrada y ver su timeline, para leer la razón de un "no pude" en su contexto.
26. Como administrador, quiero que las cerradas sean de solo lectura, porque después de la marca no se comenta.
27. Como administrador, quiero que un imprevisto borrado no aparezca entre las cerradas, porque no cuenta en nada.

**Administrador: la descarga**

28. Como administrador, quiero una columna RAZÓN en la descarga, para analizar las razones fuera del sistema.
29. Como administrador, quiero que la columna nueva vaya al final, para que la hoja que ya uso no se descuadre.
30. Como administrador, quiero que RAZÓN lleve el texto tal cual de un "no pude", un "no lo tomé", una devolución o un atraso de flujo, y quede vacía en lo hecho y en lo vencido sin marcar.

**Supervisor**

31. Como supervisor, quiero entrar a un tablero con las mismas gráficas que el administrador, para ver cómo va mi gente de un vistazo.
32. Como supervisor, quiero ver en el tablero solo a mi gente, para no ver a quien no me corresponde.
33. Como supervisor, quiero ver cuánto del cargo de cada persona está sin cumplir en peso, para saber qué es lo más grave.
34. Como supervisor, quiero ver cuánto le cae a cada persona en proporción a su cotidianidad, para no cargarle veinte tareas a alguien que casi no tiene espacio.
35. Como supervisor, quiero ver las ponderaciones de mi gente, cotidianidad incluida, para saber cuánto pesa lo que le pido.
36. Como supervisor, quiero seguir sin ver bonos ni montos de nadie, porque el dinero es conversación del administrador.
37. Como supervisor, quiero ver en la gráfica de delegación las funciones que yo delego, para darme cuenta de lo que debería pedir que me traspasen.
38. Como supervisor, quiero abrir el perfil de una persona de mi equipo en su propia página, en vez de un acordeón, para leerlo con espacio.
39. Como supervisor, quiero ver en ese perfil sus funciones con su estado y su peso, sus tareas abiertas y sus cerradas del mes, como el administrador.
40. Como supervisor, quiero pedirle una nueva tarea desde su perfil, como hoy.
41. Como supervisor, quiero comentar sus tareas abiertas desde su perfil, como hoy.
42. Como supervisor, quiero que su perfil no me deje editar su reparto, su bono ni sus datos, porque eso es del administrador.
43. Como supervisor, quiero ver el punto de comentarios sin leer junto al nombre de cada persona, como hoy.

**Empleado**

44. Como empleado, quiero que lo que veo de mí no cambie con esto: sigo viendo mi ponderación y su valor, y no cuánto llevo sin cumplir.

## End-to-End Invariants

Los de CEB-106, CEB-128, CEB-145, CEB-146, CEB-147, CEB-184, CEB-192, CEB-198 y CEB-206 siguen vigentes, salvo **INV-3**, que se reescribe aquí para el supervisor. Cada invariante necesita su prueba de trazador sobre el cableado real (Supabase local, sesiones reales de administrador, supervisor y empleado, sin llave de servicio en el servidor web), y este PRD no se cierra hasta que pasen. El job `invariantes` de CI las corre.

**INV-3 (reescrito) · El empleado no obtiene su tasa de cumplimiento ni lo sin cumplir de nadie; el supervisor, sí en peso, nunca en dinero.**
La parte del empleado no cambia. La del supervisor pasa a ser INV-40.

**INV-40 · Un supervisor obtiene los pesos de su gente y nunca un monto.**
Prueba: con una sesión real de supervisor, las lecturas que le sirven devuelven, de cada persona a su cargo, las ponderaciones de sus funciones, su cotidianidad y su ponderación arrastrada; ninguna devuelve bono, monto ni dólares, y ninguna devuelve pesos de alguien que no está a su cargo. Por consulta directa a las tablas de bono, lo mismo: nada.

**INV-41 · Los segmentos de una persona suman exactamente su ponderación arrastrada, y nunca más de 100.**
Prueba: una persona con dos funciones con arrastre, una sin arrastre, cotidianidad con imprevistos sin cumplir y un "no pude" vinculado a un imprevisto. Los segmentos de su barra suman su ponderación arrastrada, lo rayado nunca excede el segmento al que pertenece, y la suma no pasa de 100 aunque todo esté sin cumplir.

**INV-42 · Un imprevisto borrado no aparece en ninguna gráfica, en ninguna lista de cerradas ni en ninguna fila de la descarga.**
Prueba: borrar un imprevisto abierto y otro marcado "no pude". Ninguno cuenta en la carga, en el segmento de cotidianidad, en lo desplazado ni en las delegaciones; no aparece entre las cerradas del mes; no sale en la descarga.

## Implementation Decisions

**El dominio puro**

- **Las barras del tablero** son el módulo profundo. Recibe, por persona, sus funciones con su ponderación, su arrastre y su intromisión, su cotidianidad y el cumplimiento de sus imprevistos, y devuelve una fila por persona: un segmento por función con arrastre más uno de cotidianidad, cada uno con su peso sin cumplir y la parte desplazada, en orden de ponderación arrastrada. El segmento de cotidianidad es su ponderación por la fracción de imprevistos esperados sin cumplir. Los montos se calculan aparte y solo para el administrador.
- **La carga** recibe los imprevistos abiertos de una persona y su cotidianidad, y devuelve cuántos hay por cada 10%, partidos en en plazo y vencidos. Excluye los borrados.
- **La delegación repetida** recibe las delegaciones y las ocurrencias de cada función en una ventana, y devuelve la proporción delegada y cuántas se devolvieron, con quien delega. La ventana es móvil de noventa días y el mínimo, dos delegaciones: ambos son constantes del dominio.
- **La línea del arrastre** es una capa fina sobre el arrastre que ya existe: por función, desde y hasta hoy.
- **Las cerradas del mes** eligen, de las ocurrencias e imprevistos de una persona, los marcados en el mes en curso, sin borrados.
- **La descarga** suma la columna RAZÓN al final: el texto tal cual de un "no pude", un "no lo tomé", una devolución o un atraso de flujo. Nada más cambia: el "(delegado por X)" sigue en el texto.

**La base**

- Las lecturas del supervisor (su gente y las tareas de cada persona) pasan a devolver las ponderaciones, la cotidianidad y lo necesario para la ponderación arrastrada y la intromisión de su gente, y ningún monto. Siguen devolviendo solo lo que puede ver: el supervisor no recibe políticas nuevas sobre las tablas.
- La prueba de INV-3 se reescribe para el supervisor y nace la de INV-40.

**La pantalla**

- **El tablero** es una sola pantalla para el administrador y el supervisor; cambia solo lo que cada uno recibe. Las gráficas se dibujan en el servidor, sin librería de gráficas nueva, y funcionan a ancho de teléfono.
- **El perfil del supervisor** es una página por persona, con las dos columnas del perfil del administrador: sin editar, sin bono y sin montos. Puede pedir una nueva tarea y comentar.
- **El perfil del administrador** gana el estado de cada función en su fila del reparto, la señal de delegación y las cerradas del mes.
- **Se borran** "Qué se arrastra" y "Qué dijeron" con sus entradas del menú, y el acordeón del supervisor con su lista de funciones y "Lo que dijo".

## Testing Decisions

- Un buen test prueba comportamiento externo (entradas del dominio contra salidas, o sesiones reales contra la base), nunca la forma interna.
- **Dominio, barras:** una persona sin nada sin cumplir; varias funciones con arrastre; cotidianidad sin cumplir; lo desplazado dentro de su segmento; el orden entre personas; la suma nunca pasa de 100. Prior art: `reparto-de-un-cargo.test.ts`.
- **Dominio, carga:** cotidianidad 90 contra 10 con las mismas veinte tareas; en plazo y vencidos; borrados fuera.
- **Dominio, delegación repetida:** la diaria delegada ocho veces contra la mensual delegada una de una; la ventana de noventa días; el mínimo de dos; lo devuelto.
- **Dominio, cerradas del mes:** el primer día del mes vacío; borrados fuera; ocurrencias e imprevistos juntos.
- **Dominio, descarga:** la columna RAZÓN en cada resultado y vacía donde corresponde. Prior art: `descarga.test.ts`.
- **Base:** INV-3 reescrito, INV-40, INV-41 e INV-42 en `pruebas/`. Prior art: `inv-3-lo-que-no-se-ve.test.ts`, `inv-25-supervisor.test.ts`, `inv-38-cotidianidad.test.ts`.
- **Pantalla:** sin runner de tests en la web. Las gráficas y los perfiles se cubren con los tests del dominio y un paso de QA manual sobre la web real, como `qa-ceb-198.mts`. La línea del arrastre no lleva test propio: es una capa sobre el arrastre, que ya lo tiene.

## Out of Scope

- **La nómina:** cuánto del bono le corresponde a cada persona al cierre del mes, con su fundamento, visible en su perfil y compartible con finanzas. Es una sesión aparte, y tendrá que decidir si el empleado pasa a ver lo que hoy no ve (INV-3).
- **Tendencias en el tiempo** ("¿vamos mejor que el mes pasado?"): pediría guardar un histórico de la ponderación arrastrada que hoy no existe.
- **Agrupar o graficar razones:** descartado desde el principio; se leen tal cual en el timeline o se analizan en la descarga.
- **Quién pide los imprevistos y el imprevisto vinculado en la descarga:** se decidió sumar solo RAZÓN.
- **Que el empleado vea su ponderación arrastrada.**
- **Una señal de "saturada":** descartada por subjetiva; el supervisor ve la proporción.

## Further Notes

- El tablero lee *ahora mismo* porque sirve para actuar hoy, y el arrastre no se reinicia el día 1. La única excepción es la gráfica de delegación, que mira noventa días hacia atrás en una ventana móvil, nunca en un mes cerrado.
- Se descartó hacer dos tableros, uno sin pesos para el supervisor: le quitaba lo único comparable entre personas y duplicaba la pantalla (ADR 0015).
- El supervisor ve de su gente algo que ella no ve de sí misma. Si eso cambia, lo decide la nómina.
