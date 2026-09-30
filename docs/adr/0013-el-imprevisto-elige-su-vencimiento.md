# El imprevisto elige su vencimiento

El ADR 0009 hizo que un imprevisto venciera hoy o el dia habil siguiente: "lo
que se necesita para el viernes no es un imprevisto, se planifica". En la
practica cae trabajo que se hace una sola vez, no esta en el reparto de nadie
y no aprieta: no es una funcion, porque no se repite, pero tampoco es para
manana. Sin otro lugar donde anotarlo, o se inflaba a "para manana" o no se
anotaba y la holgura no lo veia.

Decidimos que **quien anota el imprevisto elige una urgencia de 0 a 9, y se
guarda el vencimiento que le corresponde**, no el numero. Cada urgencia vence
en el tope de su tramo: 9 hoy, 8 manana, y asi hasta 0, que vence a los 29 dias
habiles. Desde ahi la urgencia se calcula como la de cualquier ocurrencia y
sube sola con los dias, asi que el ADR 0003 sigue en pie: se declara para
cuando se necesita, nunca cuanto aprieta. Descartamos guardar el numero fijo:
dejaba al imprevisto sin vencimiento, y sin vencimiento nunca cuenta en contra
de la holgura ni aparece como abierto y vencido.

## Consecuencias

- **Lo que hace imprevisto a un imprevisto es ser de una vez y estar fuera del
  reparto**, no la prisa. Puede no ser ni urgente ni importante.
- **El vencimiento cuenta de lunes a viernes aunque pase la cobertura del
  calendario.** Es la unica fecha que el sistema calcula mas alla de ella: la
  urgencia 0 cruza la cobertura seis semanas antes de que termine, y desactivar
  opciones cada fin de ano no valia la pena. Cuando se cargan dias no habiles,
  el vencimiento de un imprevisto abierto que cae en uno se corre al habil
  siguiente sin avisar. Un feriado antes del vencimiento no lo mueve: ese
  imprevisto tiene un dia habil menos.
- **Cuenta en la holgura del mes en que vence**, no del mes en que se pidio: se
  juzga cuando ya se le puede exigir.
- **Una delegacion no cambia**: sigue venciendo con su ocurrencia (ADR 0012).
- **En un dia no habil, la urgencia se cuenta desde el habil siguiente**
  (CEB-193). Un sabado, "hoy" es el lunes y "manana" el martes: si no, 9 y 8
  vencian el mismo lunes y quien elegia 9 veia 8 hasta el lunes. Como la
  escala es una sola, vale tambien para las ocurrencias: un fin de semana, lo
  que vence el lunes se ve con 9. El aviso de "hoy / manana vence" sigue
  contando dias corridos.
