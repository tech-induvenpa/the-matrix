# PRD: JFS asigna en el sistema

> Continúa **CEB-106**, que está cumplido y cerrado. Sale del `grill-with-docs` del 2026-09-21; el vocabulario está en `CONTEXT.md` y las decisiones de fondo en los **ADR 0006, 0007 y 0008**, que retiran a 0001 y 0002. Donde este documento y CEB-106 difieran, manda este.

## Problem Statement

El sistema funciona y está en producción, pero la entrada de JFS sigue siendo una hoja de cálculo. Todo lo que sigue sale de ahí:

- **Cada edición necesita un traductor humano.** Nada cambia en el plan de nadie hasta que alguien corre un comando, revisa lo que el lector entendió y confirma. Ese paso existe porque el documento hay que interpretarlo, y la interpretación puede salir mal.
- **Renombrar parte el historial.** La identidad de una función es `hash(empleado + texto normalizado)`, así que re-redactar un nombre crea una función y mata otra.
- **Mover trabajo entre personas es invisible.** Por la misma razón: un traspaso se ve como una baja y un alta, y nadie se entera de que es el mismo trabajo el que cambió de manos.
- **JFS no ve nada.** Lee las razones en una pestaña de su documento, y no tiene forma de saber quién está ejecutando qué ni qué lleva meses sin cumplirse.
- **El tipo de una función lo infiere un modelo de lenguaje**, con su clave, su latencia y su modo de fallo, porque el ritmo y la fecha tope viven escritos en prosa dentro del nombre.
- **La aplicación tiene permiso de escritura sobre el documento de sueldos.** Contenido con rangos protegidos, pero es un permiso que existe.

Y una de fondo. La ponderación se repartió **hacia atrás**: se sabía lo que gana cada persona y se acomodaron porcentajes sobre sus funciones hasta cuadrar cien. La flecha va hoy sueldo → ponderación. Este sistema existe para invertirla, y no puede hacerlo mientras no sepa quién ejecuta qué.

## Solution

**JFS asigna, pondera, puntúa y mantiene el calendario en una pantalla propia.** El documento deja de ser entrada: no se lee salvo una vez, en la migración, y no se escribe nunca más.

Tres cambios de modelo lo sostienen:

**La función existe por sí misma.** Tiene identidad propia, un titular a la vez, y guarda todos los titulares que tuvo. Editar su nombre no la mata. Traspasarla no parte su historia.

**El reparto es la unidad de edición.** Nadie cambia la ponderación de una función suelta: redistribuye el cien de una persona. JFS edita en borrador cuanto quiera; lo que ve el empleado es siempre el último reparto publicado, y un reparto que no suma cien no se puede publicar.

**El arrastre es lo que JFS venía a buscar.** Períodos seguidos sin cumplirse, contados en períodos y mostrados en tiempo. Se cuenta dos veces porque son dos preguntas: el arrastre de la **función** cruza a los titulares y dice que el trabajo está roto; el de la **persona** se reinicia en el traspaso y dice qué es justo pedirle hoy.

El empleado no cambia. Su pantalla, su plan, sus marcas y sus razones siguen igual.

## User Stories

**Administrador** *(rol nuevo: una persona, ve todo)*

1. Como administradora, quiero entrar con un enlace a mi correo igual que un empleado, para no administrar otra credencial.
2. Como administradora, quiero dar de alta a una persona con su nombre y su correo, y que reciba su acceso, para no depender de nadie técnico.
3. Como administradora, quiero crear una función escribiendo su nombre, sin meterle la fecha ni el ritmo dentro del texto, para que el empleado lea un título limpio.
4. Como administradora, quiero que la pantalla me pregunte qué clase de trabajo es —si se entrega y queda terminado, o se atiende mientras haya— en vez de elegir entre cuatro palabras, para que el criterio sea el mismo en enero y en julio.
5. Como administradora, quiero escribir el día tope en su propio campo, para que cambiarlo no deje el nombre mintiendo.
6. Como administradora, quiero repartir el cien de una persona viendo siempre cuánto llevo y cuánto me falta, para cuadrar sin calculadora.
7. Como administradora, quiero dejar un reparto a medias y volver mañana, para no tener que resolverlo todo de una sentada.
8. Como administradora, quiero que nada de lo que dejé a medias llegue a la pantalla de nadie, para no cambiarle el plan a alguien por accidente.
9. Como administradora, quiero publicar un reparto solo cuando suma cien, para que no exista un cargo a medio repartir.
10. Como administradora, quiero traspasar una función de una persona a otra sin que pierda su historia, para poder mover trabajo como se mueve de verdad.
11. Como administradora, quiero que al traspasar se reacomode solo el cien de quien entrega, para no rehacer a mano una aritmética que no decidí.
12. Como administradora, quiero escribir yo cuánto pesa esa función en el cargo de quien la recibe, viendo cuánto pesaba en el de quien la entrega, para decidir con contexto lo que el sistema no puede calcular.
13. Como administradora, quiero ver el historial de titulares de una función, para saber por cuántas manos pasó antes de dar por hecho que el problema es de quien la tiene hoy.
14. Como administradora, quiero un reporte mensual con el cumplimiento ponderado de cada persona, para entender cuánto de cada cargo se está ejecutando.
15. Como administradora, quiero ver qué funciones arrastran y desde cuándo, ordenadas por cuánto del cargo de alguien está sin cumplirse, para atender primero lo que más pesa y no lo que más se repite.
16. Como administradora, quiero ver el arrastre de una función a través de todos sus titulares, para distinguir una función imposible de una persona que no la está haciendo.
17. Como administradora, quiero ver las razones que escribió la gente, filtradas por persona y por función, para entender el cuello de botella real.
18. Como administradora, quiero descargar el mes, para llevarme los porcentajes a la hoja donde calculo los sueldos.
19. Como administradora, quiero cargar feriados y vacaciones colectivas como rangos, y declarar hasta qué fecha revisé el calendario, para que el sistema no invente fechas ni se quede callado.
20. Como administradora, quiero un aviso que no se pueda descartar cuando al calendario le queda poco, para no enterarme porque los planes se vaciaron.

