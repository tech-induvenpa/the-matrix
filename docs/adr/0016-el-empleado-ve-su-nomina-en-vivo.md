# El empleado ve su nomina en vivo

> Reemplaza, del ADR 0010 y de INV-3, que el empleado no vea cuanto lleva
> cobrado ni su tasa de cumplimiento.

El ADR 0010 dejo que el empleado viera cuanto de su bono vale cada funcion,
pero no cuanto lleva cobrado: seria "un numero que perseguir", y el dato de
flujos seria el primero en secarse. JFS quiere que la **nomina** -- cuanto del
bono le corresponde a cada quien en el mes, con su fundamento -- sea
transparente y se comparta con finanzas para liquidar el pago.

Decidimos que **el empleado vea su nomina en vivo**, durante el mes, parte por
parte. Perseguir el numero es el incentivo que se busca: ver el impacto de un
"no pude" invita a pensarlo dos veces y a destrabar la razon antes de marcarlo.
En una ocurrencia o un imprevisto, callarse no ahorra nada -- vencer sin marca
cuenta igual en contra --, asi que el numero solo empuja a cumplir o a
explicar.

## Considered Options

- **Solo el administrador.** Sin transparencia hacia quien cobra.
- **El empleado, solo al cierre del mes.** Menos presion diaria, pero pierde
  justamente el efecto buscado: ver el impacto antes de marcar.
- **Tambien el supervisor.** Descartado: no ve montos (ADR 0015).
- **Que el supervisor o el administrador puedan declarar atrasado un flujo
  ajeno.** Descartado, ver abajo.

## Consequences

- **Riesgo aceptado: los flujos.** Un flujo se da por cumplido salvo lo que se
  declare, asi que con el numero a la vista callar un atraso sale gratis y
  declararlo cuesta. Se confia en la buena fe, como hasta ahora: mentir es mas
  caro que declarar, y a la larga se descubre. Si el dato de flujos se seca --
  flujos que nunca se declaran atrasados --, la primera sospecha es esta.
- **INV-3 se reescribe para el empleado**: ve su cumplimiento en dinero, suyo y
  de nadie mas.
- **Lo que se paga tiene que quedar fijo**: el mes se cierra solo, en corte
  duro, a las 23:59 de Caracas de su ultimo dia habil, y desde ahi nada de ese
  mes se marca. Se prefirio al cierre con margen de dos dias habiles: lo
  mensual se marca el mismo dia o se pierde, y es otro incentivo. Solo el
  administrador reabre, con razon, para todos, y el mes se vuelve a cerrar
  solo en veinticuatro horas si nadie lo cierra.
- **El supervisor ve de su gente el cumplimiento en peso (ADR 0015) y la
  persona lo ve en dinero**: ya no ve el supervisor nada que ella no vea.
