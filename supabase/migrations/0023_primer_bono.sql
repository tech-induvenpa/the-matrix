-- El primer bono rige desde el mes en que se fija.
--
-- Un cambio rige desde el mes siguiente para no partir un mes ni reescribir
-- uno que ya empezo (INV-23). El primero no parte nada ni reescribe nada: antes
-- no habia bono. Esperar al mes siguiente dejaba a una persona nueva todo su
-- primer mes sin bono a la vista, y parecia que no se habia guardado.
create or replace function fijar_bono(el_empleado uuid, el_monto numeric) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  este date := date_trunc('month', now() at time zone 'UTC')::date;
  siguiente date := (date_trunc('month', now() at time zone 'UTC') + interval '1 month')::date;
  desde date;
begin
  if not es_administrador() then
    raise exception 'Solo el administrador fija un bono' using errcode = 'insufficient_privilege';
  end if;

  -- Sin ningun bono que ya rija, es el primero.
  desde := case
    when exists (select 1 from bono where empleado_id = el_empleado and rige_desde <= este) then siguiente
    else este
  end;

  insert into bono (empleado_id, monto, rige_desde)
  values (el_empleado, el_monto, desde)
  on conflict (empleado_id, rige_desde)
  do update set monto = excluded.monto, fijado_por = auth.uid(), fijado_en = now();

  -- Un primer bono que estaba esperando al mes siguiente ya no espera.
  if desde = este then
    delete from bono where empleado_id = el_empleado and rige_desde = siguiente;
  end if;
end;
$$;
