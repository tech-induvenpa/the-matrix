# PRD: La nómina del bono y el cierre del mes

> Copia en el repo de CEB-227.

> Sale del `grill-with-docs` del 2026-09-30. El vocabulario está en `CONTEXT.md` (**Nómina** y **Cierre del mes**, nuevos; **Cumplimiento ponderado** ajustado) y la decisión de fondo en el **ADR 0016**, que reemplaza, del ADR 0010 y de INV-3, que el empleado no vea cuánto lleva cobrado.

## Problem Statement

Cada fin de mes alguien tiene que decirle a finanzas cuánto del bono le corresponde a cada persona. Hoy eso sale de la descarga: una fila por cada vez que algo debía hacerse, con el monto no cumplido, que el administrador tiene que sumar por persona en una tabla dinámica. No hay una cifra por persona, ni una explicación que se pueda mostrar, ni un momento en que el mes deje de moverse: una marca tardía, una marca deshecha o una devolución cambian septiembre aunque finanzas ya lo haya pagado.

El empleado, por su lado, ve cuánto vale cada función de su bono, pero no cuánto lleva ganado ni cuánto le cuesta lo que no cumple. No sabe qué le van a pagar hasta que le pagan, ni por qué.

## Solution

**La nómina:** cuánto del bono le corresponde a cada persona en un mes, con su fundamento. Se lee como un estado de cuenta: el bono del mes, un descuento por cada parte del cargo que no se cumplió entera (con cuánto pesa y cuánto no se cumplió) y el total a pagar. Cada descuento va en centavos y el total es el bono menos los descuentos, así que siempre cuadra. No incluye el sueldo base, que el sistema no conoce.

```
ANA · Toyota · septiembre 2026 · mes cerrado
  Bono de septiembre                                    $500,00
  − Cierre de caja (40%): 1 de 4 sin cumplir            −$50,00
  − Conciliación (20%): 2 de 22 días hábiles atrasada    −$9,09
  − Cotidianidad (40%): 1 de 10 imprevistos sin cumplir −$20,00
  = Total a pagar                                       $420,91
```

**El empleado la ve en vivo (ADR 0016).** En "El mes", "Tu nómina de septiembre" reemplaza a "Dónde más cuentas": el estado de cuenta, provisional hasta el cierre, que se mueve con cada marca. Ver el impacto de un "no pude" invita a pensarlo dos veces y a destrabar la razón. Con el selector de mes ve los meses anteriores, ya fijos. El administrador la ve en el perfil de cada persona ("Su nómina"). El supervisor no, porque no ve montos (ADR 0015).

**El cierre del mes.** El mes se cierra solo, en corte duro, a las 23:59 de Caracas de su último día hábil. Lo que no se marcó antes cuenta como no cumplido, y desde ahí nada de ese mes se marca, se deshace, se devuelve ni se declara atrasado. Solo el administrador lo reabre, con una razón, para todos: el mes vuelve al uso normal y se vuelve a cerrar cuando él lo decide o, si se le olvida, solo, veinticuatro horas después. Cada reapertura queda registrada y se ve en la nómina.

**Para finanzas, una descarga nueva:** "Nómina del mes", un archivo por empresa con un bloque por persona como el de arriba, en hoja de cálculo (PERSONA · CONCEPTO · MONTO). Solo de meses cerrados. La descarga de siempre no cambia y sigue siendo el detalle.

## User Stories

**Empleado**

1. Como empleado, quiero ver en "El mes" mi nómina del mes en curso, para saber cuánto de mi bono llevo ganado.
2. Como empleado, quiero que empiece por mi bono y vaya descontando, para entender de dónde sale el total.
3. Como empleado, quiero que cada descuento diga qué parte de mi cargo es, cuánto pesa y cuánto no se cumplió, para saber qué me costó cada cosa.
4. Como empleado, quiero que lo que cumplí no aparezca como descuento, para leer solo lo que resta.
5. Como empleado, quiero que mi nómina cambie en cuanto marco algo, para ver el impacto de un "no pude" antes y después de marcarlo.
6. Como empleado, quiero que diga que es provisional mientras el mes está abierto, para no tomarla por lo que me van a pagar.
7. Como empleado, quiero seguir viendo cuánto vale cada función de mi bono, porque es de donde sale cada descuento.
8. Como empleado, quiero ver la nómina de meses anteriores, fija, con el mismo selector de mes, para comparar.
9. Como empleado, quiero ver si un mes se reabrió, cuándo, por qué y qué cambió, para confiar en lo que me pagaron.
10. Como empleado, quiero que la cifra cuadre al centavo, para no encontrar diferencias que nadie explica.
11. Como empleado sin bono, quiero seguir viendo mis porcentajes y no una nómina en cero, porque no perdí nada.
12. Como empleado, quiero saber que el mes se cierra a las 23:59 de su último día hábil, para marcar a tiempo.
13. Como empleado, quiero que después del cierre no se pueda marcar nada de ese mes, igual para todos.
14. Como empleado, quiero que nadie más que yo y el administrador vea mi nómina.

