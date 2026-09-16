-- El proyecto no expone tablas nuevas de forma automatica, asi que ningun rol
-- recibe privilegios por su cuenta: service_role tampoco. Los necesita la
-- importacion y la proyeccion de razones (CEB-111, CEB-116). Saltarse la
-- seguridad por fila no es lo mismo que tener permiso sobre la tabla.

grant usage on schema public to service_role;
grant select, insert, update, delete on empleado, funcion, dia_no_habil to service_role;
