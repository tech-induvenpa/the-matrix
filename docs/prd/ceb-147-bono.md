# PRD: El empleado ve en dólares cuánto vale su trabajo

> Sale del `grill-with-docs` del 2026-09-25 sobre el borrador de CEB-147, al que reemplaza. El vocabulario está en `CONTEXT.md` (**Bono**) y la decisión de fondo en el **ADR 0010**, que reemplaza en parte al 0007.

## Problem Statement

Cada empleado de JFS cobra un sueldo base más un **bono**, que es la parte que el cumplimiento mueve. La ponderación reparte ese bono entre las funciones de su cargo: si "Cierre Auto Bengala" es el 25% del cargo de Douglenis, vale el 25% de su bono.

Hoy nadie ve esa cuenta en dinero:

- **El empleado ve porcentajes.** Sabe que una función es el 25% de su cargo y sabe cuánto gana, pero tiene que hacer la multiplicación. JFS quiere que el impacto en dinero se vea sin cuentas, con la apuesta de que verlo ayuda a la productividad.
- **El administrador multiplica a mano.** La descarga del mes lleva *peso no cumplido* en porcentaje, y el paso a dólares ocurre en su hoja de sueldos, fuera del sistema, donde cualquier error de copia pasa sin que nadie lo vea.
- **El porcentaje esconde una bajada.** Si a alguien le quitan una función, su cargo sigue sumando cien y su pantalla se ve igual. El ADR 0007 lo dejó como consecuencia *"incómoda sin resolver"*.

El sistema no guarda ningún monto a propósito (ADR 0007): el sueldo está protegido porque el dato no existe. Resolver lo anterior obliga a abrir esa puerta, y el diseño tiene que abrirla lo mínimo.

## Solution

**El sistema conoce el bono de cada persona, en dólares, y nada más.** El sueldo base sigue sin existir en el sistema: ninguna cuenta lo necesita.

**El bono lo escribe solo el administrador, y cada cambio rige siempre desde el mes siguiente.** Se mantiene hasta el próximo cambio y nunca reescribe un mes ya empezado. Febrero se sigue calculando con el bono de febrero aunque en marzo cambie.

**El empleado ve en su listado del mes cuánto de su bono vale cada función**: *"Cierre Auto Bengala · 25% · $250"*. No ve cuánto lleva cobrado ni ninguna tasa, porque eso sería el cumplimiento en dinero, un número que perseguir (INV-3 se mantiene). El plan de la semana no cambia.

**El administrador ve el dinero junto al porcentaje.** El reporte muestra cuánto se arrastra, se desplaza y se deja de cumplir de la holgura, en dólares. La descarga del mes suma `BONO` y `MONTO NO CUMPLIDO`, así que la multiplicación que hoy hace a mano la hace el sistema.

**El bono de una persona lo ven ella y el administrador, nadie más**, supervisores incluidos cuando exista CEB-145.

**Mover trabajo no mueve dinero, por ahora.** Un traspaso no toca el bono de nadie. Si el administrador decide que el dinero acompaña a la función, edita los dos bonos a mano. La regla se revisa con los tres meses de datos (decisión aplazada del 22/09/2026).

## User Stories

**Administrador**

1. Como administradora, quiero escribir el bono de cada persona en dólares, para que el sistema calcule lo que hoy calculo a mano.
2. Como administradora, quiero que un cambio de bono rija siempre desde el mes siguiente, para no cambiarle a nadie las cuentas de un mes que ya empezó.
3. Como administradora, quiero ver en la ficha de una persona su bono vigente y, si lo cambié, el que regirá el mes que viene, para saber qué está pendiente.
4. Como administradora, quiero poder corregir un cambio de bono pendiente antes de que rija, sin que queden dos cambios para el mismo mes, para arreglar un error de tipeo.
5. Como administradora, quiero que el historial de bonos no se pueda reescribir, para que lo que se pagó en un mes se pueda reconstruir siempre.
6. Como administradora, quiero que la descarga del mes lleve el bono de ese mes y el monto no cumplido de cada función, para llevarme los dólares a la nómina sin multiplicar.
7. Como administradora, quiero que la fila de holgura de la descarga también lleve su monto no cumplido, para que los imprevistos pesen en dinero igual que el resto.
8. Como administradora, quiero ver en el reporte cuántos dólares del bono de cada persona se están arrastrando, para ordenar lo urgente por lo que de verdad cuesta.
9. Como administradora, quiero ver la ponderación desplazada también en dólares, para saber cuánto dinero le mueven los imprevistos a cada persona.
10. Como administradora, quiero que el sueldo base no esté en ningún sitio del sistema, para que un fallo de acceso no pueda exponerlo.
11. Como administradora, quiero que una persona sin bono cargado se vea como tal y no como bono cero, para no confundir un dato que falta con alguien que no cobra bono.
12. Como administradora, quiero que un traspaso no toque ningún bono, para que mover trabajo y mover dinero sean dos decisiones separadas mientras la regla está aplazada.

