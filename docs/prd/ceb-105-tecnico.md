# PRD técnico: Matriz de Eisenhower JFS

> Enriquece el Product PRD **CEB-105**. Sale del grill-with-docs del 2026-09-15; el vocabulario está en `CONTEXT.md` y las decisiones de fondo en los ADR 0001 a 0005 del repositorio. Donde este documento y CEB-105 difieren, manda este: la lista de diferencias está en *Further Notes*.

## Problem Statement

Los empleados de JFS reciben sus funciones en un documento que no les dice por dónde empezar: una lista plana de hasta diecisiete filas cuya urgencia real cambia con el calendario mientras el documento se queda quieto. JFS asigna y pondera, pero no sabe si el orden se entendió ni por qué algo no se hizo cuando no se hizo.

El documento, además, no se hizo para esto. Es un instrumento de reparto salarial maquetado para que lo lea una persona: un bloque por empleado con celdas combinadas, sin identificadores, con el ritmo de cada función escrito en prosa dentro del nombre ("ANTES DEL 3 DE CADA MES"), y con filas que son unidades de sueldo y no unidades de trabajo. El 46% de su peso no es agendable como tarea: 29% son flujos continuos, 14% áreas del rol y 2% holgura para imprevistos. JFS no va a cambiar su forma de trabajar.

## Solution

JFS sigue trabajando en su documento. A cada función le agrega dos datos: la **importancia**, del 0 al 9, y la **periodicidad**, elegida de una lista (diaria, semanal, quincenal, mensual, trimestral). Mantiene en una pestaña los feriados y las vacaciones colectivas, y lee en otra las razones que escribe el equipo.

El responsable técnico importa el documento cuando JFS lo cambia. La importación lo traduce al modelo del sistema, un agente propone el **tipo** y el **día tope** de cada función nueva o editada, y nada cambia en el plan de nadie hasta que el responsable revisa y confirma.

Cada empleado entra con un enlace a su correo y trabaja en una sola pantalla de dos columnas. A la izquierda, los **entregables** que vencen en los próximos cinco días hábiles, con el color de su cuadrante, el emoji de urgencia, la importancia y la urgencia etiquetadas, y los botones ¡Hecho! y no pude. A la derecha, sus **flujos**, siempre visibles, en estado al día o me atrasé. Arriba, un arco de progreso sin números y un banner que siempre dice lo más relevante. Aparte, el listado de su mes con el reparto de su cargo, y el cierre de mes, que agrupa por función lo que no se cumplió dos períodos seguidos.

## User Stories

**Empleado**

