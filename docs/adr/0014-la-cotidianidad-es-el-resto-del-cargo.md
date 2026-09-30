# La cotidianidad es el resto del cargo

> Reemplaza, del ADR 0009, que la holgura la asigna el administrador en el
> reparto como una funcion mas.

Hasta aqui la holgura era una funcion de tipo holgura: el administrador la
daba de alta y le ponia peso, y quien no la tenia recibia imprevistos que
contaban pero no pesaban. En la practica eso dejaba el caso comun al reves:
los supervisores y el administrador tienen que poder darle trabajo a la gente
libremente y saber cuanto le pesa en su dia, y eso dependia de que alguien se
hubiera acordado de crear una funcion que no se repite, no se entrega y no se
traspasa -- justo lo que el ADR 0009 dice que no es una funcion.

Decidimos que **la cotidianidad (antes holgura) sea el resto del cargo**: cien
menos la suma de las ponderaciones de sus funciones. No se crea ni se
traspasa; todo empleado nace con cotidianidad cien. **Nunca baja del diez por
ciento**, asi que todo imprevisto pesa. Y **una sola regla mueve todos los
pesos** -- dar de alta, cambiar, archivar, eliminar o traspasar una funcion --:
lo que entra o sale se compensa en proporcion entre todo el resto,
cotidianidad incluida; si la cuenta deja la cotidianidad bajo el piso, queda en
el piso y lo que falta sale de las funciones. El sistema lo propone con la
cuenta a la vista y el administrador lo ajusta y lo aprueba.

## Considered Options

- **La cotidianidad como una funcion que el sistema crea sola.** El cambio mas
  chico, pero seguia siendo una funcion que no se comporta como tal.
- **Con cotidianidad cero, no se asignan imprevistos.** Descartado: el trabajo
  llega igual, y bloquearlo en cuatro puertas (empleado, supervisor,
  administrador, delegacion) solo lo esconde. "Que se acumulen es el dato"
  (ADR 0009). El piso da el mismo resultado sin cerrar ninguna.
- **El peso de una funcion nueva sale solo de la cotidianidad.** Mas simple, y
  no tocaba las demas funciones. Se prefirio la proporcion con todo el resto:
  es la aritmetica que el reparto ya usaba, y la confirmacion hace explicito
  lo que cambia antes de aprobarlo.

## Consequences

- **INV-14 cambia**: un reparto se publica si suma cien y su cotidianidad no
  queda bajo el diez. Las funciones de una persona suman a lo sumo noventa.
- **"Holgura" deja de ser un tipo de funcion.** La migracion convierte las
  funciones de holgura en cotidianidad y, a quien quede bajo el piso, le sube
  la cotidianidad a diez y le recalcula el resto. Se hizo sin aprobacion
  porque el sistema todavia no estaba en uso en produccion.
- **El bono de la cotidianidad** es su porcion del bono, como cualquier otra, y
  se cumple igual que antes: imprevistos hechos sobre los esperados.
