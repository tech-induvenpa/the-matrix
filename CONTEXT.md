# Matriz de Eisenhower JFS

Muestra a cada empleado de JFS las funciones que tiene asignadas, ordenadas por
lo que toca hacer ahora, y registra si se ejecutaron. La matriz de Eisenhower es
el marco de clasificacion detras del orden, nunca una pantalla.

## Language

### Lo que se asigna

**Empleado**:
Una persona de JFS con funciones asignadas y acceso propio a la aplicacion.
_Avoid_: usuario (es la cuenta, no la persona), colaborador.

**Empresa**:
Una de las empresas que forman JFS: hoy KIA, Changan, Toyota, Induvenpa y
Holding. Holding es la del grupo: la de quien no trabaja para una sola. JFS es
el grupo, no una empresa mas.
Sirve para saber de donde es cada quien y agrupar por ella. No limita nada: se
supervisa y se traspasa entre empresas, y el calendario es del grupo.
Es un dato de la persona hoy: si cambia de empresa, todo su pasado se agrupa
con la nueva.
_Avoid_: razon social, filial, cliente (es a quien se le hace el trabajo).

**Sede**:
Uno de los concesionarios de una empresa que tiene varios; hoy solo KIA y
Changan, con dos cada una. Una persona sin sede cubre todas las de su empresa,
asi que aparece al buscar cualquiera de ellas: no tener sede no es un dato que
falta. Como la empresa, agrupa y no limita nada.
_Avoid_: sucursal, concesionario (Holding tambien podria tener sedes y no vende
carros).

**Administrador**:
Quien asigna: reparte las funciones, las pondera, las puntua y mantiene el
calendario. Hoy es una sola persona y lo ve todo. Es el unico que ve el
cumplimiento ponderado y las razones de todos.
_Avoid_: JFS (es el grupo, no un rol), responsable tecnico (existia para
revisar la traduccion del documento y desaparece con ella), supervisor (es
otro rol: responde por su gente, no asigna).

**Supervisor**:
Un empleado que responde por otros: tiene su propio reparto y ademas gente a
cargo. De ella ve lo que necesita para actuar el mismo dia --sus funciones con
su estado y su arrastre, sus razones, sus imprevistos y delegaciones-- y le
pide imprevistos. Ve tambien sus ponderaciones, cotidianidad incluida, y cuanto
de su cargo esta sin cumplirse en peso (**ponderacion arrastrada**): sin eso no
sabe cuanto le pesa lo que le pide (decidido el 30/09/2026, ADR 0015; antes no
veia ningun peso). No ve bonos ni montos de nadie: el dinero es una
conversacion de sueldo y esa es del administrador. No reparte, no pondera, no
traspasa y no toca el bono de nadie.
Cada empleado tiene a lo sumo un supervisor, y quien supervisa no tiene
supervisor: hay un solo nivel. Lo decide el administrador. Ve a quien tiene a
cargo hoy, con todo su pasado; cuando se lo cambian, deja de verlo.
En pantalla se le dice **responsable**, y a su gente, **equipo** (decidido el
29/09/2026): son terminos intercambiables, y el modelo sigue diciendo
supervisor.
_Avoid_: jefe, lider, coordinador.

**Funcion**:
Una responsabilidad recurrente que alguien tiene a su cargo. Existe por si misma
y no muere al cambiar de manos: es el trabajo, no la asignacion.
_Avoid_: indicador (significa metrica en cualquier otro contexto), tarea,
responsabilidad como entidad.

**Titular**:
El empleado que tiene una funcion a su cargo ahora. Una funcion tiene un titular
a la vez y guarda todos los que tuvo.
_Avoid_: dueno, responsable (el responsable tecnico era otra cosa, y en pantalla
responsable es el **supervisor**), asignado.

**Traspaso**:
Cambiar de titular una funcion sin partirle el historial. Lo que se traspasa es
el trabajo; el arrastre de quien la tuvo antes se queda con quien la tuvo antes.
_Avoid_: reasignacion, mover.

