# El sistema conoce el bono, no el sueldo

Reemplaza en parte al ADR 0007. Sigue en pie lo que ese ADR protegia -- el
sueldo base no existe en el sistema --, pero deja de ser cierto que no existe
ningun monto.

JFS quiere que el empleado vea en dolares cuanto pesa su trabajo en lo que
gana (CEB-147, 25/09/2026). Lo que el cumplimiento mueve no es el sueldo: es el
**bono**, la parte variable; el sueldo base no depende de lo que se cumpla. La
ponderacion reparte el bono.

Decidimos que **el sistema guarde el bono de cada persona, en dolares, con su
historial**, y nada mas. Un cambio de bono rige siempre desde el mes siguiente
y nunca reescribe los anteriores. Lo ve su dueño y el administrador, que es el
unico que lo escribe; nadie mas, supervisores incluidos.

Consideramos otras dos salidas. **Guardar el sueldo** exponia un dato que
ninguna cuenta necesita. **Que cada empleado escribiera su bono en su propio
navegador** mantenia intacto el ADR 0007, pero el numero no seria oficial ni
serviria a la descarga, y la descarga es lo que llega a la nomina.

## Consecuencias

- **INV-1 se reescribe**: el sueldo base no existe en ninguna tabla ni
  respuesta, y el bono de una persona solo llega a su sesion y a la del
  administrador. La proteccion del bono ya no es estructural: depende de la
  seguridad por fila y de que ninguna ruta lo filtre. Es la puerta que el ADR
  0007 advertia, abierta a proposito y solo para el bono.
- **INV-3 se mantiene.** El empleado ve cuanto de su bono vale cada funcion
  (ponderacion por bono), en su listado del mes. No ve cuanto lleva cobrado ni
  ninguna tasa: eso seria el cumplimiento en dinero, un numero que perseguir, y
  el dato de flujos seria el primero en secarse.
- **La descarga y el reporte llevan dinero.** La multiplicacion que el
  administrador hacia a mano en su hoja la hace el sistema: `BONO` y
  `MONTO NO CUMPLIDO` junto al porcentaje.
- **La consecuencia incomoda del ADR 0007 se disuelve.** Quitarle una funcion a
  alguien no le baja el bono: reescala su reparto y cada funcion restante vale
  mas. Su pago solo baja si el administrador le baja el bono, y eso se ve en
  dolares en su mes.
- **Si mover trabajo mueve dinero sigue aplazado** a la revision de los tres
  meses. Un traspaso no toca bonos; si el dinero se mueve, el administrador
  edita los dos bonos a mano.
- **Es una apuesta.** Que ver el dinero mejore la productividad no esta
  probado, y quien lo construyo no estaba convencido. Si el registro se seca --
  menos "no pude" honestos, flujos que nunca se declaran atrasados --, la
  primera sospecha es esta.