**Empleado** *(sin cambios, salvo lo que se nombra)*

21. Como empleado, quiero que mi pantalla siga igual: mi plan, mis flujos, mis marcas y mis razones.
22. Como empleado, quiero seguir viendo la ponderación de mis funciones en el listado de mi mes, para entender el peso de mi rol.
23. Como empleado, quiero leer títulos limpios, sin la fecha tope metida entre paréntesis en mayúsculas.
24. Como empleado, quiero que un cambio que JFS está pensando no me aparezca a medias.

## End-to-End Invariants

Los doce de CEB-106 siguen vigentes salvo donde se diga. Cada invariante nuevo necesita su prueba de trazador sobre el cableado real, y este PRD no se cierra hasta que pasen.

**Se retiran tres**, porque desaparece aquello que protegían:

- **INV-9** (ningún texto que ve el empleado lo produce un modelo): no queda modelo.
- **INV-11** (una corrección manual nunca se pisa): no hay campos generados que corregir.
- **INV-12** (la aplicación nunca escribe fuera de la pestaña de razones): la aplicación no tiene credenciales sobre ningún documento. Se convierte en algo más fuerte y más fácil de sostener — *la aplicación no puede escribir en el documento de sueldos, punto* — y se verifica por ausencia.

**INV-2 se amplía.** Decía que un empleado nunca obtiene datos de otro. Ahora existe alguien que sí: un administrador ve a todos. La regla pasa a ser *un empleado nunca obtiene datos de otro empleado, y quien no es administrador no obtiene datos de nadie más que de sí mismo*. La base sigue decidiendo (ADR 0004): la llave de servicio no entra al servidor web.

**INV-13 · Un borrador nunca llega a la pantalla de un empleado.** Lo que ve es siempre el último reparto publicado.
Prueba: editar el reparto de alguien sin publicar; su plan, su listado del mes y su cierre son idénticos byte a byte a los de antes de la edición.

**INV-14 · Un reparto que no suma cien no se publica.** Ni por la interfaz ni por la base.
Prueba: intentar publicar un reparto de 99 y otro de 101 con sesión de administrador; los dos son rechazados y el reparto vigente no cambia.

**INV-15 · Un traspaso publica los dos lados o ninguno.** Nunca existe un instante en que la función esté en dos cargos ni en ninguno.
Prueba: provocar un fallo en el segundo lado del traspaso; el primero tampoco quedó aplicado.

**INV-16 · Traspasar o archivar nunca borra una marca.** Son observaciones y no se pueden reconstruir.
Prueba: marcar, traspasar, archivar la función; las marcas siguen ahí, atribuidas a quien las hizo.

**INV-17 · El arrastre de una persona no incluye lo de quien tuvo la función antes.**
Prueba: acumular arrastre con un titular, traspasar, y comprobar que el arrastre de la persona que recibe empieza en cero mientras el de la función conserva el total.

**Siguen tal cual**: INV-1 (ningún monto existe), INV-3 (el empleado no ve su tasa de cumplimiento; sí su ponderación), INV-4 pierde su objeto — no hay hoja que escribir —, INV-5 se vuelve trivial pero se conserva como prueba de que editar un nombre no parte el historial, INV-6 desaparece con la importación, INV-7, INV-8 y INV-10 se mantienen.

## Implementation Decisions

**El modelo**