**Ocurrencia**:
Una vez que una funcion vence. Una funcion diaria produce veintidos ocurrencias
al mes; una mensual, una.
_Avoid_: instancia, repeticion.

**Tarea**:
La ocurrencia vista desde la pantalla del empleado. Palabra de interfaz, no del
modelo.

**Perfil de la tarea**:
Lo que se ve al abrir una ocurrencia o un imprevisto: su historia en una sola
linea de tiempo. Hoy la forman quien la pidio o la delego (un imprevisto), la
devolucion que la origino (una delegacion), sus **comentarios**, el
**vencimiento** solo si paso sin marca, y su **marca** con su razon. Se lee
de lo mas reciente a lo mas viejo: la marca, si la hay, arriba. Una ocurrencia no tiene evento de nacimiento: es
calculada.
Se abre igual despues de marcada, pero entonces solo se lee.
_Avoid_: detalle, ficha, hilo (el hilo es solo la parte de los comentarios).

**Comentario**:
Lo que alguien escribe en una ocurrencia o un imprevisto mientras siguen sin
marcar, con quien lo escribio y cuando. Lo escriben y lo leen el titular, su
supervisor y el administrador; en un imprevisto, ademas quien lo pidio. Quien
escribe sabe quien lo lee. No se edita ni se borra: un error se corrige con
otro comentario, asi lo que se dijo antes de la marca nunca cambia despues.
Un comentario de otro que no has visto esta **sin leer** hasta que abres el
perfil de su tarea; una tarea marcada ya no tiene nada sin leer. Una
delegacion y la ocurrencia que cumple tienen comentarios separados: quien la
recibe no ve las tareas de su supervisor. En un **traspaso**, los comentarios
de la ocurrencia abierta se van con ella: el contexto es parte del trabajo, y
los lee el circulo de hoy, no el de cuando se escribieron. Deshacer la marca reabre los comentarios; una
delegacion devuelta es un imprevisto nuevo y empieza sin ninguno. Un flujo no
tiene comentarios: no se marca, asi que no tiene un antes y un despues.
_Avoid_: nota, observacion, razon (esa acompana a la marca y es obligatoria).

**Responsabilidad**:
Encuadre, no entidad. Se usa al hablarle al empleado de por que algo pesa lo que
pesa; nunca como nombre de una funcion en el modelo.

**Tipo**:
De cual de las clases es una funcion: entregable, flujo o area (la cotidianidad,
antes holgura, no es una funcion). Lo propone el agente en la ingesta y
lo confirma el responsable tecnico; decide si la funcion entra al plan semanal.

**Entregable**:
Funcion con una cosa concreta que entregar y una fecha. Se puede marcar. Es la
unica clase que entra al plan de la semana.

**Flujo**:
Funcion que mueve el volumen y no el calendario. No tiene "terminado": se atiende
mientras haya. No produce ocurrencias: tiene un estado.
_Avoid_: tarea continua, operativa.

**Area**:
Funcion que nombra un dominio del rol y no un acto. Existe para repartir sueldo.
_Avoid_: categoria, macro-tarea.

**Cotidianidad**:
Lo que queda del cargo despues de sus funciones: cien menos la suma de sus
ponderaciones. Todo empleado nace con cotidianidad cien, y cada cambio de su
**reparto** la mueve junto con las demas partes. No es una
funcion: no se crea y no se traspasa (decidido el 30/09/2026; antes era una
funcion mas del reparto). Si se puede ajustar: subirla o bajarla reparte la
diferencia entre las funciones, en proporcion, con la misma regla del
**reparto**. Nunca baja del diez por
ciento: un reparto cuyas funciones suman mas de noventa no se publica. Es por
donde pesan los imprevistos: ninguno trae peso propio, se miden contra la
cotidianidad de su empleado, y como siempre hay cotidianidad, todo imprevisto
pesa. Se cumple con imprevistos hechos sobre los que se
esperaba hacer: "no pude", devueltos y abiertos vencidos cuentan en contra, "no lo tome"
es neutro (rechazar a tiempo no es fallar), y un mes sin imprevistos
esperables no cuenta ni a favor ni en contra.
_Avoid_: holgura (su nombre hasta el 30/09/2026, cuando era una funcion), colchon,
disponibilidad.

