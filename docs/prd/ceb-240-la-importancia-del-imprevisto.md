# PRD: La importancia del imprevisto

> Copia en el repo de CEB-240.

> Sale del `grill-with-docs` del 2026-09-30. El vocabulario está en `CONTEXT.md` (**Importancia**, **Imprevisto**, **Delegación** y **Cuadrante**, ajustados). Sin ADR: no toca dinero y se deshace fácil. El ADR 0009 sigue en pie: ningún imprevisto trae peso.

## Problem Statement

Un imprevisto solo dice para cuándo se necesita. No dice cuán importante es, así que no cae en ningún cuadrante: vive en su propio bloque, ordenado solo por vencimiento, con un color neutro que no dice nada. Un informe para el directorio y un trámite menor que vencen el mismo día se ven iguales, y en las listas del equipo cuentan como importancia 0, detrás de cualquier ocurrencia.

Quien lo recibe no sabe si "hacerlo ya" o "mantenerlo al día", y quien lo pide no tiene cómo decirlo.

## Solution

**Quien anota un imprevisto dice también cuán importante es**, de 0 a 9, en el mismo formulario donde elige la urgencia. Por defecto, 5. Como el resto del imprevisto, no se edita: si está mal, se borra y se anota otro.

**Con urgencia e importancia, el imprevisto cae en un cuadrante** con las mismas reglas que una ocurrencia, incluida la subida cerca del vencimiento: hacer ya, ponle fecha o mantener al día. Sigue en su propio bloque (no entra a la ventana de la semana), pero su tarjeta toma el color de su cuadrante y muestra `IMP` junto a `URG`, como una ocurrencia.

**Una delegación hereda la importancia de la función** el día en que se delega, y ya no se mueve.

**El orden:** en el bloque del empleado, por cuadrante, luego mayor importancia, luego el vencimiento más cercano. En las listas del equipo y los perfiles, urgencia y luego importancia, ahora con la importancia real del imprevisto.

**Los imprevistos que ya existen quedan en 5.**

**Nunca toca dinero ni ponderación**: la cotidianidad y la nómina no cambian.

## User Stories

**Quien anota (empleado, supervisor, administrador)**

1. Como quien anota un imprevisto, quiero elegir su importancia de 0 a 9, para decir cuánto importa además de para cuándo.
2. Como quien anota, quiero que empiece en 5, para no tener un paso más cuando no me importa elegir.
3. Como quien anota, quiero el mismo selector en las tres pantallas donde se anota (la mía, la de un empleado a mi cargo, la del administrador), para no aprender dos formularios.
4. Como quien anota, quiero que no se pueda editar después, como el resto del imprevisto, para que lo pedido no cambie a escondidas.

**Empleado**

5. Como empleado, quiero ver en cada imprevisto su cuadrante con el mismo color que una ocurrencia, para saber de un vistazo si es para hacer ya.
6. Como empleado, quiero ver `IMP` y `URG` en la tarjeta del imprevisto, como en una ocurrencia.
7. Como empleado, quiero que mis imprevistos se ordenen por cuadrante, luego importancia, luego vencimiento, para empezar por lo que más importa.
8. Como empleado, quiero que un imprevisto poco importante que vence mañana suba a "hacer ya", como una función mensual, para que lo que vence no se me pierda en "mantener".
9. Como empleado, quiero seguir distinguiendo los imprevistos de lo previsto, porque siguen en su propio bloque y dicen quién los pidió.
10. Como empleado que recibe una delegación, quiero que tenga la importancia de la función de mi supervisor, para verla como él la ve.

**Supervisor**

11. Como supervisor, quiero que lo que delego llegue con la importancia de mi función, sin elegirla.
12. Como supervisor, quiero que en los acordeones de mi gente los imprevistos se ordenen con su importancia real, no como si fuera 0.
13. Como supervisor, quiero ver el cuadrante y la importancia de los imprevistos de mi gente en su perfil.

**Administrador**

14. Como administrador, quiero lo mismo en los acordeones y perfiles de todos.
15. Como administrador, quiero que los imprevistos que ya existían queden en 5, para que todos tengan cuadrante con la misma regla.
16. Como administrador, quiero que cambiar la importancia de una función no mueva la de las delegaciones ya hechas, como no se mueve su vencimiento.
17. Como administrador, quiero que la importancia del imprevisto no cambie la cotidianidad, la nómina ni la descarga.