1. Como empleado, quiero entrar con un enlace que me llega al correo, para no recordar ni administrar una contraseña.
2. Como empleado, quiero ver solo mis funciones, para no confundir mi trabajo con el de otros ni ver lo que no me corresponde.
3. Como empleado, quiero ver los entregables que vencen en los próximos cinco días hábiles, para saber qué me toca esta semana sin armar el plan yo.
4. Como empleado, quiero los entregables ordenados por cuadrante y, dentro de cada uno, por lo que más pesa en mi cargo, para saber por dónde empezar.
5. Como empleado, quiero que el color de cada tarjeta diga su cuadrante (hacer ya, ponle fecha, mantener al día), para leer la prioridad de un vistazo.
6. Como empleado, quiero un emoji que diga cuánto falta para el vencimiento y los días exactos al pasar el cursor, para no leer fechas.
7. Como empleado, quiero la importancia y la urgencia etiquetadas junto al botón ¡Hecho!, para hablar con JFS en el mismo vocabulario.
8. Como empleado, quiero marcar un entregable como hecho y verlo bajar apagado, para que marcar produzca un cambio visible.
9. Como empleado, quiero marcar un entregable como no pude escribiendo la razón, para liberar el lugar y dejar constancia de por qué.
10. Como empleado, quiero que la pantalla me diga que JFS lee mis razones, para que la transparencia sea explícita.
11. Como empleado, quiero ver todos mis flujos siempre, en su propia columna y sin paginar, para que ninguno quede escondido.
12. Como empleado, quiero pasar un flujo a me atrasé escribiendo la razón, para hacer visible un atraso o un bloqueo que hoy me como en silencio.
13. Como empleado, quiero que un flujo atrasado muestre la tortuga, un riel rojo y mi razón, para que se distinga en una columna de etiquetas cortas.
14. Como empleado, quiero volver un flujo a al día cuando me pongo al día, para cerrar el atraso.
15. Como empleado, quiero un banner que siempre diga lo más relevante de la semana, para enterarme sin buscar.
16. Como empleado, quiero que el banner me avise al abrir cuando hay un feriado o vacaciones colectivas dentro de la semana, para planificar en vez de descubrirlo el viernes.
17. Como empleado, quiero que, cuando no hay nada más urgente que decir, el banner me recuerde dejar constancia si algo se atrasó, para no dejar un flujo en al día por inercia.
18. Como empleado, quiero que una semana con menos de cinco vencimientos se complete con lo importante que aún no aprieta, para que siempre haya trabajo disponible.
19. Como empleado, quiero ver el avance en un arco de veinte tramos sin contadores, para sentir progreso sin que un número me pese.
20. Como empleado, quiero no ver lo ya resuelto hasta haber atendido la mitad de la semana, para que un muro de logros no estorbe mientras queda mucho.
21. Como empleado, quiero que al terminar la meta de la semana se me ofrezca adelantar o parar, y que parar se valide sin culpa, para que la meta no se vuelva techo.
22. Como empleado, quiero ver todo mi mes y marcar desde ahí algo que cerré antes de que apareciera en el plan, para no tener que esperar.
23. Como empleado, quiero ver en el listado del mes cuánto de mi cargo es cada función, sin montos, para entender por qué me buscan por las porciones grandes.
24. Como empleado, quiero que el cierre de mes muestre las funciones que no se cumplieron dos períodos seguidos junto a mis razones tal como las escribí, para ver el problema separado de mí.
25. Como empleado, quiero que, si no hay ningún patrón, el cierre me muestre un logro como mi racha más larga, para que el cierre no sea solo reproche.
26. Como empleado, quiero que el primer cierre no me compare con un mes que no existe, para no ver ceros ni comparaciones inventadas.
27. Como empleado, quiero que nada me venza en un feriado ni en vacaciones colectivas, para que el conteo sea justo.
28. Como empleado, quiero que una función nueva empiece a contar en el siguiente período completo, para que nunca me toque un vencimiento imposible.
29. Como empleado, quiero usar la app en el teléfono con los entregables primero y los flujos debajo, para marcar cuando termino algo lejos del escritorio.

**JFS**

30. Como JFS, quiero seguir asignando y ponderando en mi documento, para no cambiar mi forma de trabajar.
31. Como JFS, quiero puntuar la importancia del 0 al 9 y elegir la periodicidad de una lista, para no memorizar ninguna convención de números.
32. Como JFS, quiero que la urgencia la calcule el calendario, para que no todo termine en el cuadrante urgente y se sature el equipo.
33. Como JFS, quiero mantener feriados y vacaciones colectivas como rangos de fechas en una pestaña, para que se cuenten los días hábiles de esta empresa y no los del país.
34. Como JFS, quiero leer en una pestaña de mi documento cada no pude, cada atraso y cada puesta al día, con fecha, persona, función y razón, lo más nuevo arriba, para ver dónde está el cuello de botella real.
35. Como JFS, quiero corregir la redacción de una función sin perder su historial, para aclarar mi documento sin miedo.
36. Como JFS, quiero que los montos y la asignación salarial nunca salgan de mi documento, para que el sueldo de nadie quede expuesto.
37. Como JFS, quiero enterarme cuando la periodicidad que escribí contradice un día tope escrito en el texto, para decidir yo cuál vale.

**Responsable técnico**