**Imprevisto**:
Trabajo que llega sin estar en el reparto de nadie y se hace una sola vez. No es
una funcion: no se repite, no tiene periodicidad ni ponderacion, y no se
traspasa. Lo que lo hace imprevisto es que se hace una vez y no esta en ningun
reparto, no que apriete: puede no ser ni urgente ni importante (decidido el
29/09/2026; antes vencia a mas tardar el dia habil siguiente). Quien lo anota
dice cuan importante es y para cuando lo necesita eligiendo una urgencia, y
esta se convierte en su vencimiento (una **delegacion** vence con su ocurrencia). Desde ahi su urgencia
se calcula igual que la de cualquier ocurrencia y sube sola con los dias: lo
que se escribe es la fecha, nunca el numero. No arrastra, porque no tiene serie: si vence sin marca sigue
abierto en la pantalla de su empleado hasta que alguien lo marque, y cuenta su
retraso en dias habiles. Que se acumulen abiertos es el dato: dice que nadie
les esta haciendo seguimiento. Se marca de tres formas: hecho, "no pude" o
"no lo tome"; las dos ultimas con razon. Rechazarlo es una respuesta de quien
lo recibe, no una aprobacion: el imprevisto rechazado cuenta como llegado, y si
quien lo pidio insiste, es un imprevisto nuevo. No se edita: si esta mal se
borra y se registra otro, asi la fecha en que se pidio nunca se mueve. Un
imprevisto borrado no cuenta en ninguna cifra, pero no desaparece: queda quien
lo borro y cuando. Un imprevisto que vuelve con regularidad es una
funcion que nadie ha dado de alta.
_Avoid_: urgente (la urgencia se calcula, no se declara), encargo, comodin,
funcion de cotidianidad (la cotidianidad es la porcion del cargo; el imprevisto no es
una funcion).

**Delegacion**:
Un imprevisto que un supervisor le pide a alguien a su cargo para cumplir una
ocurrencia de su propio reparto, o un imprevisto que le cayo a el (decidido el
08/10/2026; antes solo ocurrencias). La ocurrencia sigue siendo del supervisor: no
es un traspaso, no mueve ponderacion y el supervisor responde por ella. Vence
cuando vence la ocurrencia, no al dia habil siguiente, y hereda la
**importancia** que la funcion tenia el dia en que se delego, porque lo
delegado ya estaba previsto; lo imprevisto es solo a quien le llega. Quien la recibe la
marca como cualquier imprevisto, y esa marca no cierra la ocurrencia: el
supervisor la revisa y marca su ocurrencia el, o la devuelve --a la misma
persona o a otra--, y eso es una delegacion nueva. Devolver un "hecho" lo
convierte en **devuelto**, con razon obligatoria, y cuenta en contra como un
"no pude": si no, marcar hecho algo mal hecho no costaria nada. Si no se cumple, pierden los
dos: el supervisor su ocurrencia y quien la recibio su cotidianidad.
Solo se delegan ocurrencias que todavia no vencieron, y cada una tiene a lo sumo
una delegacion abierta; un flujo no se delega. Una delegacion que se
repite es un traspaso que nadie ha hecho. Cuanto se repite se mide como la
proporcion de las ocurrencias de esa funcion que se delegaron en los ultimos
noventa dias, nunca en veces: contar veces pondria siempre las diarias arriba,
igual que en el arrastre. Una sola delegacion no es repetirse.
Delegar un imprevisto sigue la misma regla: el original **sigue siendo del
supervisor**, que lo revisa y lo marca o lo devuelve, y a quien lo recibe le nace
uno nuevo, vinculado, que vence cuando vence el original y hereda su
importancia. Solo se delega mientras no haya vencido, cada imprevisto tiene a lo
sumo una delegacion abierta, y no hay cadena: quien recibe no tiene gente a
cargo. La delegacion cuenta como pedida por el supervisor; quien la recibe ve en
su historia el pedido original, que se cuenta una sola vez, en el imprevisto del
supervisor.
_Avoid_: traspaso (ese mueve la funcion), reasignacion, encargo.

