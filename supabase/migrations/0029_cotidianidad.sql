-- La cotidianidad es el resto del cargo (CEB-206, ADR 0014). Antes holgura, era
-- una funcion que el administrador daba de alta con su peso. Ahora es cien
-- menos las funciones, nunca menos del diez por ciento, y no se guarda en
-- ninguna fila: se calcula.

-- INV-14 (reescrito) · Las funciones vigentes de una persona suman a lo sumo
-- noventa. El resto es su cotidianidad. Una persona sin funciones es toda
-- cotidianidad, y tambien es valida.
create or replace function el_reparto_cuadra() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  suma int;
  quien uuid := coalesce(new.empleado_id, old.empleado_id);
begin
  select coalesce(sum(t.ponderacion), 0) into suma
  from titularidad t
  join funcion f on f.id = t.funcion_id
  where t.empleado_id = quien and t.hasta is null and t.publicado_en is not null and f.activa;

  -- La llave de servicio siembra y migra fila a fila (ver 0009).
  if coalesce((select auth.role()), '') = 'service_role' then
    return null;
  end if;

  if suma > 90 then
    raise exception 'Las funciones de esa persona suman %: su cotidianidad quedaria en %, y nunca baja de 10', suma, 100 - suma
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

-- ── La migracion ─────────────────────────────────────────────────────────
--
-- Sin aprobacion: el sistema todavia no se usa en produccion (ADR 0014).

-- Las funciones de holgura se archivan, como cualquier funcion que sale del
-- cargo: conservan su historia (ADR 0008). Su peso pasa a ser, por
-- construccion, la cotidianidad de su titular.
update funcion
set activa = false
where activa and coalesce(tipo_corregido, tipo_generado) = 'holgura';

update titularidad t
set hasta = current_date
from funcion f
where f.id = t.funcion_id and not f.activa and t.hasta is null and t.publicado_en is not null;

delete from titularidad t
using funcion f
where f.id = t.funcion_id and not f.activa and t.publicado_en is null;

-- A quien le queda la cotidianidad bajo el piso, sus funciones se recalculan en
-- proporcion hasta noventa. Es la misma aritmetica que el dominio (reescalarA):
-- se redondea cada una y el sobrante lo absorbe la que mas pesa.
do $$
declare
  persona record;
  sobra int;
begin
  for persona in
    select t.empleado_id, sum(t.ponderacion) as suma
    from titularidad t
    join funcion f on f.id = t.funcion_id
    where t.hasta is null and t.publicado_en is not null and f.activa
    group by t.empleado_id
    having sum(t.ponderacion) > 90
  loop
    update titularidad t
    set ponderacion = round(t.ponderacion * 90.0 / persona.suma)
    from funcion f
    where f.id = t.funcion_id and f.activa
      and t.empleado_id = persona.empleado_id and t.hasta is null and t.publicado_en is not null;

    select 90 - sum(t.ponderacion) into sobra
    from titularidad t
    join funcion f on f.id = t.funcion_id
    where t.empleado_id = persona.empleado_id and t.hasta is null and t.publicado_en is not null and f.activa;

    update titularidad
    set ponderacion = ponderacion + sobra
    where id = (
      select t.id
      from titularidad t
      join funcion f on f.id = t.funcion_id
      where t.empleado_id = persona.empleado_id and t.hasta is null and t.publicado_en is not null and f.activa
      order by t.ponderacion desc, t.id
      limit 1
    );
  end loop;
end;
$$;
