-- Delegar un imprevisto (CEB-254, ADR 0018, PRD CEB-253): un supervisor le pasa
-- a alguien a su cargo un imprevisto suyo que sigue abierto. El original sigue
-- siendo suyo; a quien lo recibe le nace uno nuevo, vinculado, que vence con el
-- original y hereda su importancia. Es el patron de la delegacion de una
-- ocurrencia (0021), con otro origen.

alter table imprevisto
  add column delega_imprevisto uuid references imprevisto (id) on delete cascade,
  -- INV-50 · El origen es uno solo: una ocurrencia o un imprevisto.
  add constraint un_solo_origen check (delega_imprevisto is null or delega_funcion is null);

create index imprevisto_delegacion_de_imprevisto_idx on imprevisto (delega_imprevisto) where delega_imprevisto is not null;

-- INV-53 · Solo se devuelve un "hecho" de una delegacion, y con razon: de una
-- ocurrencia o de un imprevisto.
alter table imprevisto drop constraint devuelto_con_razon;
alter table imprevisto add constraint devuelto_con_razon check (
  devuelto_en is null
  or ((delega_funcion is not null or delega_imprevisto is not null)
      and resultado = 'hecho' and length(btrim(coalesce(devuelto_razon, ''))) > 0)
);

-- INV-50 · Una delegacion de imprevisto vence exactamente con su original.
-- Lo demas, igual que en 0028.
create or replace function imprevisto_vence_a_tiempo() returns trigger
  language plpgsql
  set search_path = public, pg_temp
as $$
declare
  pedido date := (new.pedido_en at time zone 'UTC')::date;
  fin date;
begin
  if new.delega_imprevisto is not null then
    if new.vence is distinct from (select vence from imprevisto where id = new.delega_imprevisto) then
      raise exception 'Una delegacion vence con su imprevisto' using errcode = 'check_violation';
    end if;
  elsif new.delega_funcion is not null then
    select fin_del_periodo(periodicidad, new.delega_periodo) into fin from funcion where id = new.delega_funcion;
    if new.vence < pedido or new.vence > fin then
      raise exception 'Una delegacion vence con su ocurrencia' using errcode = 'check_violation';
    end if;
  elsif new.vence < pedido or new.vence > sumar_habiles(habil_siguiente(pedido), 29) then
    raise exception 'Un imprevisto vence entre hoy y 29 dias habiles despues'
      using errcode = 'check_violation';
  end if;

  if new.pedido_por is not null and not puede_pedir(new.pedido_por) then
    raise exception 'Solo un administrador o un supervisor aparece como quien lo pidio'
      using errcode = 'check_violation';
  end if;
  if new.pedido_por is not null
     and new.pedido_por = (select auth_user_id from empleado where id = new.empleado_id) then
    raise exception 'Nadie se pide un imprevisto a si mismo' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Si un feriado corre el original, la delegacion se corre con el: vencen juntos.
create or replace function correr_imprevistos_por_feriado() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  update imprevisto
  set vence = habil_siguiente(new.hasta + 1)
  where vence between new.desde and new.hasta
    and vence >= (now() at time zone 'UTC')::date
    and resultado is null
    and borrado_en is null
    and delega_funcion is null
    and delega_imprevisto is null;

  update imprevisto d
  set vence = o.vence
  from imprevisto o
  where d.delega_imprevisto = o.id and d.vence <> o.vence and d.resultado is null and d.borrado_en is null;
  return null;
end;
$$;

-- INV-51 · Solo el dueno del imprevisto, que ademas tiene gente a cargo, y solo
-- a alguien a su cargo. INV-50 · Abierto, sin marca, no vencido, sin cadena y
-- con una sola delegacion abierta a la vez.
create function delegar_imprevisto(el_imprevisto uuid, a_quien uuid) returns uuid
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  o imprevisto;
  nueva uuid;