### Los tres ejes

**Ponderacion**:
El peso fijo de una funcion dentro del cargo de una persona. Las de una persona
suman a lo sumo noventa, y la **cotidianidad** completa el cien. No cambia nunca por
posicion en la matriz.
_Avoid_: peso (reservado), prioridad, porcentaje.

**Seguimiento sin peso**:
Una funcion con ponderacion cero. Existe para verse, no para pesar: aparece en
el plan de su titular, se marca y acumula arrastre, y no descuadra el reparto
de nadie. Es como entra al sistema el trabajo que hay que seguir aunque no
mueva sueldo -- una convencion que hoy vive en la memoria de la gente.
_Avoid_: opcional (no lo es), secundaria, informativa.

**Reparto**:
Las funciones de una persona con sus ponderaciones, y su cotidianidad, tomadas como
un todo que suma cien. Nadie cambia la ponderacion de una funcion suelta: se
redistribuye el reparto de alguien. Una sola regla para todo lo que mueve un
peso -- dar de alta, cambiar, archivar, eliminar o traspasar una funcion --: lo
que entra o sale se compensa en proporcion entre todo el resto,
cotidianidad incluida; si la cuenta deja la cotidianidad bajo el piso, queda en el piso y lo que
falta sale de las funciones. El sistema lo propone con la cuenta a la vista, y
el administrador lo ajusta si quiere y lo aprueba. Es la unidad de edicion y la
unidad de publicacion.
_Avoid_: cargo (es el puesto, no el documento), asignacion (es del sueldo).

**Publicar**:
Hacer vigente un reparto. Lo que ve el empleado es siempre el ultimo reparto
publicado; mientras JFS edita, nada cambia en la pantalla de nadie. Un reparto
que no suma cien, o cuya cotidianidad queda bajo el piso, no se puede publicar, y por eso nunca hay un estado a medias
vigente.
_Avoid_: guardar (se guarda el borrador, se publica el reparto), importar
(era el acto de publicar cuando la entrada era el documento).

**Bono**:
La parte variable de lo que gana una persona, la que el cumplimiento mueve.
Siempre en dolares, para todos. La
ponderacion reparte el bono, no el sueldo: el sueldo base no depende de lo que
se cumpla. Por eso el impacto de una funcion en dinero es su ponderacion por
el bono, nunca por el sueldo entero. Es un monto por mes: un cambio rige siempre
desde el mes siguiente a cuando se hace y se mantiene hasta el siguiente
cambio. Nunca parte un mes ni reescribe los anteriores. El primero es la
excepcion: rige desde el mes en que se fija, porque no hay nada que partir. Es el unico monto que el sistema conoce; el sueldo base no existe
en el. Lo ve la persona a quien pertenece y el administrador, nadie mas; solo
el administrador lo escribe.
_Avoid_: sueldo (incluye la base, que no se mueve), asignacion, incentivo.

**Importancia**:
El unico juicio que se escribe a mano, cero a nueve, y lo escribe quien da de
alta la tarea: JFS en una funcion, quien lo anota en un **imprevisto**
(decidido el 30/09/2026). En un imprevisto no se edita, como el resto de el.
Nunca toca dinero ni ponderacion: solo decide el cuadrante y el orden.

**Periodicidad**:
Cada cuanto se repite una funcion: diaria, semanal, quincenal, mensual o
trimestral. La escribe JFS y no cambia sola.
_Avoid_: ciclo, cadencia, frecuencia.

