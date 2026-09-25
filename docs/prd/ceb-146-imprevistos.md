# PRD: Imprevistos, el trabajo que llega sin estar en el reparto de nadie

> Sale del `grill-with-docs` del 2026-09-24 sobre el borrador de CEB-146 ("Urgentes, la función comodín"), al que reemplaza. El vocabulario está en `CONTEXT.md` (**Imprevisto**, **Intromisión**, **Ponderación desplazada**, **Marca** ampliada) y la decisión de fondo en el **ADR 0009**. Lo del sueldo quedó aparte en **CEB-147**.

## Problem Statement

El reparto describe el trabajo previsto de cada persona, pero no todo el trabajo que hace. Cada día llega trabajo que no estaba en ningún reparto: lo pide el administrador, un cliente, otra área o alguien por WhatsApp, y lo necesita para hoy o mañana. El sistema no lo ve.

De ahí salen tres cosas que hoy nadie puede responder:

- **Cuánto trabajo no planificado le cae a cada persona.** No se cuenta en ningún sitio.
- **Si lo termina.** Lo que se hace fuera del sistema no deja marca ni razón.
- **Qué le pasa a lo previsto el mes en que caen muchos imprevistos.** Es la pregunta de fondo. Cuando alguien marca "no pude" en una mensual, la razón puede decir "me cayeron once cosas", pero ese texto no se puede contar ni pesar, y el administrador no puede distinguir si una función arrastra por mala ejecución o porque la desplazaron.

Además, el empleado no tiene defensa. *"No cerré cuatro mensuales porque me cayeron once urgentes"* es hoy una frase, no un hecho contado.

Y hay una decisión aplazada que depende de esto: **si mover trabajo mueve sueldo** se decide tras tres meses de sistema corriendo (22/09/2026). La **holgura**, la porción del cargo reservada a lo no planificado, no se puede presupuestar mientras nadie sepa cuánto no planificado hay.

## Solution

**Un imprevisto es un hecho suelto, no una función.** Tiene un texto, la persona que lo recibe, cuándo se pidió, quién lo pidió y quién lo registró. Vence **hoy o el próximo día hábil**, sin otra opción: si se necesita para el viernes, no es un imprevisto, se planifica. Su urgencia se calcula igual que la de cualquier ocurrencia, y por eso nace en 8 o 9 sin que nadie la escriba (ADR 0003).

**Lo registra quien lo recibe o el administrador.** *Quién lo pidió* se elige de una lista (hoy los administradores, luego los supervisores de CEB-145) o se escribe como "otro".

**Aparece en la pantalla del empleado sin quitarle lugar a lo previsto.** Va en la columna derecha, arriba de los flujos, que se compactan pero nunca desaparecen. No ocupa ninguno de los cinco lugares del plan y no cuenta para la meta de la semana.

**Se marca como cualquier cosa**: hecho, "no pude" con razón, o **"no lo tomé"** con razón, que es la respuesta de quien lo recibe y no una aprobación. Si vence sin marca **sigue abierto** a la vista con su retraso en días hábiles. No arrastra, porque no tiene serie. Que se acumulen abiertos es el dato.

**Lo previsto y lo imprevisto se miden por separado.** El imprevisto afecta a lo previsto por **intromisión**, quitándole tiempo, y nunca por conteo. Cuando el empleado marca "no pude" en una ocurrencia o declara atrasado un flujo, puede vincular los imprevistos que lo causaron. De ahí sale la **ponderación desplazada**: cuánto del cargo de alguien dejó de cumplirse por imprevistos. Es la respuesta a la tercera pregunta, y la ve el administrador.

**Un imprevisto que se repite es una función que nadie dio de alta.** El administrador lo ve a ojo en el reporte, que muestra los textos tal cual, y lo da de alta con la pantalla que ya existe.

## User Stories

**Empleado**

