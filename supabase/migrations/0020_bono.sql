-- El bono (CEB-147, ADR 0010): la parte variable de lo que gana alguien, la
-- que el cumplimiento mueve y la ponderacion reparte. Es el unico monto que el
-- sistema conoce; el sueldo base no tiene columna ni tabla, y no la va a tener.
--
-- Es un historial: cada fila rige desde el primer dia de un mes y se mantiene
-- hasta la siguiente. Una fila que ya rige no se toca nunca, asi que lo que se
-- pago un mes siempre se puede reconstruir.

create table bono (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleado (id) on delete cascade,
  -- Siempre en dolares, para todos.
  monto numeric(12, 2) not null check (monto >= 0),
  rige_desde date not null check (extract(day from rige_desde) = 1),
  -- Nulo cuando se cargo fuera de la aplicacion (la carga inicial por script,
  -- con la llave de servicio): no hay sesion de la que tomar quien.
  fijado_por uuid default auth.uid() references auth.users (id),
  fijado_en timestamptz not null default now(),
  unique (empleado_id, rige_desde)
);

alter table bono enable row level security;

create policy "cada quien ve su bono"
  on bono for select to authenticated
  using (soy(empleado_id));

create policy "el administrador ve todos los bonos"
  on bono for select to authenticated
  using (es_administrador());

-- Supabase concede todo por defecto (se aprendio en 0018). Nadie escribe aqui
-- directo, ni el administrador: fijar un bono pasa por la funcion de abajo,
-- que es la que decide desde cuando rige (INV-23, INV-24).
revoke all on bono from anon, authenticated;
grant select on bono to authenticated;
grant select, insert, update, delete on bono to service_role;

-- Un cambio rige siempre desde el mes siguiente: nunca parte un mes ni
-- reescribe uno que ya empezo. Lo calcula la base y no quien llama, asi que
-- nadie puede fijar un bono con fecha pasada. Un segundo cambio en el mismo mes
-- reemplaza al pendiente, que todavia no rige.
-- ponytail: el mes se toma en UTC, igual que `hoy` en toda la aplicacion.
create function fijar_bono(el_empleado uuid, el_monto numeric) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  siguiente date := (date_trunc('month', now() at time zone 'UTC') + interval '1 month')::date;
begin
  if not es_administrador() then
    raise exception 'Solo el administrador fija un bono' using errcode = 'insufficient_privilege';
  end if;

  insert into bono (empleado_id, monto, rige_desde)
  values (el_empleado, el_monto, siguiente)
  on conflict (empleado_id, rige_desde)
  do update set monto = excluded.monto, fijado_por = auth.uid(), fijado_en = now();
end;
$$;

revoke execute on function fijar_bono(uuid, numeric) from anon, public;
grant execute on function fijar_bono(uuid, numeric) to authenticated;
