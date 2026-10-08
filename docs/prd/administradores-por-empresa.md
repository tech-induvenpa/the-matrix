# PRD: La empresa acota; administradores generales y de empresa

> Sale del `grill-with-docs` del 2026-10-08. El vocabulario está en `CONTEXT.md` (**Administrador de empresa** nuevo; **Empresa**, **Administrador**, **Supervisor**, **Traspaso** y **Sede** ajustados) y la decisión de fondo en el **ADR 0019**, que cambia el ADR 0004 y revierte que la empresa "no limita nada".

## Problem Statement

Hoy hay un solo administrador y lo ve todo. La empresa (KIA, Changan, Toyota, Induvenpa, Holding) solo agrupa: el supervisor puede tener gente de otra empresa, un traspaso cruza empresas y el filtro por empresa de `/admin` es una comodidad, no un límite. Dar de alta a un administrador es un acto manual con la llave de servicio, sin pantalla.

Cada empresa necesita a alguien que reparta, pondere y puntúe a su gente sin ver ni tocar a la de las demás, y JFS necesita poder crear esos administradores sin acudir a un script.

## Solution

**La empresa pasa a ser un límite de seguridad.** Hay dos tipos de administrador: el **general** (del grupo, ve todo, puede haber varios) y el **de empresa** (de una sola empresa). El de empresa y el supervisor solo ven y gestionan gente y tareas de su empresa; solo el general cruza empresas.

El general da de alta a otros administradores, de los dos tipos, desde `/admin`. El de empresa no crea administradores. Un administrador no es un empleado: se da de alta con nombre y correo, entra con un enlace al correo y no tiene funciones.

Para el administrador de empresa, `/admin` es la misma pantalla que hoy, ya recortada a su empresa por la base. El general sigue viendo todo y gana la gestión de administradores.

## User Stories

**Administrador general**

1. Como administrador general, quiero dar de alta a otro administrador general con su nombre y correo, para repartir la carga de administrar sin compartir una cuenta.
2. Como administrador general, quiero dar de alta a un administrador de empresa eligiendo su empresa, para delegar la gestión de esa empresa.
3. Como administrador general, quiero ver la lista de administradores con su tipo y su empresa, para saber quién tiene poder sobre qué.
4. Como administrador general, quiero que un correo no pueda ser a la vez administrador y empleado, para no mezclar roles en una cuenta.
5. Como administrador general, quiero ser el único que mantiene el calendario, porque es del grupo.
6. Como administrador general, quiero ser el único que traspasa una función entre empresas, para que ese cruce sea una decisión del grupo.
7. Como administrador general, quiero ser el único que cambia a alguien de empresa, para que su historial no cambie de manos sin que yo lo sepa.
8. Como administrador general, quiero seguir viendo a todos y todo, como hoy, para no perder visibilidad del grupo.
9. Como administrador general, quiero que ni yo pueda dejar un supervisor de otra empresa, para que el límite no tenga excepciones.

**Administrador de empresa**

10. Como administrador de empresa, quiero ver solo a la gente de mi empresa, para no ver información de otras.
11. Como administrador de empresa, quiero repartir, ponderar y puntuar las funciones de mi gente, para hacer mi trabajo sin esperar al general.
12. Como administrador de empresa, quiero ver el cumplimiento ponderado y las razones de mi gente, para actuar sobre ellos.
13. Como administrador de empresa, quiero dar de alta a empleados de mi empresa, para incorporar gente sin pedírselo al general.
14. Como administrador de empresa, quiero que el alta me deje elegir solo mi empresa y sus sedes, para no crear gente de otra por error.
15. Como administrador de empresa, quiero traspasar funciones entre mi gente, para reorganizar el reparto de mi empresa.
16. Como administrador de empresa, quiero asignar supervisores solo de mi empresa a gente de mi empresa, para que nadie quede supervisado desde fuera.
17. Como administrador de empresa, quiero que el calendario me salga de solo lectura, porque es del grupo.
18. Como administrador de empresa, quiero que la descarga del mes y la nómina solo traigan a mi empresa, para no exportar a las demás.
19. Como administrador de empresa, quiero no ver la gestión de administradores, para no tener controles que no puedo usar.

**Supervisor**

20. Como supervisor, quiero que mi gente sea siempre de mi empresa, para que lo que veo y pido no cruce empresas.
21. Como supervisor, quiero seguir viendo a quien tengo a cargo hoy con todo su pasado, y dejar de verlo cuando me lo cambian, como hasta ahora.

**Seguridad y datos**

22. Como dueño del producto, quiero que el límite lo aplique Postgres con seguridad por fila y no el código de la aplicación, para que una consulta que olvide filtrar siga sin devolver otra empresa.
23. Como dueño del producto, quiero que los vínculos supervisor-empleado entre empresas que ya existen se detecten antes de migrar, para no romperlos a ciegas.
24. Como dueño del producto, quiero que el administrador que ya existe pase a general sin cambios, para no perder el acceso de hoy.
25. Como empleado, quiero que mi vista no cambie, para no notar la reforma.

