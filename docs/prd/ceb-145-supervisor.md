# PRD: El supervisor, un empleado que responde por otros

> Sale del `grill-with-docs` del 2026-09-29 sobre el borrador de CEB-145, al que reemplaza. El vocabulario está en `CONTEXT.md` (**Supervisor**, **Delegación**, el resultado **devuelto** en la **Holgura**, y quién lee la **Razón de no ejecución**), y la decisión de fondo en el **ADR 0012**. El borrador es anterior a los imprevistos (CEB-146) y al bono (CEB-147); donde decía "urgentes", ahora son imprevistos.

## Problem Statement

El administrador lee las razones de todo el mundo y es el único que puede actuar sobre ellas. Pero quien se entera de que algo no se hizo, y el mismo día, es quien tiene a esa persona al lado. Hoy ese enterarse pasa fuera del sistema y no deja rastro: llega al sistema un mes después, convertido en arrastre, cuando ya no se puede hacer nada con él.

Además, quien tiene gente a cargo le pasa trabajo, y a veces es trabajo suyo: el cierre de este mes, que es de su reparto, lo hace otra persona. El sistema no lo ve. Si sale bien, parece que lo hizo el titular; si sale mal, no queda claro quién falló, y si se repite todos los meses, nadie nota que falta un traspaso.

## Solution

**El supervisor es un empleado con gente a cargo.** Tiene su propio reparto, su plan, sus marcas y su bono, como cualquiera. Cada empleado tiene a lo sumo un supervisor, y quien supervisa no tiene supervisor: hay un solo nivel. Lo decide el administrador desde la ficha.

**Ve lo que necesita para actuar, y nada de sueldo.** De su gente ve las funciones con su estado y su arrastre en tiempo ("ocho periodos, desde el 14 de julio"), las razones, los imprevistos y las delegaciones. No ve ponderaciones, tasas, bonos ni montos: un peso es una conversación de sueldo, y esa es del administrador. Ve a quien tiene a cargo hoy, con todo su pasado; cuando se lo cambian, deja de verlo.

**Le pide imprevistos a su gente.** Aparece en la lista de "quién lo pidió" para cualquier empleado, y puede registrar imprevistos directamente en la pantalla de su gente, y solo de ella.

**Delega ocurrencias suyas sin traspasarlas** (ADR 0012). Una delegación es un imprevisto de quien la recibe, vinculado a una ocurrencia del supervisor que todavía no venció. Vence con esa ocurrencia. Quien la recibe la marca como cualquier imprevisto, y esa marca no cierra la ocurrencia: el supervisor ve "Hecho por ROSIBEL" o "ROSIBEL no pudo" y marca la suya, o la devuelve a la misma persona o a otra, como una delegación nueva. Devolver un "hecho" lo convierte en **devuelto**, con razón, y cuenta en contra en la holgura de quien lo recibió. Si no se cumple, pierden los dos.

**Supervisar no pesa por sí mismo.** No hay función especial ni cálculo a partir de la gente a cargo: el impacto está en que lo delegado sigue en las ocurrencias del supervisor. Si el administrador quiere que pese, da de alta una función como cualquier otra.

## User Stories

**Supervisor**

1. Como supervisora, quiero ver la lista de mi gente a cargo, para saber por quién respondo.
2. Como supervisora, quiero ver las funciones de cada persona a mi cargo con su estado, para saber qué está al día y qué no sin preguntar.
3. Como supervisora, quiero ver el arrastre de cada función en tiempo ("desde el 14 de julio"), para saber qué ya es grave.
4. Como supervisora, quiero leer las razones de "no pude", de atraso y de devolución de mi gente, para enterarme el mismo día y no un mes después.
5. Como supervisora, quiero ver los imprevistos de mi gente con su estado y su retraso, incluidos los que pidieron otros, para saber qué les está cayendo.
6. Como supervisora, quiero registrarle un imprevisto a alguien a mi cargo, para que lo que le pido quede contado a mi nombre.
7. Como supervisora, quiero aparecer en la lista de "quién lo pidió" de cualquier empleado, para que lo que le pido a alguien de otro equipo quede a mi nombre cuando él lo registre.
8. Como supervisora, quiero delegar una ocurrencia mía a alguien a mi cargo, para repartir el trabajo sin pedirle un traspaso al administrador.
9. Como supervisora, quiero que solo se me ofrezcan para delegar ocurrencias que todavía no vencieron y que no están ya delegadas, para no pasar algo que ya dejé caer.
10. Como supervisora, quiero que la delegación venza cuando vence mi ocurrencia, para no apurar a nadie más de lo que yo estaba apurada.
11. Como supervisora, quiero ver mis delegaciones en su propia sección debajo de mis tareas, para que no me quiten espacio de lo que tengo que hacer yo.
12. Como supervisora, quiero ver primero las delegaciones que ya marcó quien las recibió, para revisar lo que espera por mí.
13. Como supervisora, quiero ver "Hecho por ROSIBEL" o "ROSIBEL no pudo" con su razón, para decidir con lo que pasó a la vista.
14. Como supervisora, quiero aprobar una delegación marcando mi ocurrencia como hecha, para cerrarla después de revisarla.
15. Como supervisora, quiero devolver un "hecho" que no me convence, con una razón, a la misma persona o a otra, para que se rehaga sin fingir que se cumplió.
16. Como supervisora, cuando alguien no pudo o no tomó lo que le delegué, quiero delegarlo a otra persona o hacerlo yo, para no perder la ocurrencia.
17. Como supervisora, quiero seguir marcando mi ocurrencia "no pude" con mi razón si nadie la pudo hacer, porque respondo por ella.
18. Como supervisora, quiero que mi plan, mis marcas y mi mes sigan siendo los de cualquier empleado, porque supervisar no me saca de mi trabajo.
19. Como supervisora, quiero no ver las ponderaciones, tasas ni bonos de mi gente, para que mi relación con ellos no sea una conversación de sueldo.