38. Como responsable técnico, quiero correr la importación cuando JFS cambia el documento y revisar los cambios antes de aplicarlos, para que una edición no altere el plan de nadie sin que alguien la mire.
39. Como responsable técnico, quiero ver funciones nuevas, desaparecidas y posibles renombres, y confirmar si son la misma, para que ninguna marca quede huérfana.
40. Como responsable técnico, quiero que un bloque con nombre desconocido nunca cree un empleado ni se importe, para que dar acceso sea siempre una decisión.
41. Como responsable técnico, quiero dar de alta empleados con el nombre exacto de su bloque y su correo, para vincular el documento con quien entra.
42. Como responsable técnico, quiero que el agente proponga tipo y día tope, poder corregirlos y que mi corrección nunca se pise, para no clasificar ochenta y seis filas en frío.
43. Como responsable técnico, quiero que las filas que el agente no pudo tipificar queden fuera del plan y listadas, para que ninguna falla sea silenciosa.
44. Como responsable técnico, quiero que cada corrección quede guardada junto a lo que propuso el agente, para usarla como ejemplo y medir un criterio nuevo.
45. Como responsable técnico, quiero que la importación avise cuando la lista de días no hábiles cubre menos de sesenta y de treinta días hábiles, y que no se calculen fechas más allá, para que el calendario nunca se acabe en silencio.
46. Como responsable técnico, quiero que la aplicación solo pueda escribir en la pestaña de razones, para que un error nunca toque el documento de sueldos.
47. Como responsable técnico, quiero que una falla al escribir en la hoja nunca pierda ni bloquee una marca, para que el empleado no dependa de Google.
48. Como responsable técnico, quiero un solo desplegable con el dominio en un paquete aparte, para tener una sola cosa que operar y poder extraer una API el día que haya un segundo consumidor.

## End-to-End Invariants

Cada invariante tiene una **prueba de trazador**: un test sobre la raíz de composición real (grafo de dependencias real, infraestructura real, cero reemplazos de proveedores) que la ejercita de punta a punta. Infraestructura real significa Supabase local, una copia del documento en una cuenta de Google de prueba con sus rangos protegidos, y el agente real.

**Definition of Done:** este PRD se cierra solo cuando cada invariante tiene su prueba pasando sobre el cableado real. Que pasen los criterios de aceptación de cada ticket es necesario pero no suficiente.

**INV-1 · Ningún monto existe en el sistema.** Ni `MONTO`, ni `ASIGNACION`, ni ningún valor derivable de ellos, en ninguna tabla ni en ninguna respuesta del servidor.
Prueba: importar una cuadrícula con la estructura real y montos inventados; recorrer todas las tablas y todas las respuestas de la API buscando esos valores. Cero coincidencias.

**INV-2 · Un empleado nunca obtiene datos de otro.** Ni funciones, ni marcas, ni estados de flujo, ni razones, ni plan, ni cierre, aunque una ruta de servidor olvide filtrar.
Prueba: dos empleados con sesión real; A llama todas las rutas de servidor y además una consulta sin filtro con su propio token. Cero filas de B.

**INV-3 · El empleado nunca ve su tasa de cumplimiento, y la ponderación solo aparece en el listado del mes.**
Prueba: las respuestas del plan, de la columna de flujos y del cierre no contienen ponderación ni tasa; la del listado del mes contiene ponderación y no contiene tasa.

**INV-4 · Toda razón llega a la pestaña de razones, y una falla de la hoja nunca pierde ni bloquea la marca.**
Prueba: marcar no pude con la hoja inaccesible; la marca persiste y la respuesta al empleado es de éxito. Restablecer la hoja, provocar otro cambio: la razón anterior aparece en la pestaña.

**INV-5 · Re-redactar una función conserva su historial.** Si la importación se confirma como la misma función, conserva marcas, estados, fecha de alta y valores corregidos.
Prueba: importar, marcar, cambiar el texto en la cuadrícula, reimportar confirmando. Historial intacto.

**INV-6 · La importación nunca crea un empleado.** Las filas de un bloque desconocido no se importan, se listan, y nadie puede verlas.
Prueba: cuadrícula con un bloque nuevo; tras importar, ninguna fila suya existe y aparece en la lista de bloques desconocidos.

**INV-7 · Nada vence en un día no hábil.** Ninguna ocurrencia vence en feriado, fin de semana ni vacaciones colectivas, y ninguna ocurrencia diaria existe en esos días.
Prueba: calendario con un feriado dentro de la ventana y un bloque de colectivas; plan y cierre del período no contienen vencimientos en esos días y los días tope que caen ahí se adelantan.

