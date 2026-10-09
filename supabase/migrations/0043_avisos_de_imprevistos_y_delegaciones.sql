-- Avisos de imprevistos y delegaciones, y la lista de la campanita (CEB-269,
-- CEB-270). Un imprevisto o una delegacion que te llega, una delegacion que
-- diste y fue marcada, una delegacion que recibiste y fue devuelta.

alter table notificacion drop constraint notificacion_tipo_check;
alter table notificacion add constraint notificacion_tipo_check
  check (tipo in ('comentario', 'imprevisto', 'delegacion_marcada', 'delegacion_devuelta'));

-- ── Los avisos por trigger ───────────────────────────────────────────────
--
-- Un imprevisto avisa a quien lo recibe cuando se lo pidio otro. Marcar una
-- delegacion avisa a quien la dio; devolverla, a quien la tenia. Quien no ha
-- entrado todavia (sin auth_user_id) no tiene a quien avisar.
create function avisar_imprevisto() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  es_delegacion boolean := new.delega_funcion is not null or new.delega_imprevisto is not null;
begin
  if tg_op = 'INSERT' then
    insert into notificacion (usuario, tipo, imprevisto_id)
    select e.auth_user_id, 'imprevisto', new.id
    from empleado e
    where e.id = new.empleado_id and e.auth_user_id is not null
      and new.pedido_por is not null and new.pedido_por <> e.auth_user_id;

  elsif old.resultado is null and new.resultado is not null and es_delegacion and new.pedido_por is not null then
    insert into notificacion (usuario, tipo, imprevisto_id)
    values (new.pedido_por, 'delegacion_marcada', new.id)
    on conflict (usuario, tipo, funcion_id, periodo, imprevisto_id) where vista_en is null
    do update set creada_en = now();

  elsif old.devuelto_en is null and new.devuelto_en is not null then
    insert into notificacion (usuario, tipo, imprevisto_id)
    select e.auth_user_id, 'delegacion_devuelta', new.id
    from empleado e
    where e.id = new.empleado_id and e.auth_user_id is not null
    on conflict (usuario, tipo, funcion_id, periodo, imprevisto_id) where vista_en is null
    do update set creada_en = now();
  end if;

  return new;
end;
$$;

create trigger avisar_imprevisto_nuevo
  after insert on imprevisto
  for each row execute function avisar_imprevisto();

create trigger avisar_imprevisto_cambiado
  after update of resultado, devuelto_en on imprevisto
  for each row execute function avisar_imprevisto();

-- ── Marcar todas ─────────────────────────────────────────────────────────

create function marcar_notificaciones_vistas() returns void
  language sql
  security definer
  set search_path = public, pg_temp
as $$
  update notificacion set vista_en = now() where usuario = (select auth.uid()) and vista_en is null;
$$;

-- ── Lo que lee la campanita ──────────────────────────────────────────────
--
-- Las sin ver, y las vistas de los ultimos 30 dias. De las sin ver, las de
-- comentario y de un imprevisto recibido dejan de contar cuando la tarea se
-- marca (se calcula al leer: deshacer la marca las devuelve). Las de una
-- delegacion marcada o devuelta cuentan justamente porque ya hay marca.
drop function mis_notificaciones();
create function mis_notificaciones() returns table (
  id uuid,
  tipo text,
  funcion_id uuid,
  periodo text,
  imprevisto_id uuid,
  cantidad int,
  creada_en timestamptz,
  vista_en timestamptz,
  texto text,
  empleado_id uuid
)
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select n.id, n.tipo, n.funcion_id, n.periodo, n.imprevisto_id, n.cantidad, n.creada_en, n.vista_en,
         coalesce(i.texto, f.texto),
         coalesce(i.empleado_id, t.empleado_id)
  from notificacion n
  left join imprevisto i on i.id = n.imprevisto_id
  left join funcion f on f.id = n.funcion_id
  left join titularidad t on t.funcion_id = n.funcion_id and t.hasta is null and t.publicado_en is not null
  where n.usuario = (select auth.uid())
    and case
      when n.vista_en is not null then n.vista_en > now() - interval '30 days'
      when n.tipo in ('delegacion_marcada', 'delegacion_devuelta') then i.borrado_en is null
      when n.imprevisto_id is null then not exists (select 1 from marca m where m.funcion_id = n.funcion_id and m.periodo = n.periodo)
      else i.resultado is null and i.borrado_en is null
    end
  order by n.vista_en is not null, n.creada_en desc;
$$;

revoke execute on function
  avisar_comentario(),
  avisar_imprevisto(),
  mis_notificaciones(),
  marcar_notificaciones_vistas()
from anon, public;

grant execute on function mis_notificaciones(), marcar_notificaciones_vistas() to authenticated;