## End-to-End Invariants

Numeración continúa la de `pruebas/` (la última es INV-53).

- **INV-54:** Un administrador de empresa nunca lee, por ninguna tabla ni función, filas de un empleado de otra empresa ni de sus funciones, marcas, imprevistos, comentarios, bonos o nómina.
- **INV-55:** Un administrador de empresa nunca escribe sobre un empleado o una función de otra empresa: ni alta, ni edición, ni reparto, ni ponderación, ni traspaso, ni borrado.
- **INV-56:** Un traspaso o un cambio de empresa que cruce empresas solo lo hace un administrador general; para cualquier otro rol la base lo rechaza.
- **INV-57:** El supervisor de un empleado es siempre de la misma empresa que él, y ningún camino de escritura lo puede dejar distinto.
- **INV-58:** Solo un administrador general crea administradores; ningún otro rol, con token de sesión, escribe en la tabla de administradores.
- **INV-59:** Un correo es de un administrador o de un empleado, nunca de los dos.
- **INV-60:** El administrador general ve exactamente lo mismo que antes de la reforma (sin regresión), y el administrador que ya existía es general.
- **INV-61:** El calendario solo lo modifica un administrador general.

**Tracer-bullet proof de cada uno:** una prueba contra la base real (la misma suite de `pruebas/` con sesiones reales por rol, sin sobrescribir proveedores) que ejerce el invariante de punta a punta. **Definition of Done:** el PRD cierra solo cuando todos los invariantes tengan su prueba pasando sobre el cableado real.

## Implementation Decisions

- **Modelo.** La tabla de administradores gana nombre, correo y una empresa opcional: nula es general, con valor es de empresa. El administrador existente se migra como general. Un administrador no tiene fila de empleado.
- **Roles en la base.** `es_administrador()` se divide en una función para el general y otra que devuelve la empresa del de empresa. Las políticas "el administrador ve ..." se reescriben: el general ve todo; el de empresa ve lo que cuelga de empleados de su empresa.
- **Escrituras.** Todas las funciones de escritura del administrador (alta, edición, reparto, ponderación, traspaso, borrado, supervisor, cotidianidad, bono, cierre del mes) validan que el objetivo sea de la empresa del que actúa; el cambio de empresa, el cruce de empresas en traspaso, el calendario y el cierre del mes exigen general.
- **Supervisor de la misma empresa.** Se refuerza con una restricción o disparador sobre el supervisor del empleado, en la línea del que ya impone "un solo nivel".
- **Alta de administradores.** Una función de la base, solo para el general, crea la cuenta de acceso con nombre y correo y la fila de administrador, y rechaza un correo que ya sea de un empleado. Es análoga a la de dar de alta a un empleado.
- **Pantalla.** `/admin` conserva su forma. El filtro de empresa del administrador de empresa queda fijo en la suya. Se agrega una sección, solo visible para el general, para listar y dar de alta administradores. La navegación del de empresa omite el calendario editable y la gestión de administradores.
- **Auditoría previa.** Antes de aplicar la restricción, un chequeo lista los vínculos supervisor-empleado entre empresas; deben corregirse o aceptarse a mano.
- **Módulos profundos.** (1) La regla de alcance en el dominio puro: dado un actor (general o de empresa X) y un objetivo, ¿puede ver o actuar?, sin tocar la base. (2) Las funciones de la base que la aplican, que se prueban en `pruebas/`.

## Testing Decisions

- Una buena prueba verifica comportamiento externo (qué ve y qué rechaza la base para cada rol), no cómo está escrita la política.
- Se prueba la regla de alcance del dominio con pruebas unitarias, y los invariantes INV-54 a INV-61 contra la base real con sesiones de general, de empresa, de supervisor y de empleado.
- Prior art: `pruebas/src/inv-25-supervisor.test.ts`, `inv-20-intromision.test.ts` y el arnés de `pruebas/src/entorno.ts`.

## Out of Scope

- **Quitar a un administrador.** Cuando entre, debe impedir quitar al último general y quitarse a uno mismo.
- Un administrador que sea también empleado con la misma cuenta: se usan dos correos.
- Que el administrador de empresa cree o cambie administradores.
- Una pantalla propia de comparación entre empresas para el general.
- Montos y bonos nuevos: no cambian las reglas de ADR 0010, 0015 ni 0016.

## Further Notes

- El supervisor ya está acotado a su equipo; esta reforma agrega que su equipo es de su empresa.
- Quien cambia de empresa lleva su historial a la nueva (glosario): el administrador de la anterior deja de verlo.
