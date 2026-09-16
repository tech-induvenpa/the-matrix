# Periodicidad y urgencia son dos datos distintos

La tercera revision de CEB-105 fundio urgencia y periodicidad en un solo numero del
0 al 9: al escribirlo significaba cada cuanto vuelve la funcion, y al mostrarlo,
cuanto falta para que venza. Compartian la escala por decision, no porque fueran
lo mismo. El resultado era una convencion que habia que memorizar (9 diaria, 6
semanal, 4 quincenal, 1 mensual), valores intermedios que producian ciclos que
nadie pidio, y una columna donde JFS escribia un 1 que el empleado veia como 9.

Decidimos separarlos. JFS escribe la **periodicidad** en palabras -- diaria,
semanal, quincenal, mensual, trimestral -- en la columna `Urgente`, que estaba
vacia. La **urgencia** no la escribe nadie: se calcula cada dia a partir de la
periodicidad, el calendario y la fecha de hoy, y es la que decide cuadrante y
emoji.

Sigue siendo un dato escrito y determinista, no inferido. JFS sigue sin poder
inflar la urgencia, ahora del todo, porque no la escribe: su unica palanca de
criterio sigue siendo la importancia.

## Consecuencias

- Revierte dos puntos de CEB-105: "no hay columna de periodicidad" y "ciclos mas
  largos que un mes quedan fuera". Trimestral entra: hay una funcion trimestral en
  el documento, y en palabras cuesta una opcion mas.
- La columna usa la lista desplegable nativa de la hoja: no admite nada fuera de
  las cinco periodicidades.
- La tabla que convierte dias restantes en urgencia 0-9 queda como configuracion
  de pantalla. Es lo unico de ese esquema que tiene sentido recalibrar.
- Cada periodicidad corresponde a periodos del calendario: dia habil, semana,
  quincena (1 al 15, 16 a fin de mes), mes, trimestre. Una ocurrencia pertenece a
  un periodo y vence su ultimo dia habil, o antes si la funcion tiene dia tope. No
  hay vencimientos que renovar: la siguiente ocurrencia es la del periodo
  siguiente. Cierra la pregunta abierta #5 de CEB-105.
- Cada funcion tiene una fecha de alta, que registra la importacion el primer dia
  que ve la fila, y empieza a contar desde el siguiente periodo completo. Asi nunca
  nace con un vencimiento imposible; a lo sumo pierde un periodo sin seguimiento.
  Un cambio de periodicidad aplica igual: desde el siguiente periodo completo.
