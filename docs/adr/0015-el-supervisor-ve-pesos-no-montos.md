# El supervisor ve pesos, no montos

> Reemplaza, del PRD de CEB-145 y de INV-3, que el supervisor no vea
> ponderaciones ni tasas de su gente. Lo del dinero se mantiene.

Hasta aqui el supervisor no veia ningun peso de su gente: "un peso es una
conversacion de sueldo y esa es del administrador". Con la cotidianidad como
resto del cargo (ADR 0014) el supervisor es quien mas trabajo reparte por fuera
del reparto, y sin pesos no puede saber cuanto le pesa lo que pide: veinte
imprevistos no son lo mismo con cotidianidad noventa que con diez. Tampoco
podia leer un tablero del equipo ordenado por lo unico comparable entre
personas, la ponderacion arrastrada; hasta el orden de una lista le delataba
los pesos, y habia que construirle otra pantalla.

Decidimos que **el supervisor vea las ponderaciones de su gente, cotidianidad
incluida, y cuanto de su cargo esta sin cumplirse en peso** (ponderacion
arrastrada, y la carga de imprevistos en proporcion a la cotidianidad). **No ve
bonos ni montos**: el dinero sigue siendo del administrador.

## Considered Options

- **Solo ponderaciones, sin lo sin cumplir.** Le dice el tamaño de cada parte,
  pero no deja leer el tablero, que es para lo que se abre.
- **Tambien montos.** Descartado: es la conversacion de sueldo, y el supervisor
  no decide ni el bono ni el reparto.
- **Seguir sin pesos, con una señal de "saturada".** Descartado: un umbral asi
  es subjetivo, y esconder el numero no cambia lo que el supervisor hace con el.

## Consequences

- **El supervisor ve de su gente algo que ella no ve de si misma**: el empleado
  ve su ponderacion y su valor en dolares, pero no cuanto lleva sin cumplir
  (INV-3 para el empleado sigue igual). Si eso cambia, lo decide la nomina.
- **Las funciones de la base que le sirven al supervisor** tienen que devolver
  pesos y dejar de devolver cualquier monto; INV-3 se reescribe y su prueba
  cambia.
- **El PRD de CEB-206** decia que el supervisor seguia sin ver la cotidianidad;
  quedo anotado alli que cambio.