## End-to-End Invariants

Los de los PRD anteriores siguen vigentes (hasta INV-47). Cada invariante necesita su prueba de trazador sobre el cableado real (Supabase local, sesiones reales, sin llave de servicio en el servidor web), y este PRD no se cierra hasta que pase. El job `invariantes` de CI la corre.

**INV-48 · Todo imprevisto tiene una importancia de 0 a 9, la escribe quien lo anota o la hereda de la función que delega, y nunca cambia.**
Prueba: con sesiones reales de empleado, supervisor y administrador, anotar un imprevisto con importancia 7 → queda en 7; sin importancia → queda en 5; con 10 o -1 → rechazado por la base. Un supervisor delega una ocurrencia de una función de importancia 8 → el imprevisto queda en 8; el administrador cambia la función a 3 → la delegación sigue en 8. Nadie puede actualizar la importancia de un imprevisto existente. Lo que ve el supervisor de su gente trae la importancia. La nómina y la descarga de ese mes son idénticas con importancia 0 o 9.

## Implementation Decisions

**El dominio puro**

- **El cuadrante del imprevisto** sale de la misma regla que el de una ocurrencia: importancia efectiva (con la subida a 5 cuando faltan tres días hábiles o menos, y "nada cae en el vacío") y cuadrante por urgencia e importancia. El imprevisto se trata como una función no diaria ni semanal. Una función del dominio recibe la importancia, el vencimiento, hoy y el calendario, y devuelve urgencia, importancia efectiva y cuadrante.
- **El orden del bloque del empleado:** cuadrante (hacer, agendar, mantener), luego mayor importancia, luego vencimiento más cercano.
- **La lista de tareas** (acordeones y perfiles) usa la importancia real del imprevisto en lugar de 0. Sigue sin ponderación, a propósito.

**La base**

- El imprevisto tiene una importancia obligatoria, de 0 a 9, 5 por defecto. Los existentes quedan en 5 al migrar.
- No se puede actualizar después de creada: la regla vive en la base.
- Delegar copia la importancia de la función en ese momento.
- Lo que lee el supervisor de su gente trae la importancia del imprevisto.

**La pantalla**

- **"Nueva tarea"**, en las tres pantallas: un desplegable de 0 a 9 junto al de la urgencia, en 5. La acción valida el valor y usa 5 si llega algo fuera de rango.
- **La tarjeta del imprevisto:** el color de su cuadrante, como una ocurrencia, y `IMP` junto a `URG`. Mantiene "pedido por…" o "delegado por…" y el resto.
- **El bloque del empleado** ordena con el orden del dominio.
- **La descarga no cambia**: tampoco muestra la importancia de las funciones.

## Testing Decisions

- Un buen test prueba comportamiento externo (entradas del dominio contra salidas, o sesiones reales contra la base), nunca la forma interna.
- **Dominio, cuadrante del imprevisto:** importancia alta y urgencia alta → hacer ya; importancia baja que vence mañana → hacer ya por la subida; importancia baja con urgencia media y más de tres días → mantener al día; urgencia baja → ponle fecha sea cual sea la importancia. Prior art: `cuadrante.test.ts`.
- **Dominio, orden:** por cuadrante, luego importancia, luego vencimiento; la lista de tareas usa la importancia real. Prior art: `perfil.test.ts`.
- **Base:** INV-48 en `pruebas/`. Prior art: `inv-18-imprevistos.test.ts` y las de delegación.
- **Pantalla:** sin runner de tests en la web; QA manual sobre la web real.

## Out of Scope

- **Que la importancia pese en la cotidianidad o en la nómina.** Lo descarta el ADR 0009.
- **Editar la importancia de un imprevisto.** Se borra y se anota otro.
- **Meter los imprevistos en la matriz o en la ventana de la semana.** Siguen en su bloque.
- **Una columna de importancia en la descarga.**
- **Mostrar la importancia en el tablero del equipo.**

## Further Notes

- Quien anota puede inflar la importancia. No tiene incentivo, porque no toca dinero; si pasa, se ve en la tarjeta y se conversa.
- Un imprevisto de importancia baja que vence pronto sale en "hacer ya": es la misma regla que ya aplica a las funciones mensuales.
