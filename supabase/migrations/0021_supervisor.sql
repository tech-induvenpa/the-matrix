-- El supervisor (CEB-145): un empleado que responde por otros. Tiene su propio
-- reparto y ademas gente a cargo, de la que ve lo que necesita para actuar el
-- mismo dia, a la que le pide imprevistos y a la que le delega ocurrencias
-- suyas (ADR 0012). No ve pesos, tasas ni bonos de nadie.

-- ── Quien supervisa a quien (CEB-177) ─────────────────────────────────────
--
-- Una columna y no una tabla `equipo`: hara falta cuando el grupo tenga nombre
-- propio, historia o mas de un supervisor. Sin historia: el supervisor ve a
-- quien tiene a cargo hoy.
alter table empleado
  add column supervisor_id uuid references empleado (id) on delete set null,
  add constraint nadie_se_supervisa check (supervisor_id <> id);

create index empleado_supervisor_idx on empleado (supervisor_id);

-- INV-28 · Un solo nivel: quien supervisa no tiene supervisor, y quien tiene
-- supervisor no supervisa. Asi nadie ve por cadena a la gente de otro.
-- ponytail: sin bloqueo; dos administradores asignando a la vez en sentidos
-- cruzados podrian colarse. Hay uno.
create function un_solo_nivel() returns trigger
  language plpgsql
  set search_path = public, pg_temp
as $$
begin
  if new.supervisor_id is not null and (
    exists (select 1 from empleado where supervisor_id = new.id)
    or exists (select 1 from empleado where id = new.supervisor_id and supervisor_id is not null)
  ) then
    raise exception 'Hay un solo nivel: quien supervisa no tiene supervisor' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger un_solo_nivel
  before insert or update of supervisor_id on empleado
  for each row execute function un_solo_nivel();

create function asignar_supervisor(el_empleado uuid, el_supervisor uuid) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if not es_administrador() then
    raise exception 'Solo el administrador decide quien supervisa a quien' using errcode = 'insufficient_privilege';
  end if;

  update empleado set supervisor_id = el_supervisor where id = el_empleado;
  if not found then
    raise exception 'Esa persona no existe' using errcode = 'check_violation';
  end if;
end;
$$;

-- "Esta persona esta a mi cargo hoy". Todo lo que el supervisor ve y escribe
-- de su gente se apoya aqui, como lo propio se apoya en `soy` y `es_mia`.
create function a_mi_cargo(el_empleado uuid) returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from empleado e
    join empleado s on s.id = e.supervisor_id
    where e.id = el_empleado and s.auth_user_id = (select auth.uid())
  );
$$;

-- Su gente, con lo minimo: un id y un nombre. El supervisor no recibe politica
-- sobre `empleado`: muchas pantallas leen "mi fila" confiando en que la
-- seguridad por fila devuelve una sola.
create function mi_gente() returns table (id uuid, nombre text)
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select e.id, e.nombre_bloque
  from empleado e
  join empleado s on s.id = e.supervisor_id
  where s.auth_user_id = (select auth.uid())
  order by 2;
$$;

-- ── Quien lo pidio (CEB-179) ──────────────────────────────────────────────
--
-- Deja de ser solo un administrador: es una persona del sistema --
-- administrador o supervisor -- o un texto de "otro". Los que ya existen
-- conservan quien los pidio: renombrar la columna no toca las filas.
alter table imprevisto rename column pedido_por_admin to pedido_por;
alter table imprevisto drop constraint imprevisto_pedido_por_admin_fkey;
alter table imprevisto add constraint imprevisto_pedido_por_fkey foreign key (pedido_por) references auth.users (id);

-- Supervisa quien tiene a alguien a cargo hoy.
create function puede_pedir(quien uuid) returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (select 1 from administrador where auth_user_id = quien)
    or exists (
      select 1 from empleado s
      where s.auth_user_id = quien and exists (select 1 from empleado e where e.supervisor_id = s.id)
    );