**Administrador**

15. Como administrador, quiero ver la nómina de cada persona en su perfil, debajo de su bono, para responder por qué se le paga lo que se le paga.
16. Como administrador, quiero ver sus meses anteriores desde ahí.
17. Como administrador, quiero que el mes se cierre solo, sin tener que acordarme.
18. Como administrador, quiero reabrir un mes cerrado escribiendo una razón, para corregir lo que el cierre dejó mal (una caída del sistema, un calendario equivocado, una devolución por error).
19. Como administrador, quiero que al reabrir todos puedan volver a marcar lo de ese mes, para que cada quien corrija lo suyo.
20. Como administrador, quiero volver a cerrar el mes cuando termine, y que si se me olvida se cierre solo a las veinticuatro horas.
21. Como administrador, quiero que cada reapertura quede registrada con quién, cuándo, por qué y qué cambió.
22. Como administrador, quiero descargar la nómina de un mes cerrado, un archivo por empresa, con un bloque por persona, para mandársela a finanzas.
23. Como administrador, quiero que el archivo empiece por el bono de cada persona, descuente parte por parte y termine en el total a pagar, claro y preciso.
24. Como administrador, quiero que el archivo sea una hoja de cálculo, para que finanzas pueda sumar y filtrar sin copiar a mano.
25. Como administrador, quiero que el mes en curso no se ofrezca para descargar, porque todavía es provisional.
26. Como administrador, quiero que quien cambió de empresa en el mes aparezca entero en la empresa en la que está al cierre.
27. Como administrador, quiero que quien no tiene bono ese mes no aparezca en el archivo.
28. Como administrador, quiero que la nómina y la descarga de siempre nunca se contradigan: lo descontado en una es lo no cumplido en la otra.

**Supervisor**

29. Como supervisor, quiero seguir sin ver la nómina de mi gente, porque no veo montos.
30. Como supervisor, quiero saber que después del cierre no puedo devolver ni revisar nada de ese mes, para revisar a tiempo lo que delegué.

**Finanzas**

31. Como finanzas, quiero recibir un archivo por empresa con lo que hay que pagarle a cada persona del bono, para liquidar sin preguntar.
32. Como finanzas, quiero que lo que recibo de un mes cerrado no cambie después, salvo por una reapertura registrada.

## End-to-End Invariants

Los de los PRD anteriores siguen vigentes, incluidos los de CEB-215, salvo **INV-3**, que se reescribe aquí para el empleado. Cada invariante necesita su prueba de trazador sobre el cableado real (Supabase local, sesiones reales, sin llave de servicio en el servidor web), y este PRD no se cierra hasta que pasen. El job `invariantes` de CI las corre.

**INV-3 (reescrito) · El empleado obtiene su nómina y la de nadie más; el supervisor, ninguna.**
Prueba: con sesión real de empleado, obtiene su nómina del mes y no la de un compañero. Con sesión real de supervisor, no obtiene la nómina de su gente. Por consulta directa, lo mismo.

**INV-43 · Nada de un mes cerrado se marca, se deshace, se devuelve ni se declara atrasado.**
Prueba: con el reloj después de las 23:59 de Caracas del último día hábil del mes, marcar una ocurrencia de ese mes, deshacer una marca, marcar un imprevisto que vence en ese mes, devolver una delegación y declarar atrasado un flujo con fecha de ese mes → rechazados por la base. Un minuto antes → aceptados.

**INV-44 · Solo el administrador reabre un mes, siempre con razón, y el mes vuelve a cerrarse a las veinticuatro horas.**
Prueba: un empleado o un supervisor que intentan reabrir → rechazado. El administrador sin razón → rechazado; con razón → aceptado, queda registrado quién, cuándo y por qué, y lo de ese mes vuelve a marcarse. Veinticuatro horas después, sin cerrarlo a mano, vuelve a estar cerrado.

**INV-45 · La nómina cuadra al centavo y coincide con la descarga.**
Prueba: una persona con entregables cumplidos e incumplidos, un flujo atrasado y cotidianidad con imprevistos sin cumplir. El total es el bono menos la suma de los descuentos, al centavo; cada descuento coincide con la suma del monto no cumplido de sus filas en la descarga del mismo mes; lo cumplido no descuenta.