**Empleado**

13. Como empleado, quiero ver en mi listado del mes cuánto de mi bono vale cada función, para entender en dinero por qué pesa lo que pesa.
14. Como empleado, quiero que la suma de lo que vale cada función sea exactamente mi bono, para no desconfiar de las cuentas.
15. Como empleado, quiero ver cuánto vale mi holgura en dólares, para entender que atender los imprevistos también es parte de lo que cobro.
16. Como empleado, quiero ver el bono del mes en curso aunque ya esté cargado el del mes que viene, para no confundir lo de ahora con lo que viene.
17. Como empleado, quiero que el plan de la semana siga sin dinero, para trabajar en lo que toca y no en lo que paga.
18. Como empleado, quiero no ver cuánto llevo cobrado ni ninguna tasa, para que el sistema me ayude a trabajar y no me ponga un marcador.
19. Como empleado, quiero que nadie más que yo y el administrador vea mi bono, para que lo que gano siga siendo privado.
20. Como empleado, quiero que si me bajan el bono lo vea en mi mes, para que un cambio en lo que cobro no pase en silencio.

## End-to-End Invariants

Los de CEB-106, CEB-128 y CEB-146 siguen vigentes salvo donde se diga. Cada invariante nuevo o reescrito necesita su prueba de trazador sobre el cableado real (Supabase local, sesiones reales de empleado y de administrador, sin llave de servicio en el servidor web), y este PRD no se cierra hasta que pasen.

**INV-1 se reescribe (ADR 0010).** Decía *"ningún monto existe en el sistema"*. Pasa a ser: **el sueldo base no existe en ninguna tabla ni respuesta, y el bono de una persona solo llega a su sesión y a la del administrador.**
Prueba: con dos empleados con bono cargado, cada sesión de empleado obtiene solo su propio bono, por consulta directa y por cualquier ruta. La sesión del administrador obtiene los dos. Ninguna tabla tiene una columna de sueldo. La prueba de que el importador no trae `MONTO` ni `ASIGNACION` del documento se conserva mientras el importador exista.

**INV-3 se mantiene tal cual.** El empleado ve la ponderación y ahora su valor en dólares; no ve su tasa de cumplimiento, ni lo cobrado, ni lo perdido.

**INV-23 · Un cambio de bono nunca altera el mes en curso ni los anteriores.**
Prueba: con un bono vigente, el administrador lo cambia. El bono del mes en curso y el de los meses anteriores siguen siendo el viejo, y el del mes siguiente es el nuevo. Un segundo cambio en el mismo mes reemplaza al pendiente y no deja dos.

**INV-24 · Solo el administrador escribe un bono.**
Prueba: una sesión de empleado no puede crear, cambiar ni borrar ningún bono, tampoco el suyo. El historial no admite `update` ni `delete` directos, ni siquiera del administrador.

## Implementation Decisions

**El modelo** (ADR 0010)

- Tabla `bono`, con el empleado, el monto en dólares (numérico, mayor o igual que cero), el mes desde el que rige, quién lo fijó y cuándo. Es un historial: nunca se edita ni se borra una fila que ya rige.
- El sueldo base no tiene columna ni tabla.
- Un cambio se hace con una función de la base, solo para el administrador, que recibe el empleado y el monto y **calcula ella misma** el mes desde el que rige: siempre el mes siguiente al de hoy. Si ya había un cambio pendiente para ese mes, lo reemplaza. Así nadie puede fijar un bono con fecha pasada ni para el mes en curso.
- Seguridad por fila: la persona lee sus filas y el administrador todas. Se revocan los privilegios por defecto de Supabase antes de conceder, como en `imprevisto`: sin `insert`, `update` ni `delete` directos para nadie.
- Una persona sin bono cargado no tiene bono, no un bono cero. La pantalla y la descarga lo muestran vacío.