$$;

create or replace function quienes_piden() returns table (id uuid, nombre text)
  language sql
  stable
  security definer
  set search_path = public, auth, pg_temp
as $$
  select u.id, coalesce(e.nombre_bloque, split_part(u.email, '@', 1))
  from auth.users u
  left join empleado e on e.auth_user_id = u.id
  where puede_pedir(u.id)
  order by 2;
$$;

-- ── La delegacion (CEB-180, CEB-181, ADR 0012) ────────────────────────────
--
-- Un imprevisto de quien la recibe con una referencia a la ocurrencia de su
-- supervisor, por funcion y periodo. No es una tabla nueva: todo lo que vale
-- para un imprevisto vale para ella. Devolver no reescribe la marca de quien la
-- recibio: se guarda aparte, y la anula para las cifras.
alter table imprevisto
  add column delega_funcion uuid references funcion (id) on delete cascade,
  add column delega_periodo text,
  add column devuelto_en timestamptz,
  add column devuelto_razon text,
  add constraint delegacion_entera check ((delega_funcion is null) = (delega_periodo is null)),
  -- INV-27 · Solo se devuelve un "hecho" de una delegacion, y con razon.
  add constraint devuelto_con_razon check (
    devuelto_en is null
    or (delega_funcion is not null and resultado = 'hecho' and length(btrim(coalesce(devuelto_razon, ''))) > 0)
  );

create index imprevisto_delegacion_idx on imprevisto (delega_funcion, delega_periodo) where delega_funcion is not null;

-- INV-18 (reescrito) · Un imprevisto vence hoy o el dia habil siguiente; una
-- delegacion, con su ocurrencia. La base sabe el fin del periodo, no el
-- vencimiento con dia tope: es el mismo hueco que en la intromision (0019).
create or replace function imprevisto_vence_a_tiempo() returns trigger
  language plpgsql
  set search_path = public, pg_temp
as $$
declare
  pedido date := (new.pedido_en at time zone 'UTC')::date;
  fin date;
begin
  if new.delega_funcion is not null then
    select fin_del_periodo(periodicidad, new.delega_periodo) into fin from funcion where id = new.delega_funcion;
    if new.vence < pedido or new.vence > fin then
      raise exception 'Una delegacion vence con su ocurrencia' using errcode = 'check_violation';
    end if;
  elsif new.vence < pedido or new.vence > habil_siguiente(pedido + 1) then
    raise exception 'Un imprevisto vence hoy o el dia habil siguiente'
      using errcode = 'check_violation';
  end if;

  if new.pedido_por is not null and not puede_pedir(new.pedido_por) then
    raise exception 'Solo un administrador o un supervisor aparece como quien lo pidio'
      using errcode = 'check_violation';
  end if;
  -- Nadie se pide trabajo a si mismo: un supervisor no aparece como quien le
  -- pidio un imprevisto a el.
  if new.pedido_por is not null
     and new.pedido_por = (select auth_user_id from empleado where id = new.empleado_id) then
    raise exception 'Nadie se pide un imprevisto a si mismo' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- INV-26 · El supervisor registra imprevistos a su gente, y solo a ella.
drop policy "cada quien registra lo suyo, el administrador a cualquiera" on imprevisto;
create policy "cada quien registra lo suyo, el supervisor a su gente, el administrador a cualquiera"
  on imprevisto for insert to authenticated
  with check (soy(empleado_id) or a_mi_cargo(empleado_id) or es_administrador());

-- Las columnas de la delegacion no se escriben al registrar: delegar pasa por
-- la funcion de abajo, que comprueba todo lo demas.
revoke insert on imprevisto from authenticated;
grant insert (empleado_id, texto, vence, pedido_por, pedido_por_otro) on imprevisto to authenticated;