**Urgencia**:
Cuanto aprieta hoy una ocurrencia, de cero a nueve segun los dias habiles que
faltan para que venza. Nadie la escribe: se calcula, y por eso JFS no puede
inflarla.
_Avoid_: prioridad, criticidad.

**Peso**:
Donde convergen los tres ejes. Urgencia e importancia deciden en que cuadrante
cae la funcion; dentro del cuadrante, ordena la ponderacion.

### El plan

**Periodo**:
El tramo del calendario al que pertenece una ocurrencia: un dia habil, una semana,
una quincena, un mes o un trimestre, segun la periodicidad.

**Fecha de alta**:
El dia en que una funcion aparece por primera vez en el sistema. La funcion cuenta
desde el siguiente periodo completo.

**Vencimiento**:
El ultimo dia en que una ocurrencia puede cerrarse a tiempo. Por defecto es el
ultimo dia habil de su periodo; antes de eso se puede cerrar cualquier dia.
_Avoid_: fecha de ejecucion (nada se ejecuta un dia fijo).

**Dia tope**:
El dia del mes que adelanta el vencimiento de una funcion mensual. Si ese dia no
es habil, vence el habil anterior.
_Avoid_: fecha tope (el documento la usa en este sentido, pero una fecha es un dia
concreto y esto se repite cada mes).

**Ventana de la semana**:
Los proximos cinco dias habiles. Delimita la meta, o sea lo que cuenta como
cumplido esta semana, y no lo que se muestra: la lista siempre trae lo mas proximo,
aunque venza despues.
_Avoid_: sprint, meta semanal como numero fijo.

**Dia habil**:
Un dia en que JFS trabaja; es el mismo para todas sus empresas. Sale de una lista que JFS mantiene, nunca de
un calendario nacional.

**Dia no habil**:
Un feriado o un dia dentro de las vacaciones colectivas. No existen vacaciones
individuales: cuando el grupo descansa, descansa entero.

**Cobertura del calendario**:
Hasta que fecha alcanza la lista de dias no habiles. Mas alla de ella el sistema
no calcula fechas, en lugar de suponer que no hay dias libres. La excepcion es
el vencimiento de un **imprevisto** (decidido el 29/09/2026): mas alla de la
cobertura cuenta de lunes a viernes, y cuando se cargan dias no habiles nuevos,
el que cae en uno se corre al habil siguiente sin avisar.

**Cuadrante**:
Uno de tres: hacer ya, ponle fecha, mantener al dia. El cuarto no existe: toda
funcion es al menos minimamente importante. Un **imprevisto** tambien cae en
uno, con las mismas reglas, pero se muestra en su propio bloque: no entra a la
**Ventana de la semana**.
_Avoid_: prioridad alta/baja, los nombres clasicos de Eisenhower.

### El registro

**Marca**:
El acto de declarar una ocurrencia o un imprevisto ejecutado o no ejecutado.
Marcar "no pude" libera el lugar igual que marcar hecho. Un imprevisto admite
ademas "no lo tome"; una ocurrencia no, porque lo previsto ya se acepto al
publicar el reparto.
_Avoid_: check, completar, cerrar.

**Estado de flujo**:
Al dia o atrasado. Un flujo no se marca: su estado lo cambia el empleado cuando
cambia de verdad, sin que nadie se lo pregunte. Un flujo se da por cumplido
salvo lo que se declare: cada dia habil que pasa atrasado descuenta su
ponderacion repartida entre los dias habiles del mes. Se confia en la buena fe
de quien lo declara; callar un atraso es mas caro, si se descubre, que el
atraso mismo.
_Avoid_: marca (las marcas son de ocurrencias).

**Razon de no ejecucion**:
El texto que el empleado escribe al marcar "no pude" en una ocurrencia o al
declarar atrasado un flujo. JFS lo lee, y su supervisor si lo tiene, y el
empleado sabe quien lo lee.