**El dominio puro**, un módulo profundo:

- **Bono**: dado el historial de una persona y un mes, devuelve el bono de ese mes, o nada si no hay ninguno cargado. Dadas las tajadas del reparto (con sus porcentajes redondeados, que ya suman cien) y el bono, devuelve cuánto vale cada una en dólares, con el ajuste de centavos en la última para que la suma sea exactamente el bono. Dado el peso no cumplido y el bono, devuelve el monto no cumplido.

**La pantalla del empleado**

- El listado del mes muestra junto a cada porción del reparto su valor en dólares, con el bono del mes en curso. Si no hay bono cargado, se muestra el porcentaje solo, como hoy.
- El plan de la semana, las tarjetas y la columna de imprevistos no cambian.
- La ponderación desplazada sigue sin llegar al empleado (INV-22).

**La administración**

- La ficha de una persona muestra el bono vigente y, si lo hay, el que regirá el mes siguiente, con el campo para cambiarlo.
- El reporte muestra junto a cada porcentaje (arrastrado, desplazado, holgura) su valor en dólares, con el bono del mes.
- La descarga del mes suma dos columnas al final, `BONO` y `MONTO NO CUMPLIDO`, calculadas con el bono de cada mes de la fila. Las columnas que ya existen no cambian de lugar, para que la hoja de sueldos que las lee no se rompa.

## Testing Decisions

- Un buen test prueba comportamiento externo (entradas del dominio contra salidas, o sesiones reales contra la base) y nunca la forma interna.
- **Dominio puro, con tests unitarios** del módulo de bono: bono de un mes con cambios antes y después; un cambio que rige el mes siguiente; dos cambios en un mes; persona sin bono; dólares por tajada que suman exactamente el bono con ponderaciones que no dividen exacto; monto no cumplido. Prior art: `reparto.test.ts`, `holgura.test.ts`.
- **Pruebas de trazador** en `pruebas/` para INV-1 reescrito, INV-23 e INV-24, contra Supabase local con sesiones reales. Prior art: `inv-18-imprevistos`, `inv-2-aislamiento`.
- **Sin tests de módulo** para la web. La parte de HTML de INV-3 (que el plan no lleve dinero y el mes sí) queda como `it.todo`, igual que los de INV-3 e INV-22 que ya existen.

## Out of Scope

- **El sueldo base.** No entra al sistema bajo ninguna forma.
- **Que el empleado vea lo cobrado o lo perdido del mes.** Es el cumplimiento en dinero; INV-3 se mantiene. Si JFS lo pide tras ver esto funcionando, es una decisión nueva.
- **Dinero en el plan de la semana.**
- **Mover bonos al traspasar.** Aplazado a la revisión de los tres meses.
- **Monedas distintas del dólar**, tasas de cambio y bolívares.
- **Que el supervisor vea bonos** (CEB-145). Si lo necesita, se decide ahí con su propio invariante.
- **Prorratear un bono dentro de un mes.** Un cambio nunca parte un mes.

## Further Notes

- **Es una apuesta** (ADR 0010): que ver el dinero mejore la productividad no está probado, y quien lo construye no estaba convencido. Si el registro se seca (menos "no pude" honestos, flujos que nunca se declaran atrasados), la primera sospecha es esta.
- **La consecuencia incómoda del ADR 0007 se disuelve.** Quitarle una función a alguien reescala su reparto y cada función restante vale más; su pago solo baja si el administrador le baja el bono, y eso se ve en su mes.
- **Carga inicial:** los bonos de hoy los tiene el administrador en su hoja. Cargarlos es un paso manual el día que se despliegue. Como un cambio rige el mes siguiente, **la primera carga también rige el mes siguiente**, así que el primer mes con dólares en pantalla es el que sigue a la carga. Si JFS lo quiere antes, la carga inicial tendría que ser una excepción explícita.
