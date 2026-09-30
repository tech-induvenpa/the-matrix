-- La delegacion hereda la importancia de la funcion (CEB-243, PRD CEB-240):
-- el imprevisto que nace al delegar copia la importancia que la funcion tiene
-- ese dia. Es una copia y no una referencia: cambiar despues la funcion no
-- mueve las delegaciones ya hechas, como no se mueve su vencimiento. Devolver
-- a otra persona pasa por aqui, asi que la delegacion nueva copia la vigente.
--
-- Lo demas, igual que en 0021.
create or replace function delegar(la_funcion uuid, el_periodo text, a_quien uuid, el_vence date) returns uuid
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  el_texto text;
  el_tipo text;
  la_importancia smallint;
  nueva uuid;
begin
  if not a_mi_cargo(a_quien) then
    raise exception 'Esa persona no esta a tu cargo' using errcode = 'insufficient_privilege';
  end if;
  if not es_mia(la_funcion) then
    raise exception 'Esa ocurrencia no es tuya' using errcode = 'insufficient_privilege';
  end if;

  select texto, coalesce(tipo_corregido, tipo_generado), importancia
  into el_texto, el_tipo, la_importancia
  from funcion where id = la_funcion;
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

  insert into imprevisto (empleado_id, texto, vence, importancia, pedido_por, delega_funcion, delega_periodo)
  values (a_quien, el_texto, el_vence, la_importancia, auth.uid(), la_funcion, el_periodo)
  returning id into nueva;
  return nueva;
end;
$$;
