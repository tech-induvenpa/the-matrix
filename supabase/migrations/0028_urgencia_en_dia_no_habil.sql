-- En un dia no habil, la urgencia se cuenta desde el habil siguiente (CEB-193):
-- un sabado, "hoy" es el lunes y "manana" el martes. El tope de 29 dias
-- habiles de un imprevisto se cuenta desde ahi, igual que en el dominio
-- (vencimientoPorUrgencia). En un dia habil no cambia nada.
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
  elsif new.vence < pedido or new.vence > sumar_habiles(habil_siguiente(pedido), 29) then
    raise exception 'Un imprevisto vence entre hoy y 29 dias habiles despues'
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
