# Delegar un imprevisto: el original sigue siendo del supervisor

> Extiende el ADR 0012, que solo dejaba delegar ocurrencias del reparto.

Un supervisor recibe imprevistos como cualquier empleado, y hasta aqui solo
podia pasarle a su gente ocurrencias de sus funciones. Un imprevisto que le
cayo a el -- "revisa esta factura" -- se quedaba en su lista aunque otro del
equipo pudiera hacerlo. Habia dos formas de pasarlo:

- **Cambiarle el dueno.** Es lo mas simple, pero el supervisor deja de verlo y
  se quita de encima un "no pude": el problema que el ADR 0012 ya resolvio. Y
  el glosario dice que un imprevisto no se traspasa ni se edita.
- **Un imprevisto nuevo, vinculado, y el original se queda.** Es el patron de
  la delegacion.

Decidimos lo segundo: **delegar un imprevisto es crear uno nuevo para quien lo
recibe, vinculado al original, que sigue siendo del supervisor.** Quien lo
recibe lo marca; esa marca no cierra el original: el supervisor lo revisa y lo
marca, o lo devuelve (con razon obligatoria si devuelve un "hecho").

## Consequences

- **Vence con el original** y hereda su importancia, no al dia habil siguiente:
  lo delegado ya estaba pedido, y una regla de un dia premiaria delegar tarde.
- **Solo se delega lo que no ha vencido.** Un imprevisto vencido sin marca sigue
  abierto; delegarlo haria nacer la delegacion ya con retraso, y ese retraso
  cae en quien la recibe, que no lo causo. Si el supervisor no puede, lo marca
  "no pude" con su razon.
- **A lo sumo una delegacion abierta por imprevisto, y sin cadena:** quien
  recibe no tiene gente a cargo (hay un solo nivel).
- **Si no se cumple, pierden los dos**, como en el ADR 0012.
- **La delegacion cuenta como pedida por el supervisor.** El pedido original
  ("finanzas", "el gerente") se cuenta una sola vez, en el imprevisto del
  supervisor, y quien recibe lo ve en la historia. Se descarto copiar el
  pedidor al delegado: contaria dos veces el mismo trabajo en las cifras de
  quien pide.
