-- El perfil de la tarea y sus comentarios (CEB-198). Una ocurrencia o un
-- imprevisto tiene comentarios mientras sigue sin marcar. Los escriben y los
-- leen el circulo de hoy: el titular, su supervisor, el administrador y, en un
-- imprevisto, quien lo pidio. No se editan ni se borran.

-- ── El circulo ───────────────────────────────────────────────────────────
--
-- Se calcula al leer, con el titular y el supervisor de hoy: el traspaso y el
-- cambio de supervisor no tocan ninguna fila. Una ocurrencia se nombra por su
-- funcion (el periodo no cambia quien la ve); un imprevisto, por su id.
create function puede_ver_tarea(la_funcion uuid, el_imprevisto uuid) returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select es_administrador() or case
    when el_imprevisto is not null then exists (
      select 1 from imprevisto i
      where i.id = el_imprevisto
        and (soy(i.empleado_id) or a_mi_cargo(i.empleado_id) or i.pedido_por = (select auth.uid()))
    )
    else exists (
      select 1 from titularidad t
      where t.funcion_id = la_funcion and t.hasta is null and t.publicado_en is not null
        and (soy(t.empleado_id) or a_mi_cargo(t.empleado_id))
    )
  end;
$$;

-- ── El comentario ────────────────────────────────────────────────────────

create table comentario (
  id uuid primary key default gen_random_uuid(),
  funcion_id uuid references funcion (id) on delete cascade,
  periodo text,
  imprevisto_id uuid references imprevisto (id) on delete cascade,
  -- Los dos los pone la base (INV-36): nadie firma por otro ni corre la fecha.
  autor uuid not null default auth.uid() references auth.users (id),
  escrito_en timestamptz not null default now(),
  texto text not null check (length(btrim(texto)) > 0),
  constraint de_una_sola_tarea check (num_nonnulls(funcion_id, imprevisto_id) = 1 and (funcion_id is null) = (periodo is null))
);

create index comentario_ocurrencia_idx on comentario (funcion_id, periodo) where funcion_id is not null;
create index comentario_imprevisto_idx on comentario (imprevisto_id) where imprevisto_id is not null;

-- INV-35 · Solo en una tarea sin marcar. security definer: el supervisor no lee
-- las marcas de su gente, y aun asi su comentario tiene que chocar con ellas.
create function comentario_en_tarea_abierta() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  new.autor := auth.uid();
  new.escrito_en := now();

  if new.imprevisto_id is not null then
    if exists (select 1 from imprevisto where id = new.imprevisto_id and (resultado is not null or borrado_en is not null)) then
      raise exception 'Una tarea marcada ya no admite comentarios' using errcode = 'check_violation';
    end if;
  else
    if exists (select 1 from marca where funcion_id = new.funcion_id and periodo = new.periodo) then
      raise exception 'Una tarea marcada ya no admite comentarios' using errcode = 'check_violation';
    end if;
    -- Un flujo no se marca: no tiene un antes y un despues que comentar.
    if (select coalesce(tipo_corregido, tipo_generado) from funcion where id = new.funcion_id) is distinct from 'entregable' then
      raise exception 'Un flujo no tiene comentarios' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger comentario_en_tarea_abierta
  before insert on comentario
  for each row execute function comentario_en_tarea_abierta();

alter table comentario enable row level security;

create policy "el circulo de hoy lee los comentarios"
  on comentario for select to authenticated
  using (puede_ver_tarea(funcion_id, imprevisto_id));

create policy "el circulo de hoy comenta"
  on comentario for insert to authenticated
  with check (puede_ver_tarea(funcion_id, imprevisto_id));

-- INV-36 · Solo insert y select, y el insert sin autor ni fecha. Sin el revoke,
-- Supabase concede todo por defecto (lo mismo que se descubrio en 0018).
revoke all on comentario from anon, authenticated;
grant select on comentario to authenticated;
grant insert (funcion_id, periodo, imprevisto_id, texto) on comentario to authenticated;
grant select, insert, update, delete on comentario to service_role;

-- ── Lo que ya viste ──────────────────────────────────────────────────────

create table comentario_visto (
  usuario uuid not null references auth.users (id) on delete cascade,
  funcion_id uuid references funcion (id) on delete cascade,
  periodo text,
  imprevisto_id uuid references imprevisto (id) on delete cascade,
  visto_en timestamptz not null default now(),
  unique nulls not distinct (usuario, funcion_id, periodo, imprevisto_id)
);

alter table comentario_visto enable row level security;

create policy "cada quien ve lo que vio"
  on comentario_visto for select to authenticated
  using (usuario = (select auth.uid()));

-- Se escribe solo por ver_tarea, con la hora de la base.
revoke all on comentario_visto from anon, authenticated;
grant select on comentario_visto to authenticated;
grant select, insert, update, delete on comentario_visto to service_role;

-- Abrir el perfil: lo que habia hasta ahora, visto.
create function ver_tarea(la_funcion uuid, el_periodo text, el_imprevisto uuid) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if not puede_ver_tarea(la_funcion, el_imprevisto) then
    raise exception 'Esa tarea no es de tu circulo' using errcode = 'insufficient_privilege';
  end if;

  insert into comentario_visto (usuario, funcion_id, periodo, imprevisto_id)
  values (auth.uid(), la_funcion, el_periodo, el_imprevisto)
  on conflict (usuario, funcion_id, periodo, imprevisto_id) do update set visto_en = now();
end;
$$;