**INV-8 · Sin cobertura del calendario no se muestran fechas inventadas.** Ninguna fecha calculada más allá del horizonte de la lista de días no hábiles llega a la pantalla.
Prueba: lista que termina antes del horizonte; ninguna respuesta contiene vencimientos posteriores y la importación reporta el aviso.

**INV-9 · Ningún texto que ve el empleado lo produce un modelo de lenguaje.** El agente solo escribe un tipo de un conjunto cerrado y un día del mes.
Prueba: importar con el agente real; las únicas columnas que escribe su ruta son `tipo_generado` y `dia_tope_generado`, restringidas por la base a sus valores válidos.

**INV-10 · Una función nunca aparece dos veces en el plan, y marcar libera el lugar.** Marcar hecho o no pude saca la ocurrencia del bloque activo.
Prueba: función semanal con ocurrencia pendiente; marcar no pude; el plan ya no la muestra activa y otra ocurrencia ocupa el lugar si existe.

**INV-11 · Una corrección manual nunca se pisa.**
Prueba: corregir tipo y día tope; editar el texto de la fila y reimportar confirmando; los valores corregidos siguen mandando.

**INV-12 · La aplicación nunca escribe fuera de la pestaña de razones.**
Prueba: con los rangos protegidos reales, una escritura de la cuenta de la aplicación sobre la hoja de funciones es rechazada; tras una importación y una proyección, la hoja de funciones es idéntica a antes.

**Reglas de CEB-105 sin invariante.** Promesas que no tienen prueba de punta a punta; se verifican en pruebas de módulo o en revisión de diseño:
- La meta de la semana siempre se puede terminar.
- Terminar la meta nunca cierra la puerta, y parar se valida sin culpa.
- Al empleado nunca se le sugiere delegar.
- El cierre de mes nunca señala a la persona.
- El tiempo restante siempre usa el código de cuatro iconos, con los días exactos al pasar el cursor.
- Lo resuelto no se muestra antes de atender la mitad de la semana *(módulo de plan)*.
- El arco siempre tiene el mismo número de tramos *(módulo de plan)*.
- Cuando la ventana contiene un día no hábil, el empleado lo sabe al abrir *(módulo de plan: banner)*.

**Invariantes que ninguna regla de negocio pidió.** Alcance que salió del diseño técnico; cada una protege una regla existente, y se listan para que el PM las valide:
- INV-6, de ADR 0004.
- INV-8, del grill.
- INV-11, de ADR 0002.
- INV-12, de ADR 0001.

## Implementation Decisions

**Forma del sistema**

- Monorepo en TypeScript con dos espacios de trabajo: `packages/dominio`, puro y sin framework, y `apps/web`, una aplicación Next con la interfaz, sus rutas de servidor, los adaptadores y el comando de importación. Un solo desplegable. *(ADR 0005)*
- Supabase aporta Postgres, el acceso por enlace al correo y la seguridad por fila.
- La sesión viaja en cookies con `@supabase/ssr`: cada consulta desde el servidor de Next lleva el token del empleado, así que la seguridad por fila aplica sin reenviar nada. La llave de servicio solo la usan la importación y la proyección de razones. El navegador nunca consulta tablas: todo pasa por rutas de servidor. *(ADR 0004, 0005)*
- Arquitectura hexagonal: el dominio no conoce infraestructura. Puertos: lectura del documento, escritura de la pestaña de razones, agente de tipificación y repositorios. El dominio no importa a nadie, la infraestructura importa al dominio, y los componentes no importan infraestructura: solo la tocan las rutas de servidor. Una regla de lint lo sostiene.
- Los adaptadores viven en `apps/web` hasta que un segundo consumidor los necesite; ese día se mudan a `packages/infra` sin rehacer lógica.

**Módulos**