**Empleado a cargo**

20. Como empleado, quiero ver en mi pantalla lo que mi supervisora me delegó como un imprevisto que dice "delegado por DOUGLENIS", para saber de dónde viene y que no es mío.
21. Como empleado, quiero marcar una delegación hecha, "no pude" o "no lo tomé", como cualquier imprevisto, para responder con las mismas palabras de siempre.
22. Como empleado, quiero que "no lo tomé" en una delegación no me cueste nada, para poder decir a tiempo que no llego.
23. Como empleado, quiero saber que mi supervisora lee mis razones, para escribirlas sabiendo quién las lee.
24. Como empleado, quiero que una devolución traiga la razón de mi supervisora, para saber qué rehacer.
25. Como empleado, quiero que mi supervisora no vea mi bono ni mis ponderaciones, para que eso siga siendo entre el administrador y yo.

**Administrador**

26. Como administradora, quiero asignarle un supervisor a un empleado desde su ficha, para que el sistema sepa quién responde por quién.
27. Como administradora, quiero que el sistema no me deje darle supervisor a quien ya supervisa, ni supervisar a un supervisado, ni que alguien se supervise a sí mismo, para que el alcance no crezca por cadena.
28. Como administradora, quiero cambiar o quitar el supervisor de alguien, para que el sistema siga a la realidad.
29. Como administradora, quiero ver en el reporte del mes, por supervisor, cuántas ocurrencias delegó, cuántas devolvió y de qué funciones, para detectar un traspaso que nadie hizo.
30. Como administradora, quiero que la descarga diga "delegado por DOUGLENIS" en la fila del imprevisto, para leerlo sin columnas nuevas.
31. Como administradora, quiero que un "devuelto" cuente en contra en la holgura como un "no pude", para que marcar hecho algo mal hecho no salga gratis.
32. Como administradora, quiero seguir siendo la única que reparte, pondera, traspasa y fija bonos, para que el supervisor no mueva sueldo de nadie.

## End-to-End Invariants

Los de CEB-106, CEB-128, CEB-146 y CEB-147 siguen vigentes. Cada invariante necesita su prueba de trazador sobre el cableado real (Supabase local, sesiones reales de supervisor, empleado y administrador, sin llave de servicio en el servidor web), y este PRD no se cierra hasta que pasen.

**INV-1 se extiende.** El bono lo ve solo la persona a quien pertenece y el administrador.
Prueba: con una supervisora y su gente con bono, ninguna respuesta de la sesión de la supervisora contiene el bono de nadie más que el suyo.

**INV-2 se reescribe.** Nadie obtiene datos de otro empleado, salvo el administrador y el supervisor de quien tiene a cargo *hoy*.
Prueba: tres sesiones, una supervisora, alguien a su cargo y un vecino que no lo está. La supervisora obtiene lo de su gente y nada del vecino; el de su gente no obtiene nada de ella ni del vecino. Se le cambia el supervisor a la persona a cargo: la supervisora deja de obtener sus datos.

**INV-3 se reescribe.** Ningún empleado obtiene tasas ni ponderaciones de otro, tampoco el supervisor de su gente.
Prueba: recorrer todas las respuestas de la sesión de la supervisora sobre su gente, por la web y por consulta directa a la base; ninguna contiene ponderación, cumplimiento ponderado, ponderación arrastrada, desplazada, ni un valor del que se derive.

