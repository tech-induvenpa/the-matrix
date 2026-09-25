-- Intromision (CEB-146): el vinculo que el empleado declara entre un
-- incumplimiento de lo previsto -- un "no pude" o un atraso de flujo -- y los
-- imprevistos que lo causaron. Es opcional, admite varios y no reemplaza a la
-- razon.
--
-- Solo vale con imprevistos pedidos antes de que venciera lo incumplido: un
-- imprevisto viejo no puede excusar cualquier cosa (regla 3, INV-20). Por eso
-- la marca y sus vinculos entran juntos, en una funcion, y no en dos llamadas
-- que podrian quedarse a medias.

create table intromision (
  id uuid primary key default gen_random_uuid(),
  imprevisto_id uuid not null references imprevisto (id) on delete cascade,
  -- Deshacer la marca se lleva sus vinculos: sin incumplimiento no hay
  -- intromision que declarar.
  marca_id uuid references marca (id) on delete cascade,
  evento_flujo_id uuid references evento_flujo (id) on delete cascade,
  constraint de_un_solo_incumplimiento check (num_nonnulls(marca_id, evento_flujo_id) = 1),
  unique (imprevisto_id, marca_id),
  unique (imprevisto_id, evento_flujo_id)
);

create index intromision_imprevisto_idx on intromision (imprevisto_id);

alter table intromision enable row level security;

create policy "cada quien ve sus intromisiones"
  on intromision for select to authenticated
  using (exists (select 1 from imprevisto i where i.id = imprevisto_id and soy(i.empleado_id)));

create policy "el administrador ve todas las intromisiones"
  on intromision for select to authenticated
  using (es_administrador());

-- Se escribe solo por las funciones de abajo, que aplican la regla 3.
revoke all on intromision from anon, authenticated;
grant select on intromision to authenticated;
grant select, insert, update, delete on intromision to service_role;

-- El ultimo dia del periodo de una ocurrencia, leido de su texto. Es el mismo
-- tramo que calcula el dominio en ocurrencias.ts.
create function fin_del_periodo(la_periodicidad text, el_periodo text) returns date
  language sql
  immutable
as $$
  select case la_periodicidad
    when 'diaria' then el_periodo::date
    when 'semanal' then el_periodo::date + 6
    when 'quincenal' then
      case when right(el_periodo, 2) = 'Q1'
        then (left(el_periodo, 7) || '-15')::date
        else ((left(el_periodo, 7) || '-01')::date + interval '1 month' - interval '1 day')::date
      end
    when 'mensual' then ((el_periodo || '-01')::date + interval '1 month' - interval '1 day')::date
    when 'trimestral' then
      (make_date(left(el_periodo, 4)::int, right(el_periodo, 1)::int * 3, 1) + interval '1 month' - interval '1 day')::date
  end;
$$;

-- Un imprevisto se puede vincular si es de quien tiene la sesion y no esta
-- borrado. El limite de tiempo lo pone quien llama.
create function imprevisto_propio(el_imprevisto uuid) returns imprevisto
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select * from imprevisto where id = el_imprevisto and soy(empleado_id) and borrado_en is null;
$$;

-- ponytail: la base compara contra el fin del periodo, no contra el
-- vencimiento exacto. Una mensual con dia tope el 10 podria vincular un
-- imprevisto del 20 si alguien llama a esta funcion saltandose la pantalla: el
-- vencimiento con dia tope solo lo sabe el dominio, y la accion del servidor lo
-- aplica antes de llamar. Si ese hueco llega a importar, hay que guardar el
-- dia tope vigente en la marca.
create function marcar_no_pude(la_funcion uuid, el_periodo text, la_razon text, imprevistos uuid[]) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  la_marca uuid;
  tope date;
  uno uuid;
  i imprevisto;
begin
  if not es_mia(la_funcion) then
    raise exception 'Esa funcion no es tuya' using errcode = 'insufficient_privilege';
  end if;

  insert into marca (funcion_id, periodo, resultado, razon)
  values (la_funcion, el_periodo, 'no_pude', nullif(btrim(la_razon), ''))
  returning id into la_marca;

  select fin_del_periodo(periodicidad, el_periodo) into tope from funcion where id = la_funcion;

  foreach uno in array coalesce(imprevistos, '{}') loop
    i := imprevisto_propio(uno);
    if i.id is null or (i.pedido_en at time zone 'UTC')::date > tope then
      raise exception 'Ese imprevisto no puede explicar este incumplimiento' using errcode = 'check_violation';
    end if;
    insert into intromision (imprevisto_id, marca_id) values (uno, la_marca);
  end loop;
end;
$$;

create function atrasar_flujo(la_funcion uuid, la_razon text, imprevistos uuid[]) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  el_evento uuid;
  desde timestamptz;
  uno uuid;
  i imprevisto;
begin
  if not es_mia(la_funcion) then
    raise exception 'Ese flujo no es tuyo' using errcode = 'insufficient_privilege';
  end if;

  select max(en) into desde from evento_flujo where funcion_id = la_funcion and estado = 'al_dia';

  insert into evento_flujo (funcion_id, estado, razon)
  values (la_funcion, 'atrasado', nullif(btrim(la_razon), ''))
  returning id into el_evento;

  foreach uno in array coalesce(imprevistos, '{}') loop
    i := imprevisto_propio(uno);
    if i.id is null or (desde is not null and i.pedido_en < desde) then
      raise exception 'Ese imprevisto no puede explicar este atraso' using errcode = 'check_violation';
    end if;
    insert into intromision (imprevisto_id, evento_flujo_id) values (uno, el_evento);
  end loop;
end;
$$;

revoke execute on function imprevisto_propio(uuid) from anon, authenticated, public;
grant execute on function marcar_no_pude(uuid, text, text, uuid[]), atrasar_flujo(uuid, text, uuid[]) to authenticated;
