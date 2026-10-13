-- Avisos de vencimiento (CEB-271). A 2 y a 1 dias habiles de vencer, un solo
-- aviso por persona y por dia de aviso, no uno por tarea. Que tareas son, lo
-- decide el dominio al cargar la campanita (las ocurrencias son calculadas, no
-- tienen evento de nacimiento); la base solo guarda que ese aviso ya existe y
-- no deja duplicarlo. La lista y la cuenta se calculan al abrir, asi que una
-- tarea marcada desaparece sola.

alter table notificacion drop constraint notificacion_tipo_check;
alter table notificacion add constraint notificacion_tipo_check
  check (tipo in ('comentario', 'imprevisto', 'delegacion_marcada', 'delegacion_devuelta', 'vencimiento'));

-- Un vencimiento no apunta a una tarea: su `periodo` es '<dia>:<cuantos faltan>'.
alter table notificacion drop constraint de_una_sola_tarea;
alter table notificacion add constraint de_una_sola_tarea check (
  case when tipo = 'vencimiento'
    then num_nonnulls(funcion_id, imprevisto_id) = 0 and periodo ~ '^\d{4}-\d{2}-\d{2}:[12]$'
    else num_nonnulls(funcion_id, imprevisto_id) = 1 and (funcion_id is null) = (periodo is null)
  end
);

-- INV-64 · Uno por persona y por dia de aviso, visto o no: recalcular no lo
-- resucita ni lo duplica.
create unique index notificacion_vencimiento_idx on notificacion (usuario, periodo) where tipo = 'vencimiento';

-- El dia lo trae la aplicacion, que es la que cuenta los habiles. Solo escribe
-- para quien llama: lo peor que logra un token tramposo es avisarse a si mismo.
create function registrar_vencimiento(el_dia date, los_faltan int) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if los_faltan not in (1, 2) then
    raise exception 'Solo se avisa a 2 o a 1 dia' using errcode = 'check_violation';
  end if;
  if auth.uid() is null then
    raise exception 'Sin sesion' using errcode = 'insufficient_privilege';
  end if;

  insert into notificacion (usuario, tipo, periodo)
  values (auth.uid(), 'vencimiento', el_dia::text || ':' || los_faltan)
  on conflict (usuario, periodo) where tipo = 'vencimiento' do nothing;
end;
$$;

-- La campanita: igual que antes, y el vencimiento sin sus joins de tarea.
create or replace function mis_notificaciones() returns table (
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
      when n.tipo = 'vencimiento' then true
      when n.tipo in ('delegacion_marcada', 'delegacion_devuelta') then i.borrado_en is null
      when n.imprevisto_id is null then not exists (select 1 from marca m where m.funcion_id = n.funcion_id and m.periodo = n.periodo)
      else i.resultado is null and i.borrado_en is null
    end
  order by n.vista_en is not null, n.creada_en desc;
$$;

revoke execute on function registrar_vencimiento(date, int) from anon, public;
grant execute on function registrar_vencimiento(date, int) to authenticated;
