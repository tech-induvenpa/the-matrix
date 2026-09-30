-- Las reaperturas se ven en la nomina (CEB-232): que cambio, como el total de
-- cada persona antes y despues. El de despues se calcula; el de antes hay que
-- guardarlo al reabrir, porque reabierto el mes se mueve. Lo calcula la
-- pantalla del administrador con el mismo dominio que la nomina y lo entrega
-- aqui, en el mismo acto de reabrir.
--
-- Es dinero de cada persona: va en su propia tabla y no en `reapertura`, que
-- leen todos. Cada quien lee el suyo y el administrador todos (INV-1, INV-3).

create table total_al_reabrir (
  reapertura_id uuid not null references reapertura (id) on delete cascade,
  empleado_id uuid not null references empleado (id) on delete cascade,
  total numeric(12, 2) not null,
  primary key (reapertura_id, empleado_id)
);

alter table total_al_reabrir enable row level security;

create policy "cada quien ve su total al reabrir"
  on total_al_reabrir for select to authenticated
  using (soy(empleado_id));

create policy "el administrador ve todos los totales al reabrir"
  on total_al_reabrir for select to authenticated
  using (es_administrador());

revoke all on total_al_reabrir from anon, authenticated;
grant select on total_al_reabrir to authenticated;
grant select, insert, update, delete on total_al_reabrir to service_role;

drop function reabrir_mes(text, text);

-- `totales`: [{ "empleado_id": ..., "total": ... }], uno por persona con bono.
create function reabrir_mes(el_mes text, la_razon text, totales jsonb default '[]') returns uuid
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  nueva uuid;
begin
  if not es_administrador() then
    raise exception 'Solo el administrador reabre un mes' using errcode = 'insufficient_privilege';
  end if;
  if length(btrim(coalesce(la_razon, ''))) = 0 then
    raise exception 'Reabrir un mes pide una razón' using errcode = 'check_violation';
  end if;
  if not mes_cerrado(el_mes) then
    raise exception 'Ese mes no está cerrado' using errcode = 'check_violation';
  end if;

  insert into reapertura (mes, razon) values (el_mes, btrim(la_razon)) returning id into nueva;
  insert into total_al_reabrir (reapertura_id, empleado_id, total)
  select nueva, t.empleado_id, t.total
  from jsonb_to_recordset(coalesce(totales, '[]')) as t(empleado_id uuid, total numeric);
  return nueva;
end;
$$;

grant execute on function reabrir_mes(text, text, jsonb) to authenticated;
