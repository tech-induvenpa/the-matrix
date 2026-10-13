# Una marca tardia no mueve el mes

> Reemplaza, del ADR 0016, que en un mes cerrado nada se pueda marcar ni
> deshacer. Se mantiene todo lo demas: el mes sigue cerrando solo, y su foto
> (ADR 0017) sigue siendo lo pagado.

Con el cierre del mes, una tarea vencida de un mes cerrado queda marcada
"Septiembre ya cerró" y nadie puede resolverla: se queda en pantalla como
estorbo, y no queda dicho que paso con ella. Quien la hizo tarde no tiene
como declararlo.

Decidimos permitir la **marca tardia**: quien tiene la tarea puede marcarla
("hecho" o "no pude", con razon) despues del cierre, pero **el mes no se
mueve**. La tarea sigue contando como no cumplida en ese mes: foto, nomina,
cumplimiento y arrastre quedan como estaban.

- La marca tardia vive en su propia tabla, aparte de la marca: todo lo que
  cuenta un mes (foto, nomina, cumplimiento, arrastre, descarga) lee la marca y
  nunca la ve, aunque la foto se tome despues (ADR 0017 la toma la primera vez
  que se necesita). Guarda cuando se puso de verdad.
- Se distingue con un asterisco: "se completó tarde, 9 oct" ("se marcó tarde,
  9 oct" si fue "no pude").
- La descarga agrega la columna MARCADA FUERA DE MES con la fecha real. La
  fila sigue "no cumplida", con su monto.
- Solo se marca lo que seguia sin marca, y solo se deshace la propia marca
  tardia. Lo marcado a tiempo y devolver una delegacion siguen cerrados.

## Considered Options

- **Dejarlo bloqueado**: sin cambios. Descartado: la tarea estorba para
  siempre y no hay registro de lo ocurrido.
- **Recalcular el mes con la marca tardia**: descartado porque mueve dinero
  ya pagado. Si el reporte se genero y se pago, no hay nada que corregir.
- **Reabrir el mes**: descartado por desproporcionado; reabre todo para
  resolver una tarea.

## Consequences

- Cada calculo de un mes (foto, cumplimiento, arrastre, descarga) debe filtrar
  por `marcada_en <= cierre`. Olvidarlo en un sitio filtra dinero.
- Si alguna vez se quiere pagar lo tardio, es un ADR nuevo: el dato ya esta.