- La función deja de identificarse por hash: tiene id propio. `texto`, `periodicidad`, `importancia`, `tipo` y `dia_tope` son campos que escribe el administrador, sin columnas `_generado` ni `_corregido`.
- La ponderación deja de ser columna de `funcion` y se muda al vínculo entre función y titular, junto con el rango de fechas en que esa persona la tuvo. Es el historial de titulares y el sitio natural del peso: la misma función puede ser el 10% del cargo de alguien y el 25% del de otra.
- El reparto vigente de una persona es el conjunto de sus vínculos activos. Publicar cierra los vínculos anteriores y abre los nuevos, en una transacción.
- `empleado` pierde `nombre_bloque`: era el nombre del bloque en el Excel y no casa nada con nada cuando no hay importación.
- El administrador es un rol en la misma autenticación, con políticas propias de seguridad por fila. Sin llave de servicio en el servidor web.

**Lo que se borra**

`scripts/importar.mts`, `scripts/tipificador.mts`, `scripts/retipificar.mts`, `scripts/razones.mts`, `scripts/proteger.mts`, `scripts/acceso.mts`, `apps/web/src/lib/hoja.ts`, `apps/web/src/lib/razones.ts`, `packages/dominio/src/cuadricula.ts`, `packages/dominio/src/documento.ts`, `packages/dominio/src/tipificacion.ts`, las variables `AGENTE_*`, `GOOGLE_CREDENCIALES*` y `DOCUMENTO_ID`, y la cuenta de servicio de Google.

**La migración**

Corre una vez, con el importador que ya existe, y se borra detrás. Lee las 86 funciones, les asigna id propio, **extrae el día tope de la prosa y lo borra del nombre en la misma pasada** — dejarlo sería un dato con dos dueños —, y usa el agente una última vez para el tipo de las que no lo tengan confirmado. Los pesos se migran tal cual: son el criterio de JFS y hoy no hay con qué contradecirlos.

**Renombrar, después de esto**

El riesgo se invierte y conviene saberlo. Antes, renombrar **partía** un historial que debía seguir. Ahora puede **juntar** dos que debían estar separados: si alguien edita "Declaraciones SENIAT KIA" y lo deja en "Declaraciones SENIAT Changan", el id no cambió y el arrastre de la primera se le pega a la segunda. El sistema ya no adivina; la persona decide con qué acción entra. La pantalla tiene que dejar clarísima la diferencia entre editar una función y crear otra.

## Testing Decisions

- El dominio puro pierde `cuadricula`, `documento` y `tipificacion` con sus tests. Gana el reparto (suma cien, reescalado al entregar) y el arrastre (conteo por períodos, corte en el traspaso, ponderación arrastrada).
- Las pruebas de trazador de los invariantes retirados se borran; las de INV-13 a INV-17 se escriben contra Supabase local, con sesión de administrador y de empleado reales.
- La migración se prueba una vez contra una copia del documento real, y su test se borra con ella.

## Out of Scope

- **Bajas de empleados.** Diferido a v2. Cuando se haga, dar de baja exigirá el cargo vacío: traspasar o archivar cada función una por una. Mientras tanto, a quien se va se le quita el acceso a mano.
- **Que el sistema conozca sueldos.** El trabajo mueve dinero en la realidad; el sistema registra pesos y ejecución, y JFS decide la plata en su hoja (ADR 0007).
- **Repesar las funciones.** Los pesos de hoy son el criterio de JFS y se migran intactos. Cuando haya meses de ejecución, un análisis podrá señalar dónde el peso no cuadra con la realidad —sobrecarga de personas, funciones más pesadas de lo que se intuía, funciones que arrastran en varias personas a la vez— y ahí se corrigen de a una.
- **Avisar al empleado de que su reparto cambió.** Si le quitan una función y su sueldo baja, su pantalla se ve idéntica: sigue sumando cien. Decírselo es una decisión de producto que no se ha tomado.
- **Que JFS lea las razones sin entrar al sistema.** Se pierde algo real: hoy las tiene en el archivo que ya está abierto. Si resulta que por eso no se entera a tiempo, la respuesta es un resumen que salga a buscarla, no resucitar la pestaña.
- **Descomponer funciones compuestas**, la matriz como pantalla visible, el orquestador agéntico, y todo lo demás que CEB-106 dejó fuera.

## Further Notes

- **CEB-120 deja de aplicar.** Sin hash del texto, renombrar es editar un campo. Se cierra como resuelto por diseño, no como hecho.
- **CEB-123 sigue en pie y se refuerza.** La transparencia se explica fuera del sistema. Ahora que JFS tiene pantalla, la tentación de meter el aviso junto al campo de la razón es mayor, no menor.
- **La historia 10 de CEB-106 quedó falsa** — decía que la pantalla debe avisarle al empleado que JFS lee sus razones. La contradice CEB-123. No se arrastra a este documento.
- **Los pesos con los que este sistema va a informar son los de un ajuste retroactivo.** Está anotado en las ambigüedades de `CONTEXT.md` y conviene releerlo antes de tomar decisiones duras con el primer reporte.
