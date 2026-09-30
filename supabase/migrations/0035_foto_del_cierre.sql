-- La foto del cierre (CEB-237, ADR 0017): la nomina de cada persona tal como
-- quedo al cierre del mes -- sus partes, sus pesos, sus descuentos, su total y
-- su empresa --, con los pesos del dia del cierre. Un mes cerrado se lee de su
-- foto y nunca se recalcula. Reabrir descarta la foto del mes; al volver a
-- cerrarse se toma otra.
--
-- La nomina la cuenta el dominio (nomina.ts), igual que la descarga: aqui no
-- se repite esa cuenta. La pantalla del administrador la calcula y la entrega
-- en tomar_foto_del_cierre, como los totales al reabrir (0034). Lo que la base
-- asegura es el cuando: sin un proceso a las 23:59, porque despues del cierre
-- nada de ese mes se mueve hasta que alguien cambia un peso, un bono o una
-- empresa, o reabre. Todo eso se rechaza mientras un mes cerrado no tenga su
-- foto, asi que la foto sale igual que a las 23:59.

create table foto_del_cierre (
  mes text not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  empleado_id uuid not null references empleado (id) on delete cascade,
  -- La de la persona al cierre: la nomina, como el bono, nunca parte un mes.
  empresa_id uuid references empresa (id),
  -- Sin bono ese mes no hay nomina: la persona sale con sus partes y nada mas.
  bono numeric(12, 2),
  total numeric(12, 2),
  -- Todas las partes, cumplidas o no: [{ funcionId, parte, tipo, ponderacion,
  -- sinCumplir, veces, descuento }], como FotoDelCierre en el dominio.
  partes jsonb not null check (jsonb_typeof(partes) = 'array'),
  tomada_en timestamptz not null default ahora(),
  tomada_por uuid default auth.uid() references auth.users (id),
  primary key (mes, empleado_id),
  constraint total_con_bono check ((bono is null) = (total is null))
);

-- Es dinero de cada persona: cada quien lee la suya y el administrador todas
-- (INV-3). El supervisor, ninguna. Nadie la escribe directamente: solo
-- tomar_foto_del_cierre, y reabrir_mes la descarta.
alter table foto_del_cierre enable row level security;

create policy "cada quien ve su foto del cierre"
  on foto_del_cierre for select to authenticated
  using (soy(empleado_id));

create policy "el administrador ve todas las fotos del cierre"
  on foto_del_cierre for select to authenticated
  using (es_administrador());

revoke all on foto_del_cierre from anon, authenticated;
grant select on foto_del_cierre to authenticated;
grant select, insert, update, delete on foto_del_cierre to service_role;

-- Los meses cerrados que todavia no tienen foto y la necesitan. Desde el del
-- primer bono: antes no hay nada que pagar, y un mes sin nomina no necesita
-- foto. Un mes reabierto no esta cerrado, asi que no entra hasta que se cierre.
create function meses_sin_foto() returns setof text
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select m.mes
  from generate_series(
    (select min(rige_desde) from bono),
    date_trunc('month', ahora() at time zone 'America/Caracas'),
    interval '1 month'
  ) g
  cross join lateral (select to_char(g, 'YYYY-MM') as mes) m
  where mes_cerrado(m.mes)
    and not exists (select 1 from foto_del_cierre f where f.mes = m.mes)
  order by m.mes;
$$;

-- La foto de un mes cerrado, una fila por persona: `fotos` es
-- [{ empleado_id, empresa_id, bono, total, partes }]. Solo el administrador la
-- toma, y una sola vez: si el mes ya tiene foto, no se toca (devuelve false).
create function tomar_foto_del_cierre(el_mes text, fotos jsonb) returns boolean
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if not es_administrador() then
    raise exception 'Solo el administrador toma la foto del cierre' using errcode = 'insufficient_privilege';
  end if;
  if not mes_cerrado(el_mes) then
    raise exception 'Ese mes no está cerrado' using errcode = 'check_violation';
  end if;

  -- Dos pantallas a la vez no toman dos fotos del mismo mes.
  perform pg_advisory_xact_lock(hashtext('foto_del_cierre:' || el_mes));
  if exists (select 1 from foto_del_cierre where mes = el_mes) then
    return false;
  end if;

  insert into foto_del_cierre (mes, empleado_id, empresa_id, bono, total, partes)
  select el_mes, f.empleado_id, f.empresa_id, f.bono, f.total, f.partes
  from jsonb_to_recordset(coalesce(fotos, '[]')) as f(empleado_id uuid, empresa_id uuid, bono numeric, total numeric, partes jsonb);
  return true;
end;
$$;

-- Lo que moveria la nomina de un mes cerrado se rechaza mientras le falte su
-- foto. Como rechazar_si_cerro (0032), solo frena a quien tiene una sesion: la
-- llave de servicio siembra y migra, y lo que llega en cascada no es alguien
-- cambiando un peso.
create function exigir_la_foto() returns void
  language plpgsql
  stable
  security definer
  set search_path = public, pg_temp
as $$
declare
  falta text;
begin
  if coalesce((select auth.role()), '') <> 'authenticated' or pg_trigger_depth() > 1 then
    return;
  end if;
  select m into falta from meses_sin_foto() m limit 1;
  if falta is not null then
    raise exception 'Falta la foto del cierre de %', falta using errcode = 'check_violation', hint = 'sin_foto';
  end if;
end;
$$;

-- Un peso publicado: dar de alta, cambiar, archivar, eliminar o traspasar una
-- funcion, o ajustar la cotidianidad. El borrador no mueve nada.
create function titularidad_con_foto() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if (tg_op <> 'DELETE' and new.publicado_en is not null) or (tg_op <> 'INSERT' and old.publicado_en is not null) then
    perform exigir_la_foto();
  end if;
  return coalesce(new, old);
end;
$$;

create trigger titularidad_con_foto
  before insert or update or delete on titularidad
  for each row execute function titularidad_con_foto();

create function con_foto() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  perform exigir_la_foto();
  return coalesce(new, old);
end;
$$;

-- Un bono.
create trigger bono_con_foto
  before insert or update or delete on bono
  for each row execute function con_foto();

-- La empresa de alguien.
create trigger empresa_con_foto
  before update of empresa_id on empleado
  for each row
  when (old.empresa_id is distinct from new.empresa_id)
  execute function con_foto();

-- Reabrir: la foto se toma antes, de ella salen los totales de antes (CEB-232)
-- y se descarta en el mismo acto. `totales` ya no se usa: queda para no romper
-- a quien la llame con los tres argumentos.
create or replace function reabrir_mes(el_mes text, la_razon text, totales jsonb default '[]') returns uuid
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
  perform exigir_la_foto();

  insert into reapertura (mes, razon) values (el_mes, btrim(la_razon)) returning id into nueva;
  insert into total_al_reabrir (reapertura_id, empleado_id, total)
  select nueva, f.empleado_id, f.total
  from foto_del_cierre f
  where f.mes = el_mes and f.total is not null;
  delete from foto_del_cierre where mes = el_mes;
  return nueva;
end;
$$;

revoke execute on function exigir_la_foto() from anon, authenticated, public;
grant execute on function meses_sin_foto(), tomar_foto_del_cierre(text, jsonb) to authenticated;