1. Como empleado, quiero registrar un imprevisto que me llegó por fuera del sistema, para que el trabajo que hago y no estaba previsto quede contado.
2. Como empleado, quiero elegir solo entre "para hoy" y "para mañana" al registrarlo, para no tener que pensar en fechas ni convertir un imprevisto en una lista de pendientes.
3. Como empleado, quiero que "mañana" sea el próximo día hábil, para que un imprevisto pedido el viernes venza el lunes y no el sábado.
4. Como empleado, quiero indicar quién me lo pidió eligiendo de una lista, para que quede claro de dónde viene el trabajo sin tener que escribir el nombre.
5. Como empleado, quiero poder escribir "otro" con un texto cuando lo pidió alguien que no está en la lista, para que un cliente o alguien de otra área también cuente.
6. Como empleado, quiero ver mis imprevistos abiertos arriba de mis flujos, para no olvidar lo que me cayó.
7. Como empleado, quiero que mis imprevistos no me quiten lugares del plan de la semana, para no perder de vista lo previsto.
8. Como empleado, quiero seguir viendo mis flujos aunque tenga imprevistos, compactados pero accesibles, para poder declarar un atraso cuando pase.
9. Como empleado, quiero ver la urgencia de un imprevisto calculada como la de todo lo demás, para ordenarlo con el mismo criterio.
10. Como empleado, quiero marcar un imprevisto como hecho, para liberarlo de mi pantalla.
11. Como empleado, quiero marcar un imprevisto como "no pude" con una razón, para que quede por qué no se hizo.
12. Como empleado, quiero marcar un imprevisto como "no lo tomé" con una razón, para rechazar lo que pone en riesgo algo de más peso sin que parezca un incumplimiento.
13. Como empleado, quiero que un imprevisto vencido siga en mi pantalla con los días de retraso, para saber qué me quedó colgado.
14. Como empleado, quiero deshacer la marca de un imprevisto como deshago cualquier marca, para corregir un error.
15. Como empleado, quiero borrar un imprevisto que registré mal mientras no esté marcado, para corregirlo y registrarlo de nuevo.
16. Como empleado, al marcar "no pude" en una ocurrencia, quiero vincular los imprevistos que me lo impidieron, para que mi razón sea un hecho contado y no solo un texto.
17. Como empleado, al declarar atrasado un flujo, quiero vincular los imprevistos que me atrasaron, para que el atraso de un flujo también muestre su causa.
18. Como empleado, quiero que solo se me ofrezcan los imprevistos pedidos antes de que venciera lo que no cumplí, para que el vínculo sea creíble.
19. Como empleado, quiero poder vincular varios imprevistos o ninguno, para describir lo que pasó de verdad.
20. Como empleado, quiero que la razón siga siendo obligatoria aunque vincule imprevistos, para que quien la lea entienda qué pasó.
21. Como empleado, quiero ver cuántos imprevistos me llegaron en el mes, de quién y cómo los marqué, para tener mi defensa en hechos.
22. Como empleado, quiero ver qué previstos vinculé a qué imprevistos, para revisar lo que declaré.

**Administrador**