**Cumplimiento ponderado**:
Ocurrencias cumplidas (marcadas "hecho") sobre asignadas, pesadas por
ponderacion. Un "no pude" libera el lugar en el plan, pero no cumple. Es peso salarial
expresado en porcentaje. El empleado lo ve de si mismo, en dolares, en su
**nomina** (decidido el 30/09/2026, ADR 0016; antes no lo veia).

**Nomina**:
Cuanto del bono le corresponde a una persona en un mes, con su fundamento: el
bono que regia ese mes por su cumplimiento ponderado, parte por parte --cada
funcion por lo que se cumplio de ella, y la cotidianidad por sus imprevistos
hechos sobre los esperados--. No incluye el sueldo base, que el sistema no
conoce: en este glosario, nomina es solo la parte variable. Se lee como un
estado de cuenta: el bono del mes, un descuento por cada parte del cargo que
no se cumplio entera --con cuanto pesa y cuanto no se cumplio--, y el total a
pagar. Cada descuento va en centavos y el total es el bono menos los
descuentos, asi que siempre cuadra. Mientras el mes
esta abierto es provisional y se mueve con cada marca; al **cierre del mes**
queda fija y es lo que se comparte con finanzas. La ve la persona, en vivo, y el
administrador; el supervisor no, porque no ve montos. Sin bono ese mes no hay
nomina. Quien cambia de empresa en el mes aparece entero en la de su empresa al
cierre: la nomina, como el bono, nunca parte un mes.
_Avoid_: liquidacion, pago, sueldo (los tres sugieren el monto completo).

**Cierre del mes**:
El momento en que un mes deja de moverse: a las 23:59, hora de Caracas, de su
ultimo dia habil. Es automatico y es un corte duro: lo que no se marco antes
cuenta como no cumplido, aunque se haya hecho, y desde ahi nada de ese mes se
marca, se deshace ni se devuelve. Casi todo lo mensual vence ese mismo dia, asi
que se marca ese dia o se pierde: es a proposito.
Solo el administrador puede reabrir un mes cerrado, y siempre con una razon.
Se reabre para todos, nunca para una persona sola: reabierto, el mes vuelve al
uso normal, y todos marcan, deshacen y devuelven como antes. Se vuelve a cerrar cuando el administrador lo decide o, si se le
olvida, solo, veinticuatro horas despues de reabrirlo. Cada reapertura queda
registrada --quien, cuando, por que y que cambio-- y se ve en la nomina.
_Avoid_: cierre (a secas, se confunde con la funcion "Cierre de caja"), corte.

**Foto del cierre**:
La nomina de cada persona tal como quedo al **cierre del mes**: sus partes, sus
pesos, sus descuentos, su total y su empresa. Un mes cerrado se lee de su foto
y nunca se recalcula: cambiar despues un peso, un bono o una empresa no toca lo
que ya se pago. La nomina de un mes usa los pesos del dia del cierre, no un
promedio del mes, igual que el bono nunca parte un mes. Reabrir un mes descarta
su foto; al volver a cerrarse se toma otra. La descarga de un mes cerrado sale
de la misma foto, asi que nunca la contradice.
_Avoid_: snapshot, respaldo.

**Historial del reparto**:
Cada cambio publicado de las ponderaciones de una persona --dar de alta,
cambiar, archivar, eliminar o traspasar una funcion, o ajustar su
cotidianidad-- queda guardado con quien lo hizo, cuando, que movimiento fue y
los pesos antes y despues, parte por parte. La foto dice que se pago; el
historial dice por que cambio. Todo lo que mueve un peso o dinero deja rastro:
el bono ya lo dejaba (cada cambio rige desde un mes y no reescribe los
anteriores).
_Avoid_: log, auditoria.

**Arrastre**:
Periodos seguidos en que una funcion no se cumplio, por "no pude" o por vencer
sin marcar. Se cuenta en periodos, que es donde vive la ocurrencia, y se muestra
en tiempo ("ocho periodos, desde el 14 de julio"): el numero compara, la fecha
dice si ya es grave. No se compara entre cadencias distintas, porque una diaria
acumula veintidos veces mas rapido que una mensual.
_Avoid_: racha (es lo contrario: dias seguidos cerrando todo, y es un logro del
empleado), retraso (es de una ocurrencia sola), deuda.