**INV-18 se reescribe.** Un imprevisto vence a más tardar el día hábil siguiente a cuando se pidió; una delegación vence con su ocurrencia, que todavía no venció.
Prueba: delegar una ocurrencia ya vencida se rechaza; delegar con un vencimiento distinto del de su ocurrencia se rechaza (hasta el fin de su periodo, como INV-20); un imprevisto sin delegación sigue sin poder vencer después del día hábil siguiente.

**INV-25 · La marca de quien recibe una delegación nunca cierra la ocurrencia del supervisor.** Solo la cierra la marca del supervisor.
Prueba: la persona a cargo marca hecha la delegación; la ocurrencia de la supervisora sigue abierta en su plan y en la descarga. La supervisora la marca; recién entonces se cierra.

**INV-26 · Un supervisor solo registra imprevistos y delegaciones en su gente, y solo delega ocurrencias suyas que no vencieron, una delegación abierta a la vez.**
Prueba: la supervisora intenta registrar un imprevisto al vecino, delegar una ocurrencia de otro, delegar una ocurrencia suya a alguien que no está a su cargo y delegar dos veces la misma ocurrencia; la base rechaza las cuatro. La persona a cargo intenta delegar; se rechaza.

**INV-27 · Devolver un "hecho" exige razón y cuenta en contra en la holgura de quien lo recibió.**
Prueba: devolver sin razón se rechaza. Con razón, la holgura y la descarga de quien lo recibió lo cuentan como no cumplido. Solo el supervisor que delegó puede devolver.

**INV-28 · Solo el administrador decide quién supervisa a quién, y quien tiene gente a cargo no tiene supervisor.**
Prueba: un empleado y una supervisora intentan asignar supervisor; se rechaza. El administrador intenta darle supervisor a quien supervisa, supervisar a un supervisado, o hacer que alguien se supervise a sí mismo; la base rechaza las tres.

## Implementation Decisions

**El modelo**

- `empleado` suma `supervisor_id`, nullable, que apunta a otro empleado. No hay tabla `equipo`: hará falta cuando el grupo tenga nombre propio, historia o más de un supervisor. Tampoco se llama área: esa palabra ya es una clase de función.
- La base impide que alguien se supervise a sí mismo, que quien supervisa tenga supervisor y que quien tiene supervisor supervise. Solo el administrador lo escribe, por una acción de la base.
- No se guarda historia de quién supervisó a quién. Los imprevistos pedidos conservan su nombre.
- "Quién lo pidió" deja de ser solo un administrador: pasa a ser una persona del sistema (administrador o supervisor) o un texto de "otro", exactamente uno de los dos. La lista de quienes piden suma a todos los supervisores.
- **La delegación es un imprevisto** con una referencia a la ocurrencia del supervisor, por función y periodo. No es una tabla nueva: todo lo que ya vale para un imprevisto (marca, borrado, cifras, holgura, intromisión) vale para ella.
- **Devuelto** se guarda aparte de la marca de quien la recibió, con quién, cuándo y la razón: la marca original no se reescribe, y la devolución la anula para las cifras. En la holgura y la descarga cuenta como un "no pude".
- Una ocurrencia tiene a lo sumo una delegación abierta. Está abierta mientras no tenga marca, o mientras tenga un "hecho" que el supervisor no aprobó ni devolvió. Un "no pude" o "no lo tomé" la cierra y permite delegar otra vez.
- Aprobar no es un acto nuevo: es la marca de siempre del supervisor sobre su ocurrencia.
- El vencimiento de una delegación lo calcula el dominio (con día tope). La base comprueba que la ocurrencia no venció y que la fecha no pasa del fin de su periodo; el hueco del día tope es el mismo que el de INV-20 y queda anotado en la migración.

**El acceso** (ADR 0004)

- La ponderación vive en las filas de `titularidad` y `funcion`, y la seguridad por fila y los permisos por columna aplican igual a todos los empleados. Por eso **el supervisor no recibe políticas nuevas sobre esas tablas**: lee a su gente a través de funciones de la base que devuelven solo lo que puede ver (funciones con estado y arrastre, razones, imprevistos, delegaciones). INV-3 se cumple por construcción.
- Sí recibe políticas sobre `imprevisto` para registrar y ver los de su gente, y acciones de la base para delegar y devolver.
- Una función de la base dice "esta persona está a mi cargo hoy", y todo lo anterior se apoya en ella, como `soy` y `es_mia`.
- El bono no cambia: sigue siendo del dueño y del administrador.

