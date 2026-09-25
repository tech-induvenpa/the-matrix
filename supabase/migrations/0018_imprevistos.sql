-- Imprevistos (CEB-146, ADR 0009): trabajo que llega sin estar en el reparto de
-- nadie y se hace una sola vez. No es una funcion: no se repite, no pesa, no se
-- traspasa. Por eso vive en su propia tabla y no toca ni `funcion` ni `marca`.
--
-- La marca va en la misma fila porque hay a lo sumo una. En el glosario sigue
-- siendo una Marca: cambia el objeto, no el acto.

-- El calendario, visto desde la base. El dominio tiene el mismo calculo en
-- Calendario.habilSiguiente; aqui hace falta para que INV-18 no dependa de que
-- la pantalla lo haga bien.
-- ponytail: busca en los proximos sesenta dias. Un bloque de colectivas mas
-- largo que eso no existe en esta empresa.
create function habil_siguiente(f date) returns date
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select min(d)::date
  from generate_series(f, f + 60, interval '1 day') d
  where extract(isodow from d) < 6
    and not exists (select 1 from dia_no_habil n where d::date between n.desde and n.hasta);
$$;

-- "Esta fila es de quien tiene la sesion". Para imprevistos, que pertenecen a
-- una persona y no a una funcion, es_mia no sirve.
create function soy(el_empleado uuid) returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (select 1 from empleado where id = el_empleado and auth_user_id = (select auth.uid()));
$$;

grant execute on function habil_siguiente(date), soy(uuid) to authenticated;

create table imprevisto (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleado (id) on delete cascade,
  texto text not null check (length(btrim(texto)) > 0),
  -- Lo pone la base: si lo escribiera quien registra, podria correrlo hacia
  -- atras y vincular cualquier imprevisto a cualquier "no pude" (INV-20).
  pedido_en timestamptz not null default now(),
  vence date not null,
  pedido_por_admin uuid references administrador (auth_user_id),
  pedido_por_otro text,
  registrado_por uuid not null default auth.uid() references auth.users (id),

  resultado text check (resultado in ('hecho', 'no_pude', 'no_lo_tome')),
  razon text,
  marcada_en timestamptz,

  borrado_en timestamptz,
  borrado_por uuid references auth.users (id),

  constraint pedido_por_uno_solo
    check (num_nonnulls(pedido_por_admin, nullif(btrim(pedido_por_otro), '')) = 1),
  constraint marca_entera check ((resultado is null) = (marcada_en is null)),
  -- Ni "no pude" ni "no lo tome" sin decir por que.
  constraint razon_obligatoria_al_no_hacerlo
    check (resultado is null or resultado = 'hecho' or (razon is not null and length(btrim(razon)) > 0)),
  constraint borrado_con_traza check ((borrado_en is null) = (borrado_por is null))
);

create index imprevisto_empleado_idx on imprevisto (empleado_id, pedido_en desc);

-- INV-18 · Vence hoy o el dia habil siguiente a cuando se pidio.
-- ponytail: el dia se toma en UTC, igual que `hoy` en el resto de la
-- aplicacion. Si algun dia la hora local importa, cambia aqui y alla a la vez.
create function imprevisto_vence_a_tiempo() returns trigger
  language plpgsql
  set search_path = public, pg_temp
as $$
declare
  pedido date := (new.pedido_en at time zone 'UTC')::date;
begin
  if new.vence < pedido or new.vence > habil_siguiente(pedido + 1) then
    raise exception 'Un imprevisto vence hoy o el dia habil siguiente'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger imprevisto_vence_a_tiempo
  before insert on imprevisto
  for each row execute function imprevisto_vence_a_tiempo();

alter table imprevisto enable row level security;

create policy "cada quien ve sus imprevistos"
  on imprevisto for select to authenticated
  using (soy(empleado_id));

create policy "el administrador ve todos los imprevistos"
  on imprevisto for select to authenticated
  using (es_administrador());

create policy "cada quien registra lo suyo, el administrador a cualquiera"
  on imprevisto for insert to authenticated
  with check (soy(empleado_id) or es_administrador());

-- Solo estas columnas: la fecha en que se pidio, quien lo registro, la marca y
-- el borrado no se escriben al registrar. Y no hay update ni delete: marcar y
-- borrar pasan por las funciones de abajo, y nada cambia nunca la fecha en
-- que se pidio ni el vencimiento (INV-21).
--
-- Supabase concede por defecto todo sobre las tablas nuevas a anon y
-- authenticated. Sin este revoke, el grant por columnas de abajo no restringe
-- nada, y un empleado podia registrar un imprevisto con `pedido_en` de hace un
-- mes. Se descubrio con la prueba de INV-21.
revoke all on imprevisto from anon, authenticated;
grant select on imprevisto to authenticated;
grant insert (empleado_id, texto, vence, pedido_por_admin, pedido_por_otro) on imprevisto to authenticated;
grant select, insert, update, delete on imprevisto to service_role;

create function marcar_imprevisto(el_imprevisto uuid, el_resultado text, la_razon text) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  update imprevisto
  set resultado = el_resultado,
      razon = case when el_resultado = 'hecho' then null else nullif(btrim(la_razon), '') end,
      marcada_en = now()
  where id = el_imprevisto and soy(empleado_id) and borrado_en is null and resultado is null;

  if not found then
    raise exception 'Ese imprevisto no se puede marcar' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

create function desmarcar_imprevisto(el_imprevisto uuid) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  update imprevisto
  set resultado = null, razon = null, marcada_en = null
  where id = el_imprevisto and soy(empleado_id) and borrado_en is null and resultado is not null;

  if not found then
    raise exception 'Ese imprevisto no se puede desmarcar' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- Borrar es para corregir un error recien hecho: solo quien lo registro, o el
-- administrador, y solo sin marca. Una vez marcado es un hecho. El borrado es
-- logico: sale de todas las cifras, pero queda quien lo borro y cuando.
create function borrar_imprevisto(el_imprevisto uuid) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  update imprevisto
  set borrado_en = now(), borrado_por = auth.uid()
  where id = el_imprevisto
    and borrado_en is null
    and resultado is null
    and (registrado_por = auth.uid() or es_administrador());

  if not found then
    raise exception 'Ese imprevisto no se puede borrar' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- Quien puede aparecer como "quien lo pidio": los administradores. El empleado
-- no puede leer `administrador` ni `auth.users`, asi que la lista sale de aqui,
-- con lo minimo: un id y un nombre.
create function quienes_piden() returns table (id uuid, nombre text)
  language sql
  stable
  security definer
  set search_path = public, auth, pg_temp
as $$
  select a.auth_user_id, coalesce(e.nombre_bloque, split_part(u.email, '@', 1))
  from administrador a
  join auth.users u on u.id = a.auth_user_id
  left join empleado e on e.auth_user_id = a.auth_user_id
  order by 2;
$$;

grant execute on function
  marcar_imprevisto(uuid, text, text),
  desmarcar_imprevisto(uuid),
  borrar_imprevisto(uuid),
  quienes_piden()
to authenticated;
