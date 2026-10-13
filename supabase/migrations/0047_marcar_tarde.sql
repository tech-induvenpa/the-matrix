-- Poner y quitar una marca tardia (CEB-275, ADR 0020). Lo escribe quien tiene
-- la tarea, solo si su mes ya cerro y solo si seguia sin marca: lo marcado a
-- tiempo y devolver una delegacion siguen cerrados con el mes. Un mes abierto
-- se marca por el camino de siempre. Ni el supervisor ni el administrador la
-- ponen: es de quien la hizo.

create function marcar_tarde(la_funcion uuid, el_periodo text, el_resultado text, la_razon text) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  el_mes text;
begin
  if not es_mia(la_funcion) then
    raise exception 'Eso no es tuyo' using errcode = 'insufficient_privilege';
  end if;
  select mes_de_la_ocurrencia(f.periodicidad, el_periodo) into el_mes from funcion f where f.id = la_funcion;
  if not mes_cerrado(el_mes) then
    raise exception 'Ese mes sigue abierto: se marca como siempre' using errcode = 'check_violation';
  end if;
  if exists (select 1 from marca where funcion_id = la_funcion and periodo = el_periodo) then
    raise exception 'Eso ya estaba marcado a tiempo' using errcode = 'check_violation';
  end if;
  insert into marca_tardia (funcion_id, periodo, resultado, razon)
  values (la_funcion, el_periodo, el_resultado, case when el_resultado = 'hecho' then null else nullif(btrim(la_razon), '') end);
end;
$$;

create function marcar_imprevisto_tarde(el_imprevisto uuid, el_resultado text, la_razon text) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  i imprevisto;
begin
  select * into i from imprevisto where id = el_imprevisto and soy(empleado_id) and borrado_en is null;
  if not found then
    raise exception 'Eso no es tuyo' using errcode = 'insufficient_privilege';
  end if;
  if not mes_cerrado(to_char(i.vence, 'YYYY-MM')) then
    raise exception 'Ese mes sigue abierto: se marca como siempre' using errcode = 'check_violation';
  end if;
  if i.resultado is not null then
    raise exception 'Eso ya estaba marcado a tiempo' using errcode = 'check_violation';
  end if;
  insert into marca_tardia (imprevisto_id, resultado, razon)
  values (el_imprevisto, el_resultado, case when el_resultado = 'hecho' then null else nullif(btrim(la_razon), '') end);
end;
$$;

-- Devuelven si habia una marca tardia propia que quitar: si no, la pantalla
-- sabe que lo que se rechazo era otra cosa (una marca a tiempo, ya cerrada).
create function deshacer_marca_tardia(la_funcion uuid, el_periodo text) returns boolean
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  quitadas int;
begin
  if not es_mia(la_funcion) then
    return false;
  end if;
  delete from marca_tardia where funcion_id = la_funcion and periodo = el_periodo;
  get diagnostics quitadas = row_count;
  return quitadas > 0;
end;
$$;

create function deshacer_marca_tardia_de_imprevisto(el_imprevisto uuid) returns boolean
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  quitadas int;
begin
  delete from marca_tardia m
  using imprevisto i
  where m.imprevisto_id = el_imprevisto and i.id = m.imprevisto_id and soy(i.empleado_id);
  get diagnostics quitadas = row_count;
  return quitadas > 0;
end;
$$;

grant execute on function
  marcar_tarde(uuid, text, text, text),
  marcar_imprevisto_tarde(uuid, text, text),
  deshacer_marca_tardia(uuid, text),
  deshacer_marca_tardia_de_imprevisto(uuid)
to authenticated;