-- INV-26 · Solo ocurrencias propias que no vencieron, a alguien a cargo, una
-- delegacion abierta a la vez. El vencimiento con dia tope lo calcula el
-- dominio; la base comprueba que no pase del fin del periodo.
create function delegar(la_funcion uuid, el_periodo text, a_quien uuid, el_vence date) returns uuid
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  el_texto text;
  el_tipo text;
  nueva uuid;
begin
  if not a_mi_cargo(a_quien) then
    raise exception 'Esa persona no esta a tu cargo' using errcode = 'insufficient_privilege';
  end if;
  if not es_mia(la_funcion) then
    raise exception 'Esa ocurrencia no es tuya' using errcode = 'insufficient_privilege';
  end if;

  select texto, coalesce(tipo_corregido, tipo_generado) into el_texto, el_tipo from funcion where id = la_funcion;
  if el_tipo is distinct from 'entregable' then
    raise exception 'Solo se delegan ocurrencias: un flujo no se delega' using errcode = 'check_violation';
  end if;

  -- ponytail: "hoy" en UTC, como en toda la aplicacion.
  if el_vence < (now() at time zone 'UTC')::date then
    raise exception 'Esa ocurrencia ya vencio' using errcode = 'check_violation';
  end if;
  if exists (select 1 from marca where funcion_id = la_funcion and periodo = el_periodo) then
    raise exception 'Esa ocurrencia ya esta marcada' using errcode = 'check_violation';
  end if;

  -- Dos delegaciones de la misma ocurrencia a la vez no pueden colarse las dos.
  perform pg_advisory_xact_lock(hashtext(la_funcion::text || el_periodo));
  if exists (
    select 1 from imprevisto
    where delega_funcion = la_funcion and delega_periodo = el_periodo
      and borrado_en is null and devuelto_en is null
      and (resultado is null or resultado = 'hecho')
  ) then
    raise exception 'Esa ocurrencia ya esta delegada' using errcode = 'check_violation';
  end if;

  insert into imprevisto (empleado_id, texto, vence, pedido_por, delega_funcion, delega_periodo)
  values (a_quien, el_texto, el_vence, auth.uid(), la_funcion, el_periodo)
  returning id into nueva;
  return nueva;
end;
$$;

-- Solo quien delego, solo un "hecho" y solo mientras su ocurrencia no este
-- marcada: una vez aprobada, esta aprobada. Devolver es "a la misma persona o
-- a otra" (ADR 0012): con `a_quien`, en el mismo acto nace una delegacion
-- nueva, que vence con la ocurrencia. Sin `a_quien`, el supervisor se la queda.
create function devolver(la_delegacion uuid, la_razon text, a_quien uuid default null) returns void
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
    and i.delega_funcion is not null
    and i.resultado = 'hecho'
    and i.devuelto_en is null
    and i.borrado_en is null
    and not exists (select 1 from marca m where m.funcion_id = i.delega_funcion and m.periodo = i.delega_periodo)
  returning * into d;

  if d.id is null then
    raise exception 'Esa delegacion no se puede devolver' using errcode = 'insufficient_privilege';
  end if;

  if a_quien is not null then
    perform delegar(d.delega_funcion, d.delega_periodo, a_quien, d.vence);
  end if;
end;
$$;

-- Lo que el supervisor delego, siga o no a cargo de esa persona: la delegacion
-- es suya. Con el nombre de quien la recibio.
create function mis_delegaciones() returns table (
  id uuid,
  empleado_id uuid,
  nombre text,
  delega_funcion uuid,
  delega_periodo text,
  vence date,
  resultado text,
  razon text,
  devuelto_en timestamptz,
  devuelto_razon text,
  pedido_en timestamptz
)
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select i.id, i.empleado_id, e.nombre_bloque, i.delega_funcion, i.delega_periodo, i.vence, i.resultado, i.razon,
         i.devuelto_en, i.devuelto_razon, i.pedido_en
  from imprevisto i
  join empleado e on e.id = i.empleado_id
  where i.pedido_por = (select auth.uid()) and i.delega_funcion is not null and i.borrado_en is null
  order by i.pedido_en;