-- ── Lo que lee la pantalla ───────────────────────────────────────────────
--
-- Los comentarios que puedo ver, con el nombre de quien los escribio (el
-- empleado no lee a los demas), de quien es la tarea hoy y si sigue abierta:
-- con eso la pantalla enciende el punto en la tarjeta y junto al nombre.
create function comentarios_visibles() returns table (
  id uuid,
  funcion_id uuid,
  periodo text,
  imprevisto_id uuid,
  autor uuid,
  autor_nombre text,
  escrito_en timestamptz,
  texto text,
  empleado_id uuid,
  abierta boolean
)
  language sql
  stable
  security definer
  set search_path = public, auth, pg_temp
as $$
  select c.id, c.funcion_id, c.periodo, c.imprevisto_id, c.autor,
         coalesce(e.nombre_bloque, split_part(u.email, '@', 1)),
         c.escrito_en, c.texto,
         coalesce(t.empleado_id, i.empleado_id),
         case when c.imprevisto_id is null
           then not exists (select 1 from marca m where m.funcion_id = c.funcion_id and m.periodo = c.periodo)
           else i.resultado is null and i.borrado_en is null
         end
  from comentario c
  join auth.users u on u.id = c.autor
  left join empleado e on e.auth_user_id = c.autor
  left join titularidad t on t.funcion_id = c.funcion_id and t.hasta is null and t.publicado_en is not null
  left join imprevisto i on i.id = c.imprevisto_id
  where puede_ver_tarea(c.funcion_id, c.imprevisto_id)
  order by c.escrito_en;
$$;

-- Quien lee el perfil, en nombres, sin contar al administrador (la pantalla lo
-- agrega). El titular, su supervisor y, en un imprevisto, quien lo pidio.
create function lectores(la_funcion uuid, el_imprevisto uuid) returns text[]
  language sql
  stable
  security definer
  set search_path = public, auth, pg_temp
as $$
  with titular as (
    select coalesce(
      (select i.empleado_id from imprevisto i where i.id = el_imprevisto),
      (select t.empleado_id from titularidad t
       where t.funcion_id = la_funcion and t.hasta is null and t.publicado_en is not null)
    ) as id
  ),
  personas as (
    select e.nombre_bloque as nombre, 1 as orden from empleado e join titular on titular.id = e.id
    union
    select s.nombre_bloque, 2 from empleado e join titular on titular.id = e.id join empleado s on s.id = e.supervisor_id
    union
    select coalesce(p.nombre_bloque, split_part(u.email, '@', 1)), 3
    from imprevisto i
    join auth.users u on u.id = i.pedido_por
    left join empleado p on p.auth_user_id = u.id
    where i.id = el_imprevisto and not exists (select 1 from administrador a where a.auth_user_id = u.id)
  )
  select coalesce(array_agg(nombre order by orden), '{}')
  from personas
  where puede_ver_tarea(la_funcion, el_imprevisto);
$$;

-- Las tareas abiertas de una persona, para su supervisor o el administrador:
-- las funciones sin ponderacion (INV-3), las marcas que las cierran y los
-- imprevistos sin marcar. Quien no puede verla recibe null.
create function tareas_de(el_empleado uuid) returns jsonb
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  with tenencias as (
    select t.funcion_id, t.desde
    from titularidad t
    where t.empleado_id = el_empleado and t.hasta is null and t.publicado_en is not null
  )
  select case when a_mi_cargo(el_empleado) or es_administrador() then jsonb_build_object(
    'funciones', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', f.id,
        'texto', f.texto,
        'importancia', f.importancia,
        'periodicidad', f.periodicidad,
        'dia_tope', coalesce(f.dia_tope_corregido, f.dia_tope_generado),
        'fecha_alta', f.fecha_alta,
        'desde', t.desde
      )), '[]')
      from tenencias t
      join funcion f on f.id = t.funcion_id
      where f.activa and coalesce(f.tipo_corregido, f.tipo_generado) = 'entregable'
    ),
    'marcas', (
      select coalesce(jsonb_agg(jsonb_build_object('funcion_id', m.funcion_id, 'periodo', m.periodo)), '[]')
      from marca m
      join tenencias t on t.funcion_id = m.funcion_id
    ),
    'imprevistos', (
      select coalesce(jsonb_agg(to_jsonb(i) order by i.vence), '[]')
      from imprevisto i
      where i.empleado_id = el_empleado and i.resultado is null and i.borrado_en is null
    )
  ) end;
$$;

-- Lo que un supervisor le pidio a gente de otros equipos y sigue abierto. Lo
-- de su equipo ya lo ve en el equipo; las delegaciones, en delegadas.
create function lo_que_pedi() returns table (
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
    and i.resultado is null
    and i.borrado_en is null
    and not a_mi_cargo(i.empleado_id)
  order by i.vence;
$$;

-- La delegacion en el perfil del supervisor necesita cuando se marco.
drop function mis_delegaciones();
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
  pedido_en timestamptz,
  marcada_en timestamptz
)
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select i.id, i.empleado_id, e.nombre_bloque, i.delega_funcion, i.delega_periodo, i.vence, i.resultado, i.razon,
         i.devuelto_en, i.devuelto_razon, i.pedido_en, i.marcada_en
  from imprevisto i
  join empleado e on e.id = i.empleado_id
  where i.pedido_por = (select auth.uid()) and i.delega_funcion is not null and i.borrado_en is null
  order by i.pedido_en;
$$;

revoke execute on function
  puede_ver_tarea(uuid, uuid),
  comentario_en_tarea_abierta(),
  ver_tarea(uuid, text, uuid),
  comentarios_visibles(),
  lectores(uuid, uuid),
  tareas_de(uuid),
  lo_que_pedi(),
  mis_delegaciones()
from anon, public;

grant execute on function
  puede_ver_tarea(uuid, uuid),
  ver_tarea(uuid, text, uuid),
  comentarios_visibles(),
  lectores(uuid, uuid),
  tareas_de(uuid),
  lo_que_pedi(),
  mis_delegaciones()
to authenticated;
