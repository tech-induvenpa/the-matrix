# Matriz de Eisenhower JFS

Muestra a cada empleado de JFS las funciones que tiene asignadas, ordenadas por
lo que toca hacer ahora, y registra si se ejecutaron. La matriz de Eisenhower es
el marco de clasificacion detras del orden, nunca una pantalla.

## Language

### Lo que se asigna

**Empleado**:
Una persona de JFS con funciones asignadas y acceso propio a la aplicacion.
_Avoid_: usuario (es la cuenta, no la persona), colaborador.

**Administrador**:
Quien asigna: reparte las funciones, las pondera, las puntua y mantiene el
calendario. Hoy es una sola persona y lo ve todo. Es el unico que ve el
cumplimiento ponderado y las razones de todos.
_Avoid_: JFS (es la empresa, no un rol), responsable tecnico (existia para
revisar la traduccion del documento y desaparece con ella), supervisor.

**Funcion**:
Una responsabilidad recurrente que alguien tiene a su cargo. Existe por si misma
y no muere al cambiar de manos: es el trabajo, no la asignacion.
_Avoid_: indicador (significa metrica en cualquier otro contexto), tarea,
responsabilidad como entidad.

**Titular**:
El empleado que tiene una funcion a su cargo ahora. Una funcion tiene un titular
a la vez y guarda todos los que tuvo.
_Avoid_: dueno, responsable (el responsable tecnico era otra cosa), asignado.

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

**Responsabilidad**:
Encuadre, no entidad. Se usa al hablarle al empleado de por que algo pesa lo que
pesa; nunca como nombre de una funcion en el modelo.

**Tipo**:
De cual de las cuatro clases es una funcion. Lo propone el agente en la ingesta y
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

**Holgura**:
La porcion del cargo reservada a lo no planificado, presupuestada de antemano.

### Los tres ejes

**Ponderacion**:
El peso fijo de una funcion dentro del cargo de una persona. Suma cien por
persona y no cambia nunca por posicion en la matriz.
_Avoid_: peso (reservado), prioridad, porcentaje.

**Reparto**:
Las funciones de una persona con sus ponderaciones, tomadas como un todo que
suma cien. Nadie cambia la ponderacion de una funcion suelta: se redistribuye el
reparto de alguien. Es la unidad de edicion y la unidad de publicacion.
_Avoid_: cargo (es el puesto, no el documento), asignacion (es del sueldo).

**Publicar**:
Hacer vigente un reparto. Lo que ve el empleado es siempre el ultimo reparto
publicado; mientras JFS edita, nada cambia en la pantalla de nadie. Un reparto
que no suma cien no se puede publicar, y por eso nunca hay un estado a medias
vigente.
_Avoid_: guardar (se guarda el borrador, se publica el reparto), importar
(era el acto de publicar cuando la entrada era el documento).

**Importancia**:
El unico juicio que JFS escribe a mano. Cero a nueve.

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
Un dia en que esta empresa trabaja. Sale de una lista que JFS mantiene, nunca de
un calendario nacional.

**Dia no habil**:
Un feriado o un dia dentro de las vacaciones colectivas. No existen vacaciones
individuales: cuando la empresa descansa, descansa entera.

**Cobertura del calendario**:
Hasta que fecha alcanza la lista de dias no habiles. Mas alla de ella el sistema
no calcula fechas, en lugar de suponer que no hay dias libres.

**Cuadrante**:
Uno de tres: hacer ya, ponle fecha, mantener al dia. El cuarto no existe: toda
funcion es al menos minimamente importante.
_Avoid_: prioridad alta/baja, los nombres clasicos de Eisenhower.

### El registro

**Marca**:
El acto de declarar una ocurrencia ejecutada o no ejecutada. Marcar "no pude"
libera el lugar igual que marcar hecho.
_Avoid_: check, completar, cerrar.

**Estado de flujo**:
Al dia o atrasado. Un flujo no se marca: su estado lo cambia el empleado cuando
cambia de verdad, sin que nadie se lo pregunte.
_Avoid_: marca (las marcas son de ocurrencias).

**Razon de no ejecucion**:
El texto que el empleado escribe al marcar "no pude" en una ocurrencia o al
declarar atrasado un flujo. JFS lo lee, y el empleado sabe que lo lee.

**Cumplimiento ponderado**:
Ocurrencias cerradas sobre asignadas, pesadas por ponderacion. Es peso salarial
expresado en porcentaje, asi que lo ve JFS y no el empleado.

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
- Una **Ocurrencia** pertenece a exactamente un **Periodo** y recibe a lo sumo una **Marca**
- La **Ventana de la semana** contiene las **Ocurrencias** que vencen en los
  proximos cinco **Dias habiles**
- Un **Cuadrante** se deriva de **Urgencia** e **Importancia**; la
  **Ponderacion** ordena dentro de el

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
- La ponderacion se repartio **hacia atras**: se sabia lo que gana cada persona y
  se acomodaron porcentajes sobre sus funciones hasta cuadrar cien. O sea que hoy
  la flecha va sueldo -> ponderacion, y el peso de una funcion no es una medida
  sino el resultado de un ajuste. Sin resolver: el sistema existe para invertir
  esa flecha, y hasta que se invierta, los pesos con los que informa son los del
  ajuste original.