1. **Calendario hábil** (dominio, puro). Si un día es hábil, hábil anterior, hábiles entre dos fechas, estado de cobertura desde hoy.
2. **Motor de ocurrencias** (dominio, puro). Función + calendario + rango → ocurrencias con su período y su vencimiento.
3. **Plan** (dominio, puro). Ocurrencias + marcas + estados de flujo + hoy → urgencia, cuadrante, plan de la semana, columna de flujos y banner.
4. **Cierre de mes** (dominio, puro). Mes + marcas + estados → cumplimiento ponderado, patrones por función y rachas.
5. **Lector del documento** (dominio, puro sobre una cuadrícula de celdas). Bloques, funciones normalizadas y días no hábiles.
6. **Reconciliación** (dominio, puro). Lectura + estado actual → cambios propuestos.
7. **Agente de tipificación** (adaptador). Texto + ejemplos corregidos → tipo y día tope.
8. **Proyección de razones** (adaptador). Eventos → filas de la pestaña.
9. **Esquema y seguridad por fila** (Supabase).
10. **Importación** (comando del repositorio, lo corre el responsable técnico).
11. **Interfaz y rutas de servidor** (Next), delgadas sobre el dominio.

**Esquema**

- `empleado`: id, nombre exacto del bloque, correo, usuario de autenticación.
- `funcion`: id, empleado, hash de identidad, texto, ponderación, importancia, periodicidad, `tipo_generado`, `tipo_corregido`, `dia_tope_generado`, `dia_tope_corregido`, fecha de alta, activa. El valor vigente de un campo derivado es el corregido si existe y, si no, el generado.
- `marca`: función, período, resultado (hecho | no pude), razón, momento. Única por función y período.
- `evento_flujo`: función, estado (al día | atrasado), razón, momento. El estado vigente es el último evento.
- `dia_no_habil`: desde, hasta, descripción.
- Configuración de pantalla: la tabla de días hábiles restantes → urgencia 0–9.
- Restricciones en la base para cada conjunto cerrado: tipo, periodicidad, resultado, estado, día tope entre 1 y 31, importancia entre 0 y 9.
- Seguridad por fila en todas las tablas con datos de empleado: cada fila es visible solo para el usuario vinculado a su empleado.
- `MONTO`, `ASIGNACION` y `CLASIFICACION` no tienen columna. *(ADR 0001)*

**Las ocurrencias no se guardan: se calculan.** Una ocurrencia se identifica por *(función, período)*. No hay vencimientos que renovar ni tabla de ocurrencias.

**Periodicidad, período y vencimiento** *(ADR 0003)*

| Periodicidad | Período | Vence |
|---|---|---|
| diaria | cada día hábil | ese día |
| semanal | lunes a viernes | el último hábil de la semana |
| quincenal | del 1 al 15 · del 16 a fin de mes | el 15 · el último hábil del mes |
| mensual | el mes | el día tope si existe; si no, el último hábil del mes |
| trimestral | ene–mar · abr–jun · jul–sep · oct–dic | el último hábil del trimestre |

- Si el vencimiento cae en un día no hábil, se adelanta al hábil anterior. Si el día tope no existe en el mes, vence el último día del mes, con la misma regla.
- Una función cuenta desde el siguiente período completo después de su fecha de alta. Un cambio de periodicidad aplica igual.
- Antes del vencimiento, una ocurrencia se puede cerrar cualquier día; marcar cierra siempre la próxima ocurrencia pendiente.

**Urgencia, cuadrante y plan**

- Urgencia: días hábiles restantes hasta el vencimiento, convertidos a 0–9 con la tabla de configuración. Nadie la escribe.
- Emoji: 🔥 hasta 1 día hábil, 💣 hasta 3, 🧠 hasta 7, 🍃 8 o más.
- Importancia efectiva: a 3 días hábiles o menos del vencimiento sube a un mínimo de 5, excepto en diarias y semanales. Si urgencia e importancia quedan ambas por debajo de 4,5, la importancia sube a 5: no existe el cuarto cuadrante.
- Cuadrante, con corte en 4,5: urgencia e importancia altas → hacer ya; urgencia alta e importancia baja → mantener al día; urgencia baja → ponle fecha.
- La lista nunca queda vacía: muestra siempre las cinco ocurrencias más próximas, aunque venzan después de la ventana. La ventana de cinco días hábiles delimita la **meta** de la semana, no lo que se muestra. Solo entran entregables.
- Selección por vencimiento más cercano y luego por ponderación. La presentación ordena por cuadrante (hacer ya, ponle fecha, mantener al día), luego por ponderación y luego por días restantes.
- Columna de flujos: todas las funciones de tipo flujo, sin paginar, con su estado vigente y, si están atrasadas, la razón.
- Áreas y holgura no entran a la pantalla de trabajo; aparecen solo en el listado del mes.
- Banner, primera condición que se cumpla. Registro de alerta: (1) días no hábiles dentro de la ventana; (2) algo vence hoy o mañana; (3) un flujo lleva N días hábiles atrasado. Registro tranquilo: (4) recordatorio de dejar constancia de un atraso; (5) avance del mes. El umbral N se fija con uso real.
- Tarjeta de entregable: emoji, título, importancia y urgencia etiquetadas junto a ¡Hecho!, y no pude. Tarjeta de flujo: 🍃 al día o 🐢 me atrasé, importancia, y el texto en primera persona.
- Sin contadores. El arco tiene veinte tramos fijos.