23. Como administradora, quiero registrarle un imprevisto a cualquier persona, para dejar constancia de lo que yo misma pido a último minuto.
24. Como administradora, quiero aparecer en la lista de quién lo pidió, para que lo que pido quede a mi nombre.
25. Como administradora, quiero ver los imprevistos de cada persona con su texto, quién lo pidió, cuándo y cómo se marcó, para entender qué trabajo no planificado existe.
26. Como administradora, quiero ver cuántos imprevistos le llegaron a cada persona, cuántos hizo, cuántos no pudo, cuántos no tomó y cuántos siguen abiertos, para saber si los está terminando.
27. Como administradora, quiero ver el retraso promedio de los imprevistos por persona, para saber quién no les da seguimiento.
28. Como administradora, quiero ver las mismas cifras agrupadas por quién lo pidió, para saber quién reparte imprevistos y qué pasa con ellos.
29. Como administradora, quiero ver la ponderación desplazada de cada persona, para saber cuánto de su cargo dejó de cumplirse por imprevistos.
30. Como administradora, quiero ver qué previstos se vincularon a qué imprevistos, para distinguir una función desplazada de una mal ejecutada.
31. Como administradora, quiero leer los textos de los imprevistos tal cual, sin resumir ni agrupar, para reconocer a ojo el que se repite y darlo de alta como función.
32. Como administradora, quiero borrar cualquier imprevisto, para corregir datos.
33. Como administradora, quiero que un imprevisto borrado deje registro de quién lo borró y cuándo, para que borrar no sea una forma de esconder.
34. Como administradora, quiero que registrar imprevistos no cambie la parte prevista del cumplimiento ponderado ni el arrastre de nadie, para que lo previsto siga siendo comparable mes a mes.
35. Como administradora, quiero que la holgura de cada persona se cumpla con sus imprevistos y llegue así a la descarga del mes, para no pagar una holgura que nadie atendió.

## End-to-End Invariants

Los de CEB-106 y CEB-128 siguen vigentes. Cada invariante nuevo necesita su prueba de trazador sobre el cableado real (Supabase local, sesiones de empleado y de administrador reales, sin llave de servicio en el servidor web), y este PRD no se cierra hasta que pasen.

**INV-2 se amplía a los imprevistos.** Un empleado nunca obtiene imprevistos, marcas de imprevistos ni intromisiones de otro empleado.
Prueba: con dos empleados, cada uno con imprevistos marcados y vinculados, ninguno obtiene nada del otro por ninguna ruta ni consulta directa.

**INV-18 · Ningún imprevisto vence después del día hábil siguiente a cuando se pidió.** Ni por la interfaz ni por la base.
Prueba: intentar registrar, con sesión de empleado y con sesión de administrador, un imprevisto que vence dos días hábiles después; la base lo rechaza. Uno pedido un viernes con "mañana" vence el lunes.

**INV-19 · Registrar imprevistos deja idénticos el plan, la meta y la parte prevista del cumplimiento ponderado.** Solo mueve la holgura (CEB-158).
Prueba: tomar el plan, la meta de la semana, el cumplimiento ponderado y el arrastre de una persona; registrarle y marcarle imprevistos en todas las formas; los cuatro son idénticos a los de antes.

**INV-20 · Una intromisión solo vincula imprevistos pedidos antes del vencimiento de lo que se incumplió.** En un flujo, pedidos desde que estuvo al día por última vez.
Prueba: intentar vincular a un "no pude" un imprevisto pedido después del vencimiento de esa ocurrencia, y a un atraso de flujo uno pedido antes de su último "al día"; la base rechaza los dos. Vincular uno de otro empleado también se rechaza.

**INV-21 · Un imprevisto marcado no se borra, y el borrado nunca desaparece.** La fecha en que se pidió no cambia nunca.
Prueba: marcar un imprevisto e intentar borrarlo como empleado; la base lo rechaza. Borrar uno sin marca; ya no aparece en ninguna cifra, y sigue existiendo quién lo borró y cuándo. Intentar cambiar la fecha en que se pidió de cualquier imprevisto; la base lo rechaza.

**INV-22 · La ponderación desplazada nunca llega al empleado.** Amplía INV-3: es peso salarial en porcentaje, como el cumplimiento ponderado.
Prueba: con una persona con intromisiones, recorrer todas las respuestas que recibe su sesión; ninguna contiene la ponderación desplazada ni un valor del que se derive.

## Implementation Decisions

**El modelo** (ADR 0009)

