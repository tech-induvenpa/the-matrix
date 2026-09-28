# La descarga es el hecho suelto: una fila por cada vez que algo debia hacerse

La descarga del mes -- la salida hacia la hoja de sueldos (ADR 0007, 0010) --
tenia una fila por persona, mes y funcion, con columnas que resumian:
asignadas, cerradas, sin cumplir. Eran confusas ("cerradas" contaba los "no
pude" como cumplidos, "asignadas" no eran funciones asignadas), y cada resumen
elegia por quien lee.

Decidimos que **cada fila sea una vez que algo debia hacerse**: una ocurrencia
vencida de un entregable, un imprevisto de la holgura, o un episodio de atraso
de un flujo. Cada fila dice que paso esa vez, y cualquier resumen sale con una
tabla dinamica. Las cuentas van como formulas de pura aritmetica, sin funciones
como `SI` o `CONTAR.SI`, que cambian de nombre segun el idioma del Excel.

Tres decisiones van con esta, tomadas el 28/09/2026:

- **Solo "hecho" cumple.** Un "no pude" libera el lugar en el plan, pero cuenta
  en contra aqui y en el arrastre, como dice el glosario. Antes salia pagado.
- **Un flujo se da por cumplido salvo lo que se declare.** Cada dia habil
  atrasado descuenta su ponderacion repartida entre los dias habiles del mes.
  Antes perdia toda su ponderacion si terminaba el mes atrasado, aunque hubiera
  estado bien veintinueve dias. Se confia en la buena fe: callar un atraso es mas
  caro, si se descubre, que el atraso mismo.
- **El area sale de la descarga.** No se mide; es mas una descripcion del cargo
  que trabajo, y queda anotada como algo a repensar.

## Consecuencias

- **La hoja de sueldos tiene que leer otra forma.** Ya no hay una fila por
  funcion: los totales por persona salen de una tabla dinamica sobre `MONTO NO
  CUMPLIDO`. Es un cambio de formato para quien la usa.
- **El archivo crece**: una diaria son unas veintidos filas al mes por persona.
  Para Excel no es nada.
- **El arrastre sale del CSV.** Por ocurrencia no dice nada que el reporte en
  pantalla no diga mejor.
- **"No lo tome" sale con peso cero**, como valor y no como formula: es neutro,
  y no entra en las veces que la holgura debia cumplirse.