**Cierre de mes**

- Patrón: una función sin cumplir dos períodos seguidos, sea por no pude o por vencer sin marcar. En un flujo: un atraso declarado dos veces en el mismo mes. Se agrupa por función, nunca por el texto de la razón, que se muestra tal cual. Agrupar por causa requeriría un modelo de lenguaje en texto de interfaz.
- Cada elemento se muestra solo si tiene datos: sin mes anterior, no hay comparación.
- Si no hay patrones, el lugar lo ocupa un logro: la racha más larga.
- El cumplimiento ponderado se calcula para JFS y nunca se expone al empleado.

**Importación** *(ADR 0001, 0002, 0004)*

- A demanda, sin scheduler. Pasos: leer el documento → normalizar → proponer tipo y día tope para filas nuevas o editadas → reconciliar → mostrar cambios → confirmar → guardar.
- Lector de bloques: una fila de datos es cualquier fila con texto en `INDICADORES` que no sea el propio encabezado; pertenece al último nombre combinado de arriba. El nombre es la fila combinada inmediatamente encima de un encabezado; un encabezado sin nombre encima (el bloque plantilla) se descarta. La fila de totales se salta sola.
- Normalización: mayúsculas, espacios colapsados, sin acentos y sin puntuación de borde.
- Identidad de función: hash del id del empleado + texto normalizado. Nunca del nombre del empleado.
- Reconciliación: funciones nuevas, desaparecidas, posibles renombres (función y bloque), bloques desconocidos, filas sin tipo, y conflictos entre día tope y periodicidad. Los renombres los confirma una persona; no hay heurística de similitud.
- Un bloque desconocido nunca crea empleado: no se importa y se lista.
- Cobertura: aviso a 60 y a 30 días hábiles del final de la lista de días no hábiles; más allá del horizonte no se calculan fechas.
- La periodicidad llega de un desplegable nativo de la hoja en la columna `Urgente`; los días no hábiles, de una pestaña con rangos.

**Agente de tipificación** *(ADR 0002)*

- Un modelo de Claude, configurable. Entrada: el texto de la función más ejemplos tomados de filas corregidas. Salida validada contra un esquema: tipo del conjunto cerrado y día tope entre 1 y 31 o vacío.
- Solo corre sobre filas nuevas o editadas y solo escribe los campos `_generado`. Una falla deja la fila sin tipo, fuera del plan y listada.

**Pestaña de razones** *(ADR 0001)*

- Proyección, no persistencia: se regenera completa desde la base después de cada marca de no pude y cada evento de flujo, en un intento que corre después de guardar. Una falla se registra y la corrige la siguiente regeneración.
- Columnas: fecha, persona, función, qué pasó (no pude, me atrasé, me puse al día), razón. Lo más nuevo arriba.
- Rangos protegidos en modo restringido: la cuenta de la aplicación solo puede editar esta pestaña, y nadie más puede editarla.

## Testing Decisions

