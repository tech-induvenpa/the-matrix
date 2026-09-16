-- Esquema minimo de la rebanada CEB-107.
-- El sueldo no existe aqui: MONTO y ASIGNACION no se importan (ADR 0001).

create table empleado (
  id uuid primary key default gen_random_uuid(),
  nombre_bloque text not null unique,
  correo text not null unique,
  auth_user_id uuid unique references auth.users (id) on delete set null
);

create table funcion (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleado (id) on delete cascade,
  hash_identidad text not null unique,
  texto text not null,
  ponderacion int not null check (ponderacion between 0 and 100),
  importancia int not null check (importancia between 0 and 9),
  periodicidad text not null check (periodicidad in ('diaria', 'semanal', 'quincenal', 'mensual', 'trimestral')),
  tipo_generado text check (tipo_generado in ('entregable', 'flujo', 'area', 'holgura')),
  tipo_corregido text check (tipo_corregido in ('entregable', 'flujo', 'area', 'holgura')),
  dia_tope_generado int check (dia_tope_generado between 1 and 31),
  dia_tope_corregido int check (dia_tope_corregido between 1 and 31),
  fecha_alta date not null default current_date,
  activa boolean not null default true
);

create index funcion_empleado_idx on funcion (empleado_id);

create table dia_no_habil (
  id uuid primary key default gen_random_uuid(),
  desde date not null,
  hasta date not null,
  descripcion text,
  check (hasta >= desde)
);

-- Cerrado por defecto: sin politica, una tabla con RLS no devuelve nada.
alter table empleado enable row level security;
alter table funcion enable row level security;
alter table dia_no_habil enable row level security;

create policy "cada quien se ve a si mismo"
  on empleado for select to authenticated
  using (auth_user_id = (select auth.uid()));

create policy "cada quien ve solo sus funciones"
  on funcion for select to authenticated
  using (exists (
    select 1 from empleado e
    where e.id = funcion.empleado_id and e.auth_user_id = (select auth.uid())
  ));

-- El calendario de la empresa no es de nadie en particular.
create policy "el calendario lo lee cualquiera con sesion"
  on dia_no_habil for select to authenticated
  using (true);

-- El proyecto no expone tablas nuevas de forma automatica: se concede a mano.
grant usage on schema public to authenticated;
grant select on empleado, funcion, dia_no_habil to authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on empleado, funcion, dia_no_habil to service_role;
