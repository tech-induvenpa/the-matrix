# Lo pagado queda en una foto

> Reemplaza, del ADR 0011, que un mes pasado se recalcule con el reparto de
> hoy. La descarga sigue siendo una fila por ocurrencia; lo que cambia es de
> donde salen los pesos de un mes cerrado.

La base no guardaba historia de los pesos: un cambio del reparto sobrescribe la
ponderacion, y la persona guarda solo su empresa de hoy. La descarga, y la
nomina que la sigue (INV-45), recalculaban cualquier mes con el reparto
vigente. Con el cierre del mes (ADR 0016) eso deja de ser un detalle: si el
administrador baja un peso en octubre, la nomina de septiembre -- ya pagada --
cambia, y lo pagado se queda sin fundamento en el sistema.

Decidimos que **todo lo que mueve un peso o dinero deje rastro**:

- **La foto del cierre**: al cerrar un mes se guarda la nomina de cada persona
  tal cual -- partes, pesos, descuentos, total y empresa --, con los pesos del
  dia del cierre. Un mes cerrado se lee de su foto y nunca se recalcula; la
  descarga de ese mes sale de la misma foto. Reabrir descarta la foto; al
  volver a cerrar se toma otra.
- **El historial del reparto**: cada cambio publicado de ponderaciones queda
  guardado con quien, cuando, que movimiento y los pesos antes y despues. El
  bono ya lo hacia.

## Considered Options

- **Historia completa, calculando "a la fecha"**: cada cambio de peso y de
  empresa como fila con fechas, y la nomina calculada al dia del cierre.
  Descartado por tamaño: toca el reparto entero (ADR 0014), cada consulta y la
  descarga, para responder lo mismo que la foto.
- **Aceptar el recalculo**: descartado; contradice el cierre del mes.

## Consequences

- **La foto no necesita un proceso a las 23:59.** Despues del cierre nada de
  ese mes se mueve hasta que alguien cambia un peso, una empresa o reabre; asi
  que la foto se toma la primera vez que hace falta -- al leer un mes cerrado
  sin foto, o justo antes de uno de esos cambios -- y sale igual que a las
  23:59.
- **Si el reparto cambia a mitad de mes, cuentan los pesos del dia del
  cierre**, no un promedio: es lo simple y es como se comporta el bono.
- **La empresa de un mes cerrado es la de su foto**, que es la del cierre: lo
  que el PRD de CEB-227 pedia y la primera implementacion no podia saber.
- **Las pruebas corren con el reloj de la base fijo a mitad del mes en curso**,
  salvo las del cierre: si no, las que marcan "este mes" fallarian cada fin de
  mes que cae en fin de semana o feriado.