- El imprevisto es una entidad propia, no una fila de `funcion`. No toca la periodicidad, el cálculo de ocurrencias, el reparto, el traspaso ni la unicidad de `marca` por función y periodo.
- Una sola tabla `imprevisto`, con la persona que lo recibe, el texto, cuándo se pidió, el vencimiento, quién lo pidió (un administrador o un texto libre de "otro", exactamente uno de los dos), quién lo registró, la marca (resultado, razón, cuándo) y el borrado (quién, cuándo).
- La marca del imprevisto vive en su propia fila, porque hay a lo sumo una. Los resultados son `hecho`, `no_pude` y `no_lo_tome`, y los dos últimos exigen razón, igual que la restricción de `marca`. En el glosario sigue siendo una **Marca**: cambia el objeto, no el acto.
- El borrado es lógico. Un imprevisto borrado queda en la tabla, fuera de todas las cifras y pantallas, con quién lo borró y cuándo.
- No hay edición. La fecha en que se pidió y el vencimiento no se actualizan nunca, y la base lo impide. Si algo está mal, se borra y se registra de nuevo.
- Una tabla `intromision` vincula un imprevisto con una marca "no pude" de una ocurrencia o con un evento de atraso de flujo, exactamente uno de los dos. Un incumplimiento admite varios imprevistos. Si se deshace la marca o el atraso, sus vínculos se van con él.
- La regla 3 (solo imprevistos pedidos antes del vencimiento de esa ocurrencia, o desde el último "al día" del flujo, y del mismo empleado) se aplica **en la base** hasta donde la base puede saberla. En los flujos es exacta. En las ocurrencias la base compara contra el **fin del periodo**, porque el vencimiento con día tope solo lo calcula el dominio; la acción del servidor aplica el vencimiento exacto antes de llamar. El hueco (una mensual con día tope el 10 podría vincular un imprevisto del 20 si alguien llama a la base saltándose la pantalla) está anotado en la migración. Decidido en el `to-issues`, opción (a).

**El acceso** (ADR 0004)

- El empleado registra imprevistos para sí mismo, ve los suyos, los marca, deshace sus marcas y borra los que registró él mientras no estén marcados.
- El administrador registra para cualquiera, ve todo y borra cualquiera.
- La lista de "quién lo pidió" sale de los administradores. Cuando exista CEB-145, se suman los supervisores sin cambiar el modelo.
- La ponderación desplazada se calcula solo para sesiones de administrador y nunca viaja a la del empleado.

**El dominio puro**, en tres módulos profundos:

- **Imprevistos**: dado cuándo se pidió, "hoy" o "mañana" y el calendario, devuelve el vencimiento, y rechaza cualquier otro. Dado el vencimiento y hoy, devuelve el retraso en días hábiles. Clasifica un imprevisto como abierto, vencido, marcado o borrado. La urgencia sale de la función de urgencia que ya existe.
- **Intromisión**: dado un incumplimiento (ocurrencia con su vencimiento, o atraso de flujo con su último "al día") y los imprevistos de la persona, devuelve los vinculables. Dadas las intromisiones de un periodo y las ponderaciones vigentes, devuelve la ponderación desplazada: cada previsto incumplido cuenta su ponderación una sola vez, aunque tenga varios imprevistos vinculados.
- **Cifras de imprevistos**: dados los imprevistos de un periodo, devuelve por persona y por quién lo pidió cuántos llegaron, hechos, "no pude", "no lo tomé", abiertos vencidos y el retraso promedio. Los borrados no cuentan, y "no lo tomé" cuenta como llegado.

**La pantalla del empleado**

- La columna derecha muestra los imprevistos abiertos arriba, vencidos incluidos, con su urgencia y su retraso. Si hay alguno, los flujos se compactan en una línea desplegable ("4 flujos · 1 atrasado") y nunca desaparecen.
- El plan, su corte en cinco, la meta, la racha y "lo que viene" no cambian.
- El formulario de registro pide texto, "hoy" o "mañana" y quién lo pidió.
- Marcar "no pude" en una ocurrencia y "me atrasé" en un flujo ofrecen, además de la razón, un selector opcional con los imprevistos vinculables.
- El listado del mes muestra los imprevistos del mes, sus marcas y los vínculos declarados, sin ponderación desplazada.

**La administración**

