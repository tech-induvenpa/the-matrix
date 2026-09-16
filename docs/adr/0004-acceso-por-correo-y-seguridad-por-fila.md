# La base decide quien ve que, y la importacion nunca da acceso

El documento identifica a cada persona por un nombre de pila en un bloque
combinado: sin correo, sin apellido en cinco de nueve, y con dos Marias. La regla
mas dura del producto es que un empleado nunca ve una funcion ajena.

Una tabla de empleados, mantenida por el responsable tecnico, guarda por persona
el nombre exacto de su bloque y su correo propio. Se entra con un enlace al correo,
sin contraseñas. La importacion asocia cada bloque por coincidencia exacta del
nombre normalizado, nunca aproximada, y **nunca crea un empleado**: un bloque
desconocido no se importa y se lista. Dar acceso a alguien es una decision, no el
efecto de que JFS escriba un bloque nuevo. Un bloque renombrado se resuelve como
una funcion re-redactada: la importacion pregunta si es la misma persona.

El filtro por persona lo aplica Postgres con seguridad por fila, no el codigo de
la aplicacion. Una consulta que olvide filtrar sigue sin devolver nada ajeno.

## Consecuencias

- Cada correo pertenece a una sola persona. Un buzon compartido rompe la regla.
- El filtro solo protege si las consultas de un empleado llegan a Postgres con su
  identidad. Con la sesion en cookies de Next eso sale de fabrica; cualquier otra
  forma obliga a reenviar el token a mano (ADR 0005).
- Descartamos usuario y contraseña: obliga a administrar contraseñas, a
  restablecerlas a mano y a una pantalla para cambiarlas.
- La identidad de una funcion usa el id del empleado, no su nombre, asi que
  renombrar un bloque no deja nada huerfano.
