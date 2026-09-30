-- El administrador reabre y cierra un mes (CEB-229, ADR 0016). Solo el, y
-- siempre con una razon. Se reabre para todos: el mes vuelve al uso normal.
-- Se vuelve a cerrar cuando el lo cierra o, si se le olvida, solo, a las
-- veinticuatro horas: sin un proceso, porque un mes reabierto hace mas de un
-- dia se lee como cerrado. Es la misma regla que `estadoDelMes` en el dominio.

create table reapertura (
  id uuid primary key default gen_random_uuid(),
  mes text not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  razon text not null check (length(btrim(razon)) > 0),
  quien uuid not null default auth.uid() references auth.users (id),
  en timestamptz not null default ahora(),
  -- A mano. Si queda vacia, se cerro sola a las veinticuatro horas de `en`.
  cerrada_en timestamptz,
  cerrada_por uuid references auth.users (id),
  constraint cerrada_con_traza check ((cerrada_en is null) = (cerrada_por is null))
);

create index reapertura_mes_idx on reapertura (mes, en);

-- Todos la leen: se reabre para todos, y cada quien la ve en su nomina. Nadie
-- la escribe directamente: solo por las funciones de abajo.
alter table reapertura enable row level security;

create policy "todos ven las reaperturas"
  on reapertura for select to authenticated
  using (true);

revoke all on reapertura from anon, authenticated;
grant select on reapertura to authenticated;
grant select, insert, update, delete on reapertura to service_role;

-- La reapertura vigente de un mes: la que no se cerro a mano ni cumplio un dia.
create function reapertura_vigente(el_mes text) returns reapertura
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select * from reapertura r
  where r.mes = el_mes
    and r.en <= ahora()
    and r.cerrada_en is null
    and ahora() < r.en + interval '24 hours'
  order by r.en desc
  limit 1;
$$;

create or replace function mes_cerrado(el_mes text) returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select ahora() >= cierre_del_mes(el_mes) and (reapertura_vigente(el_mes)).id is null;
$$;

create function reabrir_mes(el_mes text, la_razon text) returns uuid
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
  return nueva;
end;
$$;

create function cerrar_mes(el_mes text) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if not es_administrador() then
    raise exception 'Solo el administrador cierra un mes' using errcode = 'insufficient_privilege';
  end if;

  update reapertura set cerrada_en = ahora(), cerrada_por = auth.uid()
  where id = (reapertura_vigente(el_mes)).id;

  if not found then
    raise exception 'Ese mes no está reabierto' using errcode = 'check_violation';
  end if;
end;
$$;

revoke execute on function reapertura_vigente(text) from anon, authenticated, public;
grant execute on function reabrir_mes(text, text), cerrar_mes(text) to authenticated;