**Ponderacion arrastrada**:
Cuanto del cargo de una persona esta sin cumplirse ahora mismo: la suma de las
ponderaciones de sus funciones con arrastre. Es lo unico comparable entre
personas y entre cadencias, y por eso es el orden del reporte. Ordenar por
numero de periodos pondria siempre las diarias arriba.

**Intromision**:
El vinculo que el empleado declara entre un incumplimiento de lo previsto --un
"no pude" en una ocurrencia o un atraso declarado en un flujo-- y el imprevisto
que lo causo. Es opcional, admite a lo sumo un imprevisto (antes admitia
varios; cambio el 29/09/2026) y no reemplaza a la razon, que sigue siendo
obligatoria. Solo vale con imprevistos
pedidos antes del vencimiento de esa ocurrencia (en un flujo, desde que estuvo
al dia por ultima vez): un imprevisto viejo no puede excusar cualquier cosa.
_Avoid_: excusa, justificacion.

**Ponderacion desplazada**:
Cuanto del cargo de una persona dejo de cumplirse por intromision: la suma de
las ponderaciones de lo previsto que no se cumplio con imprevistos vinculados.
Es la medida de cuanto empuja lo no planificado a lo planificado, comparable
entre personas como la ponderacion arrastrada.

**Patron**:
Un arrastre de dos periodos o mas; en un flujo, un atraso declarado dos veces en
el mismo mes. Es el mismo hecho que el arrastre, visto desde el cierre de mes del
empleado y con umbral. Se agrupa por funcion y nunca por el texto de la razon,
que se muestra tal cual.
_Avoid_: problema, falla (senalan a la persona).

## Relationships

- Una **Funcion** pertenece a exactamente un empleado y tiene exactamente un **Tipo**
- Solo las funciones de tipo **Entregable** producen **Ocurrencias**
- Una **Funcion** produce muchas **Ocurrencias**, una por cada periodo de su **Periodicidad**
- Una **Ocurrencia** pertenece a exactamente un **Periodo** y recibe a lo sumo una **Marca**; un **Imprevisto** tambien
- La **Ventana de la semana** contiene las **Ocurrencias** que vencen en los
  proximos cinco **Dias habiles**
- Un **Cuadrante** se deriva de **Urgencia** e **Importancia**; la
  **Ponderacion** ordena dentro de el
- Un **Imprevisto** pertenece a exactamente un empleado y no a una **Funcion**;
  no entra a la **Ventana de la semana**, y al **Cumplimiento ponderado** solo
  entra a traves de la **Cotidianidad** de su empleado. Lo
  previsto y lo imprevisto se miden cada uno con sus cifras: el imprevisto
  afecta a lo previsto por intromision (le quita tiempo), nunca por conteo
- Un **Empleado** pertenece a exactamente una **Empresa**: la que le paga, no
  para la que trabaja (eso lo dicen sus **Funciones**)
- Un **Empleado** tiene a lo sumo una **Sede**, y es de su misma **Empresa**;
  sin sede, cuenta en todas las de su empresa
- Un **Empleado** tiene a lo sumo un **Supervisor**; un **Supervisor** no tiene
  supervisor
- Una **Ocurrencia** o un **Imprevisto** tiene muchos **Comentarios**; un
  **Flujo**, ninguno. El **Administrador** no es titular de nada: comenta en
  tareas ajenas
- Una **Delegacion** une un **Imprevisto** de quien la recibe con una
  **Ocurrencia** de su **Supervisor**; la **Ocurrencia** sigue siendo del
  supervisor y solo su **Marca** la cierra

## Example dialogue

