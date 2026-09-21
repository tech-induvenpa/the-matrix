-- Quien asigna: reparte las funciones, las pondera, las puntua y mantiene el
-- calendario. Hoy es una sola persona y lo ve todo (CEB-129, ADR 0006).
--
-- No es un empleado con un permiso extra: es otro rol. Por eso vive en su
-- propia tabla y no como columna de `empleado`.
--
-- La base sigue decidiendo quien ve que (ADR 0004). La llave de servicio no
-- entra al servidor web: hoy solo vive en scripts que corre una persona, y
-- meterla en una ruta HTTP cambiaria el peor caso del sistema de "se expone lo
-- de quien este conectado" a "se expone todo".

create table administrador (
  auth_user_id uuid primary key references auth.users (id) on delete cascade
);

alter table administrador enable row level security;

-- Sin politicas de lectura ni de escritura: nadie toca esta tabla con un token
-- de sesion. Dar de alta a un administrador es un acto deliberado del
-- service_role, igual que dar acceso a un empleado nunca es un efecto
-- secundario de importar (ADR 0004).
grant select, insert, update, delete on administrador to service_role;

-- security definer para que la propia consulta no choque con la seguridad por
-- fila de `administrador`: sin esto, una politica que pregunta por esta tabla
-- se llama a si misma.
create function es_administrador() returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (select 1 from administrador where auth_user_id = (select auth.uid()));
$$;

grant execute on function es_administrador() to authenticated;

-- Las politicas se suman a las que ya hay, no las reemplazan: lo de cada quien
-- se sigue viendo por la politica de siempre, y el administrador ve todo por
-- estas. Un fallo aqui no puede abrirle nada a un empleado.
create policy "el administrador ve a todos"
  on empleado for select to authenticated
  using (es_administrador());

create policy "el administrador ve todas las funciones"
  on funcion for select to authenticated
  using (es_administrador());

create policy "el administrador ve todas las marcas"
  on marca for select to authenticated
  using (es_administrador());

create policy "el administrador ve todos los eventos de flujo"
  on evento_flujo for select to authenticated
  using (es_administrador());
