-- Las notificaciones (CEB-267, CEB-268). Un aviso guardado para una persona
-- cuando pasa algo que le toca saber. Esta primera tajada avisa de comentarios:
-- al titular de hoy, a su supervisor de hoy y, en un imprevisto, a quien lo
-- pidio. Nunca al autor, y nunca a un administrador (decidido el 09/10/2026):
-- el administrador lee el comentario al abrir la tarea.

create table notificacion (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('comentario')),
  funcion_id uuid references funcion (id) on delete cascade,
  periodo text,
  imprevisto_id uuid references imprevisto (id) on delete cascade,
  cantidad int not null default 1 check (cantidad > 0),
  creada_en timestamptz not null default now(),
  vista_en timestamptz,
  constraint de_una_sola_tarea check (num_nonnulls(funcion_id, imprevisto_id) = 1 and (funcion_id is null) = (periodo is null))
);

-- Los comentarios sin ver de una misma tarea son un solo aviso, y dos
-- comentarios a la vez no pueden duplicarlo (INV-64).
create unique index notificacion_sin_ver_idx
  on notificacion (usuario, tipo, funcion_id, periodo, imprevisto_id) nulls not distinct
  where vista_en is null;

alter table notificacion enable row level security;

-- INV-62 · Cada quien lee las suyas, y nadie escribe con su token: las escriben
-- el trigger de abajo y ver_tarea.
create policy "cada quien lee sus avisos"
  on notificacion for select to authenticated
  using (usuario = (select auth.uid()));

revoke all on notificacion from anon, authenticated;
grant select on notificacion to authenticated;
grant select, insert, update, delete on notificacion to service_role;

-- ── El aviso de un comentario ────────────────────────────────────────────
--
-- INV-63 · La audiencia se calcula con el titular y el supervisor de hoy, sin el
-- autor y sin administradores. Un titular o un supervisor que aun no entro (sin
-- auth_user_id) no tiene a quien avisar.
create function avisar_comentario() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  insert into notificacion (usuario, tipo, funcion_id, periodo, imprevisto_id)
  select distinct q.usuario, 'comentario', new.funcion_id, new.periodo, new.imprevisto_id
  from (
    select e.auth_user_id as usuario
    from empleado e
    where e.id = coalesce(
      (select i.empleado_id from imprevisto i where i.id = new.imprevisto_id),
      (select t.empleado_id from titularidad t
       where t.funcion_id = new.funcion_id and t.hasta is null and t.publicado_en is not null)
    )
    union
    select s.auth_user_id
    from empleado e
    join empleado s on s.id = e.supervisor_id
    where e.id = coalesce(
      (select i.empleado_id from imprevisto i where i.id = new.imprevisto_id),
      (select t.empleado_id from titularidad t
       where t.funcion_id = new.funcion_id and t.hasta is null and t.publicado_en is not null)
    )
    union
    select i.pedido_por from imprevisto i where i.id = new.imprevisto_id
  ) q
  where q.usuario is not null
    and q.usuario <> new.autor
    and not exists (select 1 from administrador a where a.auth_user_id = q.usuario)
  on conflict (usuario, tipo, funcion_id, periodo, imprevisto_id) where vista_en is null
  do update set cantidad = notificacion.cantidad + 1, creada_en = now();

  return new;
end;
$$;

create trigger avisar_comentario
  after insert on comentario
  for each row execute function avisar_comentario();

-- ── Abrir la tarea ───────────────────────────────────────────────────────
--
-- INV-65 · Lo de antes, y ademas sus avisos, vistos.
create or replace function ver_tarea(la_funcion uuid, el_periodo text, el_imprevisto uuid) returns void
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

  update notificacion
  set vista_en = now()
  where usuario = auth.uid() and vista_en is null
    and funcion_id is not distinct from la_funcion
    and periodo is not distinct from el_periodo
    and imprevisto_id is not distinct from el_imprevisto;
end;
$$;

-- ── Lo que lee la campanita ──────────────────────────────────────────────
--
-- INV-65 · Una tarea marcada no deja avisos de comentario: se calcula al leer,
-- asi que deshacer la marca los devuelve, igual que los comentarios. Con el
-- nombre de la tarea y de quien es hoy, para saber a donde lleva el aviso.
create function mis_notificaciones() returns table (
  id uuid,
  tipo text,
  funcion_id uuid,
  periodo text,
  imprevisto_id uuid,
  cantidad int,
  creada_en timestamptz,
  texto text,
  empleado_id uuid
)
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select n.id, n.tipo, n.funcion_id, n.periodo, n.imprevisto_id, n.cantidad, n.creada_en,
         coalesce(i.texto, f.texto),
         coalesce(i.empleado_id, t.empleado_id)
  from notificacion n
  left join imprevisto i on i.id = n.imprevisto_id
  left join funcion f on f.id = n.funcion_id
  left join titularidad t on t.funcion_id = n.funcion_id and t.hasta is null and t.publicado_en is not null
  where n.usuario = (select auth.uid())
    and n.vista_en is null
    and case when n.imprevisto_id is null
      then not exists (select 1 from marca m where m.funcion_id = n.funcion_id and m.periodo = n.periodo)
      else i.resultado is null and i.borrado_en is null
    end
  order by n.creada_en desc;
$$;