begin
  if not a_mi_cargo(a_quien) then
    raise exception 'Esa persona no esta a tu cargo' using errcode = 'insufficient_privilege';
  end if;

  select * into o from imprevisto where id = el_imprevisto;
  if o.id is null or not soy(o.empleado_id) then
    raise exception 'Ese imprevisto no es tuyo' using errcode = 'insufficient_privilege';
  end if;
  if o.delega_funcion is not null or o.delega_imprevisto is not null then
    raise exception 'Una delegacion no se delega otra vez' using errcode = 'check_violation';
  end if;
  if o.borrado_en is not null or o.resultado is not null then
    raise exception 'Ese imprevisto ya esta cerrado' using errcode = 'check_violation';
  end if;
  -- ponytail: "hoy" en UTC, como en toda la aplicacion.
  if o.vence < (now() at time zone 'UTC')::date then
    raise exception 'Ese imprevisto ya vencio' using errcode = 'check_violation';
  end if;

  -- Dos delegaciones del mismo imprevisto a la vez no pueden colarse las dos.
  perform pg_advisory_xact_lock(hashtext(el_imprevisto::text));
  if exists (
    select 1 from imprevisto
    where delega_imprevisto = el_imprevisto
      and borrado_en is null and devuelto_en is null
      and (resultado is null or resultado = 'hecho')
  ) then
    raise exception 'Ese imprevisto ya esta delegado' using errcode = 'check_violation';
  end if;

  insert into imprevisto (empleado_id, texto, vence, importancia, pedido_por, delega_imprevisto)
  values (a_quien, o.texto, o.vence, o.importancia, auth.uid(), el_imprevisto)
  returning id into nueva;
  return nueva;
end;
$$;

-- INV-53 · Devolver tambien una delegacion de imprevisto, mientras su original
-- no este marcado. Lo demas, igual que en 0021.
create or replace function devolver(la_delegacion uuid, la_razon text, a_quien uuid default null) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  d imprevisto;
begin
  update imprevisto i
  set devuelto_en = now(), devuelto_razon = nullif(btrim(la_razon), '')
  where i.id = la_delegacion
    and i.pedido_por = auth.uid()
    and (i.delega_funcion is not null or i.delega_imprevisto is not null)
    and i.resultado = 'hecho'
    and i.devuelto_en is null
    and i.borrado_en is null
    and not exists (select 1 from marca m where m.funcion_id = i.delega_funcion and m.periodo = i.delega_periodo)
    and not exists (select 1 from imprevisto o where o.id = i.delega_imprevisto and o.resultado is not null)
  returning * into d;

  if d.id is null then
    raise exception 'Esa delegacion no se puede devolver' using errcode = 'insufficient_privilege';
  end if;

  if a_quien is not null then
    if d.delega_imprevisto is not null then
      perform delegar_imprevisto(d.delega_imprevisto, a_quien);
    else
      perform delegar(d.delega_funcion, d.delega_periodo, a_quien, d.vence);
    end if;
  end if;
end;
$$;

-- Lo que el supervisor delego, ahora tambien de imprevistos.
drop function mis_delegaciones();
create function mis_delegaciones() returns table (
  id uuid,
  empleado_id uuid,
  nombre text,
  delega_funcion uuid,
  delega_periodo text,
  delega_imprevisto uuid,
  vence date,
  resultado text,
  razon text,
  devuelto_en timestamptz,
  devuelto_razon text,
  pedido_en timestamptz,
  marcada_en timestamptz
)
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select i.id, i.empleado_id, e.nombre_bloque, i.delega_funcion, i.delega_periodo, i.delega_imprevisto, i.vence, i.resultado, i.razon,
         i.devuelto_en, i.devuelto_razon, i.pedido_en, i.marcada_en
  from imprevisto i
  join empleado e on e.id = i.empleado_id
  where i.pedido_por = (select auth.uid())
    and (i.delega_funcion is not null or i.delega_imprevisto is not null)
    and i.borrado_en is null
  order by i.pedido_en;
$$;

revoke execute on function mis_delegaciones() from anon, public;
grant execute on function mis_delegaciones() to authenticated;

-- El pedido original, para quien recibe la delegacion: la fila del original es
-- del supervisor y la seguridad por fila no se la deja leer. Solo el texto, quien
-- lo pidio y cuando; nada mas.
create function origen_de_mi_delegacion(la_delegacion uuid)
  returns table (texto text, pedido_por uuid, pedido_por_otro text, pedido_en timestamptz)
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select o.texto, o.pedido_por, o.pedido_por_otro, o.pedido_en
  from imprevisto d
  join imprevisto o on o.id = d.delega_imprevisto
  where d.id = la_delegacion and soy(d.empleado_id);
$$;

revoke execute on function delegar_imprevisto(uuid, uuid), origen_de_mi_delegacion(uuid) from anon, public;
grant execute on function delegar_imprevisto(uuid, uuid), origen_de_mi_delegacion(uuid) to authenticated;

