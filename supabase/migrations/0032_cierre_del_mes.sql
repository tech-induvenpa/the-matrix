-- El cierre del mes (CEB-228, ADR 0016): a las 23:59, hora de Caracas, del
-- ultimo dia habil de un mes, ese mes deja de moverse. Es la misma regla que
-- `estadoDelMes` en el dominio (cierre-del-mes.ts); aqui vive para que no
-- dependa de que la pantalla la aplique bien. Desde ese instante la base
-- rechaza marcar y deshacer una ocurrencia que vence en ese mes, marcar un
-- imprevisto que vence en el, devolver una delegacion de ese mes y declarar el
-- estado de un flujo con fecha en el.

-- ── El reloj ─────────────────────────────────────────────────────────────
--
-- Todo lo que depende de "ahora" pregunta aqui, no a now(). En produccion la
-- tabla esta vacia y es now(). Las pruebas de trazador fijan un instante con
-- la llave de servicio para probar el minuto antes y el minuto despues sin
-- esperar a fin de mes (INV-43, INV-44). Nadie con una sesion la lee ni la
-- escribe: no tiene politicas.
create table reloj (
  unico boolean primary key default true check (unico),
  instante timestamptz not null
);

alter table reloj enable row level security;
revoke all on reloj from anon, authenticated;
grant select, insert, update, delete on reloj to service_role;

create function ahora() returns timestamptz
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select coalesce((select instante from reloj), now());
$$;

-- ── El instante del cierre ───────────────────────────────────────────────

-- El mismo calculo que Calendario.habilAnterior desde el ultimo dia del mes.
-- ponytail: busca en los sesenta dias anteriores, como habil_siguiente.
create function ultimo_habil_del_mes(el_mes text) returns date
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  with fin as (select ((el_mes || '-01')::date + interval '1 month' - interval '1 day')::date as d)
  select max(g)::date
  from fin, generate_series(fin.d - 60, fin.d, interval '1 day') g
  where extract(isodow from g) < 6
    and not exists (select 1 from dia_no_habil n where g::date between n.desde and n.hasta);
$$;

-- La zona va por nombre: el servidor de la base corre en UTC.
create function cierre_del_mes(el_mes text) returns timestamptz
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select (ultimo_habil_del_mes(el_mes) + time '23:59') at time zone 'America/Caracas';
$$;

create function mes_cerrado(el_mes text) returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select ahora() >= cierre_del_mes(el_mes);
$$;

grant execute on function ahora(), ultimo_habil_del_mes(text), cierre_del_mes(text), mes_cerrado(text) to authenticated;

-- El rechazo dice que mes cerro, en palabras: la pantalla lo muestra tal cual
-- y reconoce el caso por la pista.
-- Solo frena a quien tiene una sesion: la llave de servicio siembra y migra
-- (ver 0029), y lo que llega en cascada -- eliminar una funcion borra sus
-- marcas, un feriado nuevo corre un vencimiento -- no es alguien moviendo un mes.
create function rechazar_si_cerro(el_mes text) returns void
  language plpgsql
  stable
  security definer
  set search_path = public, pg_temp
as $$
begin
  if coalesce((select auth.role()), '') <> 'authenticated' or pg_trigger_depth() > 1 then
    return;
  end if;
  if mes_cerrado(el_mes) then
    raise exception '% ya cerró',
      (array['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'])[right(el_mes, 2)::int]
      using errcode = 'check_violation', hint = 'mes_cerrado';
  end if;
end;
$$;

-- El mes en que vence una ocurrencia. Su vencimiento nunca sale de su periodo
-- (ocurrencias.ts), y todos los periodos caben en un mes salvo la semana: esa
-- vence en su ultimo dia habil, que puede caer en cualquiera de los dos. El dia
-- tope solo adelanta dentro del mismo mes.
create function mes_de_la_ocurrencia(la_periodicidad text, el_periodo text) returns text
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select to_char(
    case when la_periodicidad = 'semanal' then coalesce(
      (select max(g)::date
       from generate_series(el_periodo::date, el_periodo::date + 6, interval '1 day') g
       where extract(isodow from g) < 6
         and not exists (select 1 from dia_no_habil n where g::date between n.desde and n.hasta)),
      el_periodo::date + 6)
    else fin_del_periodo(la_periodicidad, el_periodo) end,
    'YYYY-MM');
$$;

-- ── Lo que mueve un mes ──────────────────────────────────────────────────

-- Marcar, deshacer o cambiar la marca de una ocurrencia.
create function marca_en_mes_abierto() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  m marca := coalesce(new, old);
begin
  perform rechazar_si_cerro(mes_de_la_ocurrencia(f.periodicidad, m.periodo)) from funcion f where f.id = m.funcion_id;
  if tg_op = 'UPDATE' and (old.funcion_id, old.periodo) is distinct from (new.funcion_id, new.periodo) then
    perform rechazar_si_cerro(mes_de_la_ocurrencia(f.periodicidad, old.periodo)) from funcion f where f.id = old.funcion_id;
  end if;
  return m;
end;
$$;

create trigger marca_en_mes_abierto
  before insert or update or delete on marca
  for each row execute function marca_en_mes_abierto();

-- Declarar el estado de un flujo. La fecha de un evento es su dia en UTC, el
-- mismo que toma la descarga (atrasosDelFlujo). Lo que se declara sin fecha
-- se declara ahora, segun el reloj.
alter table evento_flujo alter column en set default ahora();

create function evento_flujo_en_mes_abierto() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  perform rechazar_si_cerro(to_char(new.en at time zone 'UTC', 'YYYY-MM'));
  return new;
end;
$$;

create trigger evento_flujo_en_mes_abierto
  before insert on evento_flujo
  for each row execute function evento_flujo_en_mes_abierto();

-- Un imprevisto es del mes en que vence. Marcarlo, deshacer su marca,
-- devolverlo o borrarlo mueve ese mes; registrar uno que vence en un mes
-- cerrado, tambien.
create function imprevisto_en_mes_abierto() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    perform rechazar_si_cerro(to_char(new.vence, 'YYYY-MM'));
  elsif (new.resultado, new.devuelto_en, new.borrado_en) is distinct from (old.resultado, old.devuelto_en, old.borrado_en) then
    perform rechazar_si_cerro(to_char(old.vence, 'YYYY-MM'));
  end if;
  return new;
end;
$$;

create trigger imprevisto_en_mes_abierto
  before insert or update on imprevisto
  for each row execute function imprevisto_en_mes_abierto();