## Implementation Decisions

**El dominio puro**

- **La nómina** es el módulo profundo. Recibe el bono del mes de una persona y el cumplimiento de cada parte de su cargo en ese mes (entregables: cumplidas sobre asignadas; flujos: días hábiles atrasados sobre días hábiles del mes; cotidianidad: imprevistos hechos sobre esperados), y devuelve el estado de cuenta: una línea por parte no cumplida con su ponderación, lo no cumplido y el descuento en centavos, y el total. Sin bono, no hay nómina. Sale de los mismos hechos que la descarga, para que nunca se contradigan.
- **El cierre del mes** es una regla del dominio: dado un mes y el calendario, el instante del cierre (23:59, hora de Caracas, del último día hábil), y dado el registro de reaperturas, si un mes está abierto, cerrado o reabierto hasta cuándo. La zona horaria es explícita: el servidor corre en UTC.

**La base**

- Una tabla nueva de reaperturas: mes, razón obligatoria, quién, cuándo, y cuándo se volvió a cerrar (a mano o a las veinticuatro horas).
- Todo lo que mueve un mes (marcar y deshacer una ocurrencia, marcar un imprevisto, devolver una delegación, declarar el estado de un flujo) se rechaza si su fecha cae en un mes cerrado y no reabierto. La regla vive en la base, no en la pantalla.
- Reabrir y volver a cerrar son funciones solo del administrador. El cierre a las veinticuatro horas no necesita un proceso: un mes reabierto hace más de veinticuatro horas se lee como cerrado.
- La lectura de la nómina respeta INV-3: cada quien la suya; el administrador, todas; el supervisor, ninguna.

**La pantalla**

- **"El mes" del empleado:** "Tu nómina de septiembre" reemplaza a "Dónde más cuentas", con lo que vale cada función a la vista. Provisional mientras el mes está abierto; fija, con sus reaperturas, en meses anteriores.
- **El perfil del administrador:** "Su nómina" en la columna fija, debajo de "Su bono", con enlace a meses anteriores.
- **Reabrir y cerrar:** donde el administrador elige el mes para descargar, con la razón obligatoria.
- **La descarga "Nómina del mes":** un archivo por empresa, un bloque por persona (PERSONA · CONCEPTO · MONTO), solo meses cerrados. La descarga de siempre no cambia.

## Testing Decisions

- Un buen test prueba comportamiento externo (entradas del dominio contra salidas, o sesiones reales contra la base), nunca la forma interna.
- **Dominio, nómina:** todo cumplido (sin descuentos); entregables, flujo y cotidianidad sin cumplir; el ejemplo de Ana ($420,91); el redondeo siempre cuadra; sin bono no hay nómina; alta a mitad de mes; un mes sin imprevistos esperados no descuenta cotidianidad. Prior art: `descarga.test.ts`, `reparto.test.ts`.
- **Dominio, cierre del mes:** el último día hábil cuando el mes termina en fin de semana o en feriado; 23:59 de Caracas contra UTC; reabierto, cerrado a mano, cerrado a las veinticuatro horas.
- **Base:** INV-3 reescrito, INV-43, INV-44 e INV-45 en `pruebas/`. Prior art: `inv-3-lo-que-no-se-ve.test.ts`, `inv-23-bono.test.ts`, `inv-18-imprevistos.test.ts`.
- **Pantalla:** sin runner de tests en la web; QA manual sobre la web real, como `qa-ceb-198.mts`.

## Out of Scope

- **Que el supervisor vea la nómina de su gente.** No ve montos (ADR 0015).
- **Que el supervisor o el administrador declaren atrasado un flujo ajeno.** Se confía en la buena fe (ADR 0016).
- **Reabrir el mes de una persona sola.** Se reabre para todos, por simpleza.
- **Un PDF por persona.** Solo si finanzas lo pide.
- **El sueldo base.** El sistema no lo conoce (ADR 0010).
- **Mostrar la nómina en el tablero del equipo.**

## Further Notes

- El riesgo aceptado son los flujos: con el número a la vista, callar un atraso sale gratis. Si el dato de flujos se seca, la primera sospecha es esta (ADR 0016).
- El corte duro es a propósito: lo mensual vence casi siempre el último día hábil, así que se marca ese día o se pierde.
- Quien entra a mitad de mes cobra casi todo el bono de ese mes, porque casi nada le pudo descontar. Si eso no debe ser, el administrador le fija el primer bono desde el mes siguiente.