$$;

-- Deshacer una marca devuelta borraria la devolucion con ella.
create or replace function desmarcar_imprevisto(el_imprevisto uuid) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  update imprevisto
  set resultado = null, razon = null, marcada_en = null
  where id = el_imprevisto and soy(empleado_id) and borrado_en is null and resultado is not null and devuelto_en is null;

  if not found then
    raise exception 'Ese imprevisto no se puede desmarcar' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- ── Lo que ve de su gente (CEB-178). Va al final: lee las columnas de la delegacion ───────────────────────────────────────
--
-- La ponderacion vive en `titularidad`, y la seguridad por fila y los
-- permisos por columna aplican igual a todos los empleados: una politica que
-- le mostrara al supervisor la fila le mostraria el peso. Por eso no recibe
-- ninguna sobre esas tablas, y lee a su gente por aqui, que devuelve solo lo
-- que puede ver (INV-3 por construccion). De cada funcion, lo que paso desde
-- que la tiene su titular de hoy: lo anterior es de otra persona (INV-2).
create function lo_de_mi_gente() returns jsonb
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  with gente as (
    select e.id, e.nombre_bloque
    from empleado e
    join empleado s on s.id = e.supervisor_id
    where s.auth_user_id = (select auth.uid())
  ),
  tenencias as (
    select t.funcion_id, t.empleado_id, t.desde
    from titularidad t
    join gente g on g.id = t.empleado_id
    where t.hasta is null and t.publicado_en is not null
  )
  select jsonb_build_object(
    'gente', (
      select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'nombre', g.nombre_bloque) order by g.nombre_bloque), '[]')
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
        'desde', t.desde
      )), '[]')
      from tenencias t
      join funcion f on f.id = t.funcion_id
      where f.activa
    ),
    'marcas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'funcion_id', m.funcion_id, 'periodo', m.periodo, 'resultado', m.resultado, 'razon', m.razon, 'marcada_en', m.marcada_en
      )), '[]')
      from marca m
      join tenencias t on t.funcion_id = m.funcion_id
      where (m.marcada_en at time zone 'UTC')::date >= t.desde
    ),
    'eventos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'funcion_id', e.funcion_id, 'estado', e.estado, 'razon', e.razon, 'en', e.en
      ) order by e.en), '[]')
      from evento_flujo e
      join tenencias t on t.funcion_id = e.funcion_id
      where (e.en at time zone 'UTC')::date >= t.desde
    ),
    -- Dos meses, y lo que siga abierto: lo mismo que ve el empleado.
    'imprevistos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id, 'empleado_id', i.empleado_id, 'texto', i.texto, 'pedido_en', i.pedido_en, 'vence', i.vence,
        'pedido_por', i.pedido_por, 'pedido_por_otro', i.pedido_por_otro, 'resultado', i.resultado, 'razon', i.razon,
        'marcada_en', i.marcada_en, 'delega_funcion', i.delega_funcion, 'devuelto_en', i.devuelto_en,
        'devuelto_razon', i.devuelto_razon
      ) order by i.pedido_en), '[]')
      from imprevisto i
      join gente g on g.id = i.empleado_id
      where i.borrado_en is null and (i.pedido_en >= now() - interval '62 days' or i.resultado is null)
    )
  );
$$;

revoke execute on function
  un_solo_nivel(),
  asignar_supervisor(uuid, uuid),
  a_mi_cargo(uuid),
  mi_gente(),
  lo_de_mi_gente(),
  puede_pedir(uuid),
  delegar(uuid, text, uuid, date),
  devolver(uuid, text, uuid),
  mis_delegaciones()
from anon, public;

grant execute on function
  asignar_supervisor(uuid, uuid),
  a_mi_cargo(uuid),
  mi_gente(),
  lo_de_mi_gente(),
  puede_pedir(uuid),
  delegar(uuid, text, uuid, date),
  devolver(uuid, text, uuid),
  mis_delegaciones()
to authenticated;
