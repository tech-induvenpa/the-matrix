# Un agente tipifica las funciones y extrae su dia tope en la ingesta

JFS escribe prosa, y el 46% del peso del documento no es agendable como tarea
(29% flujo, 14% area, 2% holgura). El tipo decide a donde va cada funcion: al
plan de la semana, a la columna de flujos, o solo al reparto mensual. Y las
funciones con fecha fija la tienen escrita dentro del nombre: "ANTES DEL 3 DE CADA
MES", "FECHA TOPE DE ENTREGA 02 DE CADA MES".

Un agente corre **dentro de la ACL, una vez por fila nueva o editada**, y propone
dos cosas: el `tipo` y el `dia_tope`. Nada mas. Importancia y periodicidad las escribe
JFS a mano: un dato que decide en que cuadrante cae el trabajo de alguien no debe
salir de una inferencia habiendo alguien dispuesto a escribirlo. La ponderacion no
se toca.

El dia tope no contradice ese criterio: el agente no decide nada que JFS no haya
escrito, lee un dato que ella ya dejo en la prosa, y se verifica contra el texto
de un vistazo. Cuando el texto no lo dice, queda vacio y la funcion usa ciclo
rodante hasta que JFS lo aclare.

Descartamos tipificar a mano. La frontera entre flujo y area es discutible, y sin
un criterio escrito en un solo lugar cada fila dudosa se vuelve una conversacion.
El criterio del agente es ese lugar. Descartamos tambien pedirle a JFS columnas
nuevas: agrega trabajo a quien ya acepto llenar dos, y la mete en ese mismo debate.

No viola la premisa de que ningun texto de la interfaz dependa de un modelo de
lenguaje: tipo y dia tope enrutan y fechan, no se muestran como prosa.

## Consecuencias

- Cada campo derivado vive en dos columnas: `_generado`, lo que propuso el agente,
  y `_corregido`, vacia salvo que alguien corrija. Vale la corregida si existe y,
  si no, la generada. El agente solo escribe la generada, asi que nunca pisa una
  correccion.
- Las filas corregidas guardan lo original y lo modificado. Muestran donde falla
  el criterio y sirven de ejemplos para el propio agente. Sin arnes de evaluacion
  hasta que haya correcciones que medir.
- Si el agente falla, la fila queda sin tipo, no entra al plan y aparece listada
  en la importacion. El camino manual es el respaldo, no un modo degradado.
- Si el dia tope choca con la periodicidad que escribio JFS, la importacion lo avisa y
  no elige.
- Se pierde el preliminar. Dos funciones de 25% traen dos fechas en una fila
  ("PRELIMINAR CADA 15 DIAS" y tope el 3); solo se sigue la final. Recuperarlo es
  descomponer sin repesar.
- No mejora la cobertura: el 46% no agendable se enruta, no se vuelve marcable.
