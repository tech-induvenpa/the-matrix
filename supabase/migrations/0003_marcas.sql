-- Registro de ejecucion (CEB-108). Una marca cierra una ocurrencia, y una
-- ocurrencia se identifica por (funcion, periodo): no hay tabla de ocurrencias,
-- se calculan.

create table marca (
  id uuid primary key default gen_random_uuid(),
  funcion_id uuid not null references funcion (id) on delete cascade,
  periodo text not null,
  resultado text not null check (resultado in ('hecho', 'no_pude')),
  razon text,
  marcada_en timestamptz not null default now(),
  unique (funcion_id, periodo),
  -- No se puede decir "no pude" sin decir por que.
  constraint razon_obligatoria_al_no_poder
    check (resultado = 'hecho' or (razon is not null and length(btrim(razon)) > 0))
);

create index marca_funcion_idx on marca (funcion_id);

alter table marca enable row level security;

create policy "cada quien ve sus marcas"
  on marca for select to authenticated
  using (exists (
    select 1 from funcion f
    join empleado e on e.id = f.empleado_id
    where f.id = marca.funcion_id and e.auth_user_id = (select auth.uid())
  ));

create policy "cada quien marca lo suyo"
  on marca for insert to authenticated
  with check (exists (
    select 1 from funcion f
    join empleado e on e.id = f.empleado_id
    where f.id = marca.funcion_id and e.auth_user_id = (select auth.uid())
  ));

create policy "cada quien deshace lo suyo"
  on marca for delete to authenticated
  using (exists (
    select 1 from funcion f
    join empleado e on e.id = f.empleado_id
    where f.id = marca.funcion_id and e.auth_user_id = (select auth.uid())
  ));

grant select, insert, delete on marca to authenticated;
grant select, insert, update, delete on marca to service_role;
