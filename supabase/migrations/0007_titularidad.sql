-- La funcion existe por si misma y no muere al cambiar de manos (CEB-130, ADR 0008).
--
-- Hasta aqui, la funcion pertenecia a un empleado por columna y pesaba por otra.
-- Las dos cosas venian del Excel, donde la fila era la persona y la funcion a la
-- vez. Pero el peso nunca describio el trabajo: describia la relacion entre ese
-- trabajo y alguien. La misma funcion puede ser el 10% del cargo de uno y el 25%
-- del de otra, porque tienen cargos distintos.
--
-- Asi que el titular y la ponderacion se mudan juntos al vinculo, que ademas
-- guarda desde cuando: eso es el historial de titulares, y es lo que permite
-- traspasar sin partir la historia de nadie.

create table titularidad (
  id uuid primary key default gen_random_uuid(),
  funcion_id uuid not null references funcion (id) on delete cascade,
  empleado_id uuid not null references empleado (id) on delete cascade,
  ponderacion int not null check (ponderacion between 0 and 100),
  desde date not null default current_date,
  hasta date
);

-- Una funcion tiene un titular a la vez. Lo vigente es lo que no ha terminado.
create unique index titularidad_vigente_idx on titularidad (funcion_id) where hasta is null;
create index titularidad_empleado_idx on titularidad (empleado_id) where hasta is null;

-- Lo que ya existe se muda tal cual: misma persona, mismo peso, desde su alta.
insert into titularidad (funcion_id, empleado_id, ponderacion, desde)
select id, empleado_id, ponderacion, fecha_alta from funcion;

drop policy "cada quien ve solo sus funciones" on funcion;
drop policy "cada quien ve sus marcas" on marca;
drop policy "cada quien marca lo suyo" on marca;
drop policy "cada quien deshace lo suyo" on marca;
drop policy "cada quien ve el estado de sus flujos" on evento_flujo;
drop policy "cada quien cambia el estado de sus flujos" on evento_flujo;

alter table funcion drop column empleado_id;
alter table funcion drop column ponderacion;

-- La regla "esta funcion es mia" estaba escrita seis veces en SQL, una por
-- politica. Vive aqui: cuando el traspaso llegue, cambia en un solo sitio.
-- security definer porque la propia consulta no puede chocar con la seguridad
-- por fila de las tablas que mira.
create function es_mia(funcion uuid) returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from titularidad t
    join empleado e on e.id = t.empleado_id
    where t.funcion_id = funcion
      and t.hasta is null
      and e.auth_user_id = (select auth.uid())
  );
$$;

grant execute on function es_mia(uuid) to authenticated;

alter table titularidad enable row level security;

create policy "cada quien ve sus titularidades"
  on titularidad for select to authenticated
  using (es_mia(funcion_id));

create policy "el administrador ve todas las titularidades"
  on titularidad for select to authenticated
  using (es_administrador());

grant select on titularidad to authenticated;
grant select, insert, update, delete on titularidad to service_role;

-- Las politicas dejan de mirar la columna que ya no existe.
create policy "cada quien ve solo sus funciones"
  on funcion for select to authenticated
  using (es_mia(id));

create policy "cada quien ve sus marcas"
  on marca for select to authenticated
  using (es_mia(funcion_id));

create policy "cada quien marca lo suyo"
  on marca for insert to authenticated
  with check (es_mia(funcion_id));

create policy "cada quien deshace lo suyo"
  on marca for delete to authenticated
  using (es_mia(funcion_id));

create policy "cada quien ve el estado de sus flujos"
  on evento_flujo for select to authenticated
  using (es_mia(funcion_id));

create policy "cada quien cambia el estado de sus flujos"
  on evento_flujo for insert to authenticated
  with check (es_mia(funcion_id));
