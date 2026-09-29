-- El imprevisto elige su vencimiento (CEB-192, ADR 0013): quien lo anota elige
-- una urgencia de 0 a 9 y se guarda la fecha, de hoy a 29 dias habiles. Sin
-- columna nueva: el numero se deriva de la fecha.

-- La fecha que esta `n` dias habiles despues de `f`; con cero, el habil
-- siguiente o igual. Hermana de habil_siguiente y el mismo calculo que
-- Calendario.sumarHabiles: mas alla de lo cargado, cuenta de lunes a viernes.
-- ponytail: busca en los proximos ciento veinte dias. 29 habiles son unas seis
-- semanas; hace falta un bloque de colectivas de dos meses para quedarse corto.
create function sumar_habiles(f date, n int) returns date
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select case when n = 0 then habil_siguiente(f) else (
    select d::date
    from generate_series(f + 1, f + 120, interval '1 day') d
    where extract(isodow from d) < 6
      and not exists (select 1 from dia_no_habil x where d::date between x.desde and x.hasta)
    order by d
    offset n - 1
    limit 1
  ) end;
$$;

grant execute on function sumar_habiles(date, int) to authenticated;

-- INV-18 (reescrito otra vez) · Un imprevisto vence entre el dia en que se pidio
-- y 29 dias habiles despues; una delegacion, con su ocurrencia. Solo al
-- insertar: la corrida por un feriado nuevo (abajo) puede dejarlo a 30.
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
  elsif new.vence < pedido or new.vence > sumar_habiles(pedido, 29) then
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

-- INV-33 · Cargar dias no habiles nunca deja un imprevisto abierto venciendo en
-- un dia no habil, y no toca nada mas: ni marcados, ni borrados, ni ya
-- vencidos, ni delegaciones. Sin aviso ni rastro: el vencimiento se deriva del
-- pedido y la urgencia elegida, no es el juicio de nadie. Quien carga el
-- calendario no puede escribir `vence`; por eso security definer.
create function correr_imprevistos_por_feriado() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  update imprevisto
  set vence = habil_siguiente(new.hasta + 1)
  where vence between new.desde and new.hasta
    and vence >= (now() at time zone 'UTC')::date
    and resultado is null
    and borrado_en is null
    and delega_funcion is null;
  return null;
end;
$$;

create trigger correr_imprevistos_por_feriado
  after insert or update on dia_no_habil
  for each row execute function correr_imprevistos_por_feriado();