- Registrar un imprevisto para cualquier persona desde su ficha.
- El reporte suma, por persona y por quién lo pidió, las cifras de imprevistos, la ponderación desplazada y la lista de imprevistos con su texto tal cual, sin agrupar ni resumir, como el Patrón con las razones.

## Testing Decisions

- Un buen test prueba comportamiento externo (entradas del dominio contra salidas, o sesiones reales contra la base) y nunca la forma interna.
- **Dominio puro, con tests unitarios** para los tres módulos: imprevistos (vencimiento con fines de semana, feriados y vacaciones colectivas; rechazo de fechas más allá del día hábil siguiente; retraso), intromisión (bordes de la regla 3 el mismo día del vencimiento; flujos sin "al día" previo; ponderación contada una vez con varios imprevistos) y cifras (borrados excluidos, "no lo tomé" como llegado, retraso promedio sin abiertos). Prior art: `arrastre.test.ts`, `marcas.test.ts`, `calendario.test.ts`.
- **Pruebas de trazador** en `pruebas/` para INV-2 ampliado e INV-18 a INV-22, contra Supabase local con sesiones reales. Prior art: `inv-2-aislamiento`, `inv-3-lo-que-no-se-ve`, `inv-13-borrador`, `inv-14-ponderacion`.
- **Sin tests de módulo** para la web: queda cubierta por INV-19 e INV-22.

## Out of Scope

- **Que cada imprevisto traiga su propio peso.** Lo imprevisto pesa solo a través de la holgura (CEB-158).
- **Aprobar imprevistos.** Un flujo de aprobación sobre algo de último minuto es una contradicción. Rechazar ("no lo tomé") sí entra, porque es una respuesta de quien lo recibe.
- **Ponderación protegida** (vincular un rechazo al previsto que se protegió). La ponderación desplazada ya muestra el mal criterio, y la razón del "no lo tomé" dice lo demás.
- **Editar un imprevisto.** Se borra y se registra de nuevo.
- **Convertir un imprevisto en función.** Se da de alta con la pantalla que ya existe, y el imprevisto queda como pasó.
- **Detectar automáticamente imprevistos que se repiten.** Ver *Further Notes*.
- **Supervisores.** Registran y aparecen en "quién lo pidió" cuando exista CEB-145.
- **Notificaciones.** De un imprevisto uno se entera como hoy: el sistema lo registra, no lo avisa.
- **Sueldos y que el empleado vea el impacto en plata.** Va en CEB-147 y revierte el ADR 0007 si se hace.

## Further Notes

- **La holgura se cumple con los imprevistos** (CEB-158, añadido tras el grill): hechos sobre esperados, "no pude" y abiertos vencidos en contra, "no lo tomé" neutro, un mes sin imprevistos esperables no cuenta. La fila de holgura de la descarga del mes se llena con las columnas que ya existían, y deja de salir cumplida siempre.

- **Versión futura: detectar repeticiones con un LLM.** Leer los textos de los imprevistos y sugerir cuáles son una función que nadie dio de alta. Reabre la discusión del ADR 0006, que sacó el modelo de lenguaje del sistema, y si la sugerencia llega a la pantalla de un empleado habría que resucitar INV-9, que CEB-128 retiró porque ya no quedaba modelo. Por eso va detrás de meses de datos y de esa conversación.
- **Si CEB-147 abre la ponderación al empleado**, hay que cuidar que vincular imprevistos a lo de más peso no se vuelva una estrategia. La regla 3 contiene la mitad del riesgo; la otra mitad es que la ponderación desplazada hoy no la ve.
- **Depende de CEB-128** (el administrador y su pantalla). De CEB-145 solo depende para los supervisores; la rebanada sin ellos ya responde las tres preguntas.
- **Los pesos con los que se calcula la ponderación desplazada son los del ajuste retroactivo** anotado en `CONTEXT.md`. Conviene releerlo antes de sacar conclusiones duras del primer trimestre.
