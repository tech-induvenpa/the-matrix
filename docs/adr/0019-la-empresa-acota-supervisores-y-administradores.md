# La empresa acota a supervisores y administradores de empresa

> Cambia el ADR 0004 (la base decide quien ve que) y revierte la parte del
> glosario que decia que la empresa "no limita nada".

Hasta aqui la empresa solo agrupaba: el administrador era uno y lo veia todo,
y se supervisaba y traspasaba entre empresas. Al entrar mas de un administrador
(uno por empresa) eso deja de servir. Decidimos que **la empresa es un limite de
seguridad**: el administrador de empresa y el supervisor solo ven y gestionan
gente y tareas de su empresa. Solo el administrador del grupo cruza empresas.

Como en el ADR 0004, lo aplica Postgres con seguridad por fila, sobre
`empleado.empresa_id`, no el codigo de la aplicacion. Se descarto filtrar en la
aplicacion: una consulta que olvide el filtro expondria otra empresa.

## Consequences

- `administrador` gana una empresa opcional: nula es el del grupo (ve todo),
  con valor es el de empresa. `es_administrador()` se divide en el del grupo y
  el de empresa; las politicas "el administrador ve ..." filtran por empresa.
- **Traspaso y cambio de empresa** se validan en la base: el destino debe ser de
  la empresa de quien actua. Cruzar empresas (traspasar, cambiar de empresa) es
  solo del administrador del grupo.
- **El supervisor es siempre de la misma empresa que su gente, para todos**,
  tambien para el general: se descarto dejarle el cruce al general, porque
  convertia el limite en una excepcion permanente. Cambiar de empresa a quien
  tiene supervisor o gente a cargo de la anterior se rechaza hasta soltarlos.
- **El calendario y el cierre del mes son del grupo** y solo los toca el administrador general (el cierre se mantiene general: cierra a todas las empresas a la vez).
- **Vinculos cruzados que ya existen** (supervisor de otra empresa) hay que
  auditarlos antes de la migracion: la restriccion nueva no los admite.
- Quien cambia de empresa lleva su historial a la nueva (glosario): el
  administrador de la anterior deja de verlo.
- **Solo el administrador del grupo da de alta administradores**, generales o
  de empresa, desde la aplicacion. Antes era un acto del `service_role` (migracion
  0006). Se descarto que el de empresa cree a otros de su empresa: un
  administrador se multiplicaria sin que el del grupo lo sepa, y dar acceso es
  una decision, no un efecto secundario (ADR 0004).
- **Quitar a un administrador queda fuera por ahora.** Cuando entre, hay que
  impedir que se quite al ultimo general y que alguien se quite a si mismo.
- **Un administrador no es un empleado:** se da de alta con nombre y correo,
  entra con un enlace al correo (ADR 0004) y no tiene funciones. Quien haga las
  dos cosas usa dos correos.