-- Las delegaciones de un imprevisto no son "lo que pedi": como las demas, se ven en delegadas.
create or replace function lo_que_pedi() returns table (
  id uuid,
  empleado_id uuid,
  nombre text,
  texto text,
  pedido_en timestamptz,
  vence date,
  pedido_por uuid
)
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select i.id, i.empleado_id, e.nombre_bloque, i.texto, i.pedido_en, i.vence, i.pedido_por
  from imprevisto i
  join empleado e on e.id = i.empleado_id
  where i.pedido_por = (select auth.uid())
    and i.delega_funcion is null
    and i.delega_imprevisto is null
    and i.resultado is null
    and i.borrado_en is null
    and not a_mi_cargo(i.empleado_id)
  order by i.vence;
$$;

-- El supervisor ve de su gente tambien de donde viene cada delegacion.
create or replace function lo_de_mi_gente() returns jsonb
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  with gente as (
    select e.id, e.nombre_bloque, e.empresa_id, e.sede_id
    from empleado e
    join empleado s on s.id = e.supervisor_id
    where s.auth_user_id = (select auth.uid())
  ),
  tenencias as (
    select t.funcion_id, t.empleado_id, t.desde, t.ponderacion
    from titularidad t
    join gente g on g.id = t.empleado_id
    join funcion f on f.id = t.funcion_id
    where t.hasta is null and t.publicado_en is not null and f.activa
  )
  select jsonb_build_object(
    'gente', (
      -- La cotidianidad es el resto del cargo (ADR 0014): cien menos sus funciones.
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', g.id, 'nombre', g.nombre_bloque, 'empresa', g.empresa_id, 'sede', g.sede_id,
        'cotidianidad', 100 - coalesce((select sum(t.ponderacion) from tenencias t where t.empleado_id = g.id), 0)
      ) order by g.nombre_bloque), '[]')
      from gente g
    ),
    'funciones', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', f.id,
        'empleado_id', t.empleado_id,
        'texto', f.texto,
        'importancia', f.importancia,
        'periodicidad', f.periodicidad,
        'tipo', coalesce(f.tipo_corregido, f.tipo_generado),
        'dia_tope', coalesce(f.dia_tope_corregido, f.dia_tope_generado),
        'fecha_alta', f.fecha_alta,
        'desde', t.desde,
        'ponderacion', t.ponderacion
      )), '[]')
      from tenencias t
      join funcion f on f.id = t.funcion_id
    ),
    'marcas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'funcion_id', m.funcion_id, 'periodo', m.periodo, 'resultado', m.resultado, 'razon', m.razon,
        'marcada_en', m.marcada_en
      )), '[]')
      from marca m
      join tenencias t on t.funcion_id = m.funcion_id
      where (m.marcada_en at time zone 'UTC')::date >= t.desde
    ),
    'eventos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'funcion_id', e.funcion_id, 'estado', e.estado, 'razon', e.razon, 'en', e.en
      ) order by e.en), '[]')
      from evento_flujo e
      join tenencias t on t.funcion_id = e.funcion_id
      where (e.en at time zone 'UTC')::date >= t.desde
    ),
    -- Dos meses, y lo que siga abierto: lo mismo que ve el empleado.
    'imprevistos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id, 'empleado_id', i.empleado_id, 'texto', i.texto, 'pedido_en', i.pedido_en, 'vence', i.vence,
        'importancia', i.importancia,
        'pedido_por', i.pedido_por, 'pedido_por_otro', i.pedido_por_otro, 'resultado', i.resultado, 'razon', i.razon,
        'marcada_en', i.marcada_en, 'delega_funcion', i.delega_funcion, 'delega_periodo', i.delega_periodo, 'delega_imprevisto', i.delega_imprevisto,
        'devuelto_en', i.devuelto_en, 'devuelto_razon', i.devuelto_razon, 'borrado_en', i.borrado_en
      ) order by i.pedido_en), '[]')
      from imprevisto i
      join gente g on g.id = i.empleado_id
      where i.borrado_en is null and (i.pedido_en >= now() - interval '62 days' or i.resultado is null)
    ),
    -- Que imprevisto desplazo a que incumplimiento. Un imprevisto borrado no
    -- cuenta en ninguna cifra (INV-42), tampoco en lo desplazado.
    'intromisiones', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'imprevisto_id', x.imprevisto_id, 'marca_id', x.marca_id, 'evento_flujo_id', x.evento_flujo_id
      )), '[]')
      from intromision x
      join imprevisto i on i.id = x.imprevisto_id
      join gente g on g.id = i.empleado_id
      where i.borrado_en is null
    )
  );
$$;