**El dominio puro**

- **Delegación**, un módulo nuevo:
  - Dado el imprevisto de una delegación y la marca de la ocurrencia, devuelve su estado: esperando, para revisar, aprobada, devuelta o no tomada.
  - Dadas una ocurrencia, hoy y las delegaciones existentes, dice si se puede delegar, y si no, por qué.
  - Da el vencimiento de la delegación, que es el de su ocurrencia.
  - Agrupa las delegaciones del mes por supervisor y función, con cuántas se delegaron y cuántas se devolvieron.
- **Imprevistos** y **descarga** se amplían: devuelto cuenta en contra en la holgura y sale como no cumplido en la descarga; el texto de una delegación dice "delegado por" su supervisor.

**La pantalla del supervisor**

- Su plan no cambia. Debajo de las tareas y antes de "Ya resueltas" va la sección **Delegadas**: primero las que esperan su revisión ("Hecho por ROSIBEL", "ROSIBEL no pudo: *razón*") con Aprobar y Devolver, después las que esperan a su gente ("Delegada a ROSIBEL · vence el 9 de octubre"), sin botones.
- En cada tarea delegable, una acción para delegar a alguien de su gente.
- Una vista de su gente: por persona, funciones con estado y arrastre, razones, imprevistos y delegaciones. Sin pesos, montos ni porcentajes.
- Registrar un imprevisto para alguien de su gente desde esa vista.

**La pantalla del empleado a cargo**

- La delegación aparece como un imprevisto más, con "delegado por DOUGLENIS" y su vencimiento. Una devolución llega como una delegación nueva con la razón del supervisor.

**La administración**

- La ficha del empleado suma "Supervisor", con un selector.
- El reporte del mes suma las delegaciones por supervisor y función.
- La descarga no suma columnas: la delegación sale en la fila de holgura de quien la recibió, con su texto, y la ocurrencia en la fila de su supervisor.

## Testing Decisions

- Un buen test prueba comportamiento externo (entradas del dominio contra salidas, o sesiones reales contra la base) y nunca la forma interna.
- **Dominio puro, con tests unitarios**:
  - Delegación: estados en todas sus transiciones; no delegable si venció o tiene una abierta; un "hecho" sin revisar la mantiene abierta; un "no pude" o "no lo tomé" la libera; vencimiento con día tope; agrupado por función.
  - Imprevistos y descarga: devuelto cuenta en contra y dentro de las veces; "no lo tomé" sigue neutro.
  - Prior art: `imprevistos.test.ts`, `descarga.test.ts`, `intromision.test.ts`.
- **Pruebas de trazador** en `pruebas/` para INV-1, INV-2, INV-3, INV-18 y INV-25 a INV-28, contra Supabase local con sesiones reales. Prior art: `inv-2-aislamiento`, `inv-3-lo-que-no-se-ve`, `inv-18-imprevistos`, `inv-23-bono`.
- **Sin tests de módulo** para la web: queda cubierta por INV-3 e INV-25.

## Out of Scope

- **Que el supervisor publique repartos, pondere, traspase o toque bonos.** Todo eso mueve sueldo y es del administrador.
- **Que el supervisor declare atrasos de flujo de su gente.** Seguimos con buena fe; se revisa con los tres meses de datos.
- **Más de un nivel**, y **una persona con dos supervisores**. Que lo pida la realidad.
- **Historia de supervisión.** El supervisor ve a quien tiene hoy.
- **Delegar flujos.** Un flujo no tiene ocurrencias que cumplir.
- **Que la marca de quien recibe cierre sola la ocurrencia** (ADR 0012).
- **Una función especial de "supervisar"**, o calcular el cumplimiento del supervisor con el de su gente.
- **Que el supervisor vea un conteo de sus delegaciones.** Las ve en su lista; el conteo es del administrador.
- **Bajas de empleados**, diferido desde CEB-128.

## Further Notes

- El glosario tenía "supervisor" bajo *Avoid* de **Administrador**. Ahora es un rol propio, y el glosario dice en qué se distinguen: el administrador asigna, el supervisor responde por su gente.
- Una delegación que se repite es un traspaso que nadie hizo. El reporte la agrupa por función para que se vea; convertirla es un traspaso del administrador con la pantalla que ya existe.
- Si el supervisor nunca revisa, la ocurrencia arrastra en su cuenta aunque su gente la haya hecho. Es el costo de pedir revisión, y cae sobre quien la pide.
- Si a alguien le cambian el supervisor con una delegación abierta, la delegación sigue: es de quien la hizo, y la ve en su sección de Delegadas.
