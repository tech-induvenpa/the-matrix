# El imprevisto no es una funcion ni una ocurrencia

CEB-146 nacio como "Urgentes, la funcion comodin": toda persona tendria una
funcion mas donde caeria el trabajo de ultimo minuto. Tenia la ventaja de
reusar todo -- plan, marca, arrastre, reporte -- y el costo de romper lo que
hace a una funcion ser una funcion. Una funcion es recurrente, tiene
periodicidad, se traspasa y pesa dentro de un reparto; el trabajo de ultimo
minuto no hace ninguna de las cuatro cosas. Meterlo en `funcion` obligaba a que
la periodicidad admitiera "ninguna", a que el calculo de ocurrencias llevara
una rama nueva para todas las funciones del sistema, y a romper la unicidad de
la marca por funcion y periodo, porque dos imprevistos el mismo dia chocarian.

Decidimos que **el imprevisto sea una entidad propia**: pertenece a un
empleado y a ninguna funcion, se escribe una vez con la fecha en que se pidio
y quien lo pidio, y vence a mas tardar el dia habil siguiente. Es la primera
cosa del sistema que se marca sin ser una ocurrencia calculada. La urgencia
sigue sin escribirse (ADR 0003): sale de su vencimiento, y por eso nace en 8 o
9 sin que nadie la declare. Tampoco se llama "urgente", porque en este glosario
la urgencia se calcula.

## Consecuencias

- **Lo previsto y lo imprevisto se miden por separado.** El imprevisto no entra
  a la ventana de la semana ni a la meta, y al cumplimiento ponderado solo
  entra por la holgura. Su efecto
  sobre lo previsto se registra como **intromision** -- un "no pude" vinculado a
  los imprevistos que lo causaron -- y se resume en **ponderacion desplazada**.
  Mezclar las dos series haria imposible responder cuanto empuja uno al otro.
- **No arrastra.** El arrastre necesita una serie de periodos y el imprevisto
  no la tiene. Si vence sin marca queda abierto a la vista con su retraso, y que
  se acumulen es el dato.
- **Un imprevisto que se repite es una funcion que nadie dio de alta.** Se
  detecta a ojo en el reporte y se da de alta como funcion desde su fecha; el
  imprevisto no se convierte, queda como paso.
- **Lo imprevisto pesa a traves de la holgura, nunca por si mismo** (CEB-158,
  decidido el mismo dia). Ningun imprevisto trae peso: la holgura que el
  administrador asigna en el reparto se cumple con los imprevistos de su
  titular -- hechos sobre esperados, "no lo tome" neutro. Descartamos que cada
  imprevisto trajera su propio peso: el cien de alguien cambiaria cada vez que
  le cae algo, y quien registra decidiria cuanto pesa, que es justo lo que el
  ADR 0003 evita con la urgencia. Hasta aqui la holgura salia en la descarga
  como cumplida siempre: peso pagado sin rendir cuentas.
