-- Que no haya feriados cargados hacia adelante no significa que el calendario
-- cubra: significa que nadie sabe. La cobertura es un dato explicito que JFS
-- actualiza, no algo que se deduzca de la ausencia de filas (CEB-115).

create table calendario (
  id boolean primary key default true check (id),
  cargado_hasta date not null
);

alter table calendario enable row level security;

create policy "la cobertura la lee cualquiera con sesion"
  on calendario for select to authenticated
  using (true);

grant select on calendario to authenticated;
grant select, insert, update, delete on calendario to service_role;

insert into calendario (cargado_hasta) values ('2026-12-31');
