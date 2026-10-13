-- Un flujo se comenta (CEB-267). Antes no: un flujo no se marca, asi que no tenia
-- "un antes y un despues". Ahora tiene un solo hilo permanente: como nunca se
-- cierra, nunca deja de admitir comentarios. El hilo se nombra con el periodo
-- 'flujo', y solo un flujo lo usa. Lo demas, igual que en 0026 (INV-35).
create or replace function comentario_en_tarea_abierta() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  la_clase text;
begin
  new.autor := auth.uid();
  new.escrito_en := now();

  if new.imprevisto_id is not null then
    if exists (select 1 from imprevisto where id = new.imprevisto_id and (resultado is not null or borrado_en is not null)) then
      raise exception 'Una tarea marcada ya no admite comentarios' using errcode = 'check_violation';
    end if;
    return new;
  end if;

  select coalesce(tipo_corregido, tipo_generado) into la_clase from funcion where id = new.funcion_id;

  if la_clase = 'flujo' then
    if new.periodo is distinct from 'flujo' then
      raise exception 'Un flujo tiene un solo hilo' using errcode = 'check_violation';
    end if;
  elsif la_clase = 'entregable' then
    if new.periodo = 'flujo' then
      raise exception 'Solo un flujo tiene hilo permanente' using errcode = 'check_violation';
    end if;
    if exists (select 1 from marca where funcion_id = new.funcion_id and periodo = new.periodo) then
      raise exception 'Una tarea marcada ya no admite comentarios' using errcode = 'check_violation';
    end if;
  else
    raise exception 'Un area no tiene comentarios' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