> **Dev:** "Douglenis tiene diecisiete funciones. Cuando marca el cierre de Auto
> Bengala, esa funcion desaparece del plan?"
>
> **JFS:** "No, desaparece la **ocurrencia** de este mes. La funcion vuelve el
> mes que viene, porque su ciclo es mensual."
>
> **Dev:** "Y si marca 'no pude'?"
>
> **JFS:** "Igual libera el lugar. Lo que la contiene es la razon escrita, no que
> se quede bloqueando la semana."

## Flagged ambiguities

- *Urgencia* designaba dos cosas en un mismo numero: cada cuanto vuelve una funcion
  y cuanto falta para que venza. Resuelto: la primera es **periodicidad** y se
  escribe; la segunda es **urgencia** y se calcula.

- Cuatro palabras competian por el mismo concepto: `INDICADORES` (Excel),
  *funcion* (PRD), *tarea* (diseno), *responsabilidad* (conversacion).
  Resuelto: **funcion** es la entidad, **tarea** es como se le dice en pantalla a
  una ocurrencia, **responsabilidad** es encuadre.
- *Peso* y *ponderacion* se usaban indistintamente. Resuelto: la **ponderacion**
  es la columna del documento; el **peso** es la convergencia de los tres ejes.
- El documento reparte sueldo, no trabajo: por eso una fila puede contener
  cuatro obligaciones distintas. La **fila es la unidad de sueldo**, no la
  unidad de trabajo. Resuelto: el dominio puede darle items marcables a una
  funcion sin repartir su ponderacion.
- La columna `CLASIFICACION` del Excel (`IMPORTANTE` / `URGENTE`) es el modelo
  binario anterior y contradice a los dos ejes numericos. Resuelto: la importacion
  la ignora; que JFS la borre o no, no cambia nada.
- El documento tiene una hoja por area y una importacion lee una sola hoja.
  Resuelto: **una hoja solo da de baja lo de sus empleados**. Comparar contra
  todas las funciones activas archivaba el trabajo de las demas areas.
- El dia tope no esta en el documento: va escrito en prosa dentro del nombre y lo
  deduce el agente. Resuelto: **la reconciliacion solo compara lo que JFS escribe
  en la hoja**; lo que el documento no trae no puede marcar una fila como
  cambiada.
- Si mover trabajo mueve sueldo es una decision aplazada: se toma tras **tres
  meses de sistema corriendo** (decidido el 22/09/2026), cuando haya con que
  responderla. Hasta entonces lo que importa es el seguimiento, no el peso, y
  el sistema tiene que poder mostrar que paso con una funcion aunque no mueva
  el sueldo de nadie. Con el bono en el sistema sigue aplazada: un traspaso no
  toca el bono de nadie, y si el dinero se mueve, el administrador edita los
  bonos a mano.
- JFS quiere que el empleado vea como su trabajo impacta en su sueldo (dicho
  el 24/09/2026). Resuelto el 25/09/2026: el sistema conoce el **bono**, no el
  sueldo, y el empleado ve en su mes cuanto de su bono vale cada funcion. No ve
  cuanto lleva cobrado ni ninguna tasa, ni la **ponderacion desplazada**, que
  sigue siendo solo del administrador.
- El **area** no se mide: no se marca, no se cumple y no sale en la descarga.
  Es mas una descripcion del cargo que trabajo, y aun asi reparte ponderacion,
  o sea bono que nadie puede perder (dicho el 28/09/2026). Sin resolver: hay que
  repensar si un area es una funcion o solo un encabezado del cargo. Mientras
  tanto, desde el 29/09/2026 la pantalla ya no crea areas nuevas.
- La ponderacion se repartio **hacia atras**: se sabia lo que gana cada persona y
  se acomodaron porcentajes sobre sus funciones hasta cuadrar cien. O sea que hoy
  la flecha va sueldo -> ponderacion, y el peso de una funcion no es una medida
  sino el resultado de un ajuste. Sin resolver: el sistema existe para invertir
  esa flecha, y hasta que se invierta, los pesos con los que informa son los del
  ajuste original.
