-- La marca tardia (CEB-273, ADR 0020): la marca que se pone despues del cierre
-- del mes de su tarea. Vive en su propia tabla, aparte de `marca`, a proposito:
-- todo lo que cuenta un mes (la foto del cierre, la nomina, el cumplimiento, el
-- arrastre, la descarga) lee `marca` y nunca la ve, asi que una marca tardia no
-- puede mover el mes ni por descuido. Quien la quiere ver (el asterisco, la
-- columna de la descarga) la lee de aqui.
--
-- Una tarea tiene a lo sumo una marca a tiempo (`marca`, o el resultado del
-- imprevisto) y a lo sumo una tardia, y solo se pone tardia a lo que seguia sin
-- marca: eso lo asegura la funcion que la escribe, no esta tabla.
create table marca_tardia (
  id uuid primary key default gen_random_uuid(),
  funcion_id uuid references funcion (id) on delete cascade,
  periodo text,
  imprevisto_id uuid references imprevisto (id) on delete cascade,
  resultado text not null check (resultado in ('hecho', 'no_pude')),
  razon text,
  -- Cuando se marco de verdad; es lo que dice la columna de la descarga.
  marcada_en timestamptz not null default ahora(),
  -- Una ocurrencia (funcion y periodo) o un imprevisto, nunca las dos cosas.
  constraint de_una_sola_tarea check (
    (funcion_id is not null and periodo is not null and imprevisto_id is null)
    or (funcion_id is null and periodo is null and imprevisto_id is not null)
  ),
  -- No se puede decir "no pude" sin decir por que, como en `marca`.
  constraint razon_obligatoria_al_no_poder
    check (resultado = 'hecho' or (razon is not null and length(btrim(razon)) > 0))
);

create unique index marca_tardia_ocurrencia_idx on marca_tardia (funcion_id, periodo) where funcion_id is not null;
create unique index marca_tardia_imprevisto_idx on marca_tardia (imprevisto_id) where imprevisto_id is not null;

-- Cada quien lee las suyas y el administrador todas, como las marcas. Nadie
-- escribe directamente: solo las funciones que llegan con la marca (CEB-275).
alter table marca_tardia enable row level security;

create policy "cada quien ve sus marcas tardias"
  on marca_tardia for select to authenticated
  using (
    (funcion_id is not null and es_mia(funcion_id))
    or (imprevisto_id is not null and exists (select 1 from imprevisto i where i.id = imprevisto_id and soy(i.empleado_id)))
  );

create policy "el administrador ve todas las marcas tardias"
  on marca_tardia for select to authenticated
  using (es_administrador());

revoke all on marca_tardia from anon, authenticated;
grant select on marca_tardia to authenticated;
grant select, insert, update, delete on marca_tardia to service_role;