- **Qué es un buen test:** ejercita el comportamiento a través de la interfaz del módulo, con entradas reales (fechas del calendario de 2026, cuadrículas con la forma del documento) y aserciones sobre la salida. No verifica detalles internos ni usa dobles de colaboradores del propio dominio.
- **Módulos con tests:**
  - *Calendario hábil y motor de ocurrencias.* Casos mínimos: el 3 de octubre de 2026 cae sábado y vence el viernes 2; día tope 31 en un mes de 30; alta a mitad de período; quincenal con el 15 en fin de semana; trimestral; feriado y colectivas dentro de la ventana; aviso de cobertura a 60 y 30.
  - *Plan y cierre de mes.* Casos mínimos: excepción de la regla de proximidad para diarias y semanales; piso de importancia 5; la lista trae cinco aunque la semana no traiga ningún vencimiento; orden de presentación; banner en cada una de sus cinco condiciones; flujo atrasado dos veces; lo vencido sin marcar cuenta en el patrón; primer mes sin comparación.
  - *Lector del documento y reconciliación.* Una cuadrícula de prueba que copia la estructura real: nombres combinados, encabezados, fila de totales, bloques pegados sin fila en blanco, bloque plantilla vacío, espacios finales, dos Marías, montos inventados. Renombre de función, renombre de bloque, bloque desconocido, fila sin tipo, conflicto de día tope.
  - *Privacidad de punta a punta.* Las pruebas de trazador de INV-1, INV-2 e INV-3 sobre cableado real.
- **Pruebas de trazador:** una por invariante, sobre Supabase local, la copia del documento con sus rangos protegidos y el agente real.
- **Sin tests de módulo:** el agente de tipificación y la proyección de razones (adaptadores delgados cubiertos por INV-4, INV-9 e INV-12) y la interfaz web.
- **Antecedentes:** el repositorio no tiene código todavía. El generador que produjo los wireframes codificaba un modelo anterior (urgencia escrita como ciclo) y no debe tomarse como referencia.

## Out of Scope

- Agente conversacional para interactuar con el sistema.
- Mostrarle montos en dólares al empleado.
- Mostrarle al empleado su tasa de cumplimiento. Reversible: el dato existe.
- Pantalla propia de JFS. Lee las razones en su documento.
- Bitácora de cambios del catálogo y modelo de tablas de hechos.
- Vencimientos de una sola vez.
- La matriz como pantalla principal.
- Descomponer funciones compuestas sin repartir su ponderación, incluido seguir el preliminar de cada 15 días de los dos cierres que lo traen.
- Agrupar razones por causa o una lista de motivos al marcar no pude.
- Unificar importancia y urgencia en un solo número (el peso).
- Un toque semanal que pida confirmar los flujos.
- El orquestador agéntico y las herramientas o MCP de la etapa 5.
- Vacaciones individuales: en esta empresa no existen.

## Further Notes

**Diferencias con CEB-105.** El PRD de producto debe corregirse en:
- *"No hay columna de periodicidad"* y *"la urgencia que escribe JFS significa el ciclo"*: JFS escribe periodicidad y la urgencia se calcula. *(ADR 0003)*
- *"Ciclos más largos que un mes quedan fuera"*: trimestral entra.
- La regla de proximidad para funciones *"de siete días hábiles o menos"*: ahora exceptúa diarias y semanales.
- *"Una tarea diaria pide cinco a la semana"*: casi todo lo diario resultó ser flujo, que no produce ocurrencias.
- *"La aplicación escribe la última razón de vuelta al Excel"*: escribe un historial completo en una pestaña del mismo documento.
- *"El bloque de feedback agrupa las razones"*: agrupa por función.
- *"JFS debe puntuar unas cuarenta y cinco filas"*: son 86.
- Las cuatro funciones de mayor peso que vencen el día tres son seis, en cinco personas, entre el 2 y el 3.
- Las nueve preguntas abiertas quedan respondidas; la fragilidad del lector de bloques queda contenida en la capa anticorrupción, no eliminada.

**Pendiente con JFS:** puntuar importancia y periodicidad en las 86 filas; cargar feriados y colectivas; confirmar la fecha real del reporte trimestral de Toyota; confirmar que cada empleado tiene correo propio y no compartido.

**Pendiente técnico:** decidir dónde se despliega la aplicación. Arrancar, idealmente, el primer día hábil de un mes, y mejor de un trimestre, para que todas las funciones empiecen alineadas.

**Diseño:** [wireframes](https://claude.ai/artifact/BqLXuPeeDZeKpE61HiyQmx) · [one-pager de la premisa](https://claude.ai/artifact/McfcYQU3yFTdnwwAMLCzwz)
