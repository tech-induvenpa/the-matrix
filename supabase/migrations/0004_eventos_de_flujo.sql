-- Los flujos no se marcan: tienen estado, y el vigente es el ultimo evento
-- (CEB-110). Los anteriores no se borran: son el historial que lee JFS.

create table evento_flujo (
  id uuid primary key default gen_random_uuid(),
  funcion_id uuid not null references funcion (id) on delete cascade,
  estado text not null check (estado in ('al_dia', 'atrasado')),
  razon text,
  en timestamptz not null default now(),
  -- Nadie se declara atrasado sin decir por que.
  constraint razon_obligatoria_al_atrasarse
    check (estado = 'al_dia' or (razon is not null and length(btrim(razon)) > 0))
);

create index evento_flujo_funcion_idx on evento_flujo (funcion_id, en desc);

alter table evento_flujo enable row level security;

create policy "cada quien ve el estado de sus flujos"
  on evento_flujo for select to authenticated
  using (exists (
    select 1 from funcion f
    join empleado e on e.id = f.empleado_id
    where f.id = evento_flujo.funcion_id and e.auth_user_id = (select auth.uid())
  ));

create policy "cada quien cambia el estado de sus flujos"
  on evento_flujo for insert to authenticated
  with check (exists (
    select 1 from funcion f
    join empleado e on e.id = f.empleado_id
    where f.id = evento_flujo.funcion_id and e.auth_user_id = (select auth.uid())
  ));

grant select, insert on evento_flujo to authenticated;
grant select, insert, update, delete on evento_flujo to service_role;
