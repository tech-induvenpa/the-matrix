-- Cambiar el peso de UNA funcion sin rehacer el reparto entero.
--
-- El modelo dice que la ponderacion es del todo y no de la parte (ADR 0008), y
-- por eso repartir es la unidad de edicion. Pero abrir una funcion y no poder
-- tocar su peso ahi mismo es una sorpresa: es el dato que uno viene a cambiar.
--
-- Asi que se puede, y el sistema hace la parte aritmetica: las demas se
-- reacomodan a lo que queda, conservando sus proporciones. Es lo mismo que
-- hace el lado que recibe en un traspaso, y lo calcula el dominio.

create function ajustar_ponderacion(
  la_funcion uuid,
  quien uuid,
  nueva int,
  pesos_del_resto jsonb
) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  peso jsonb;
begin
  if not es_administrador() then
    raise exception 'Solo el administrador cambia una ponderacion' using errcode = 'insufficient_privilege';
  end if;

  update titularidad
  set ponderacion = nueva
  where funcion_id = la_funcion and empleado_id = quien and hasta is null and publicado_en is not null;

  if not found then
    raise exception 'Esa funcion no esta a su nombre' using errcode = 'check_violation';
  end if;

  for peso in select * from jsonb_array_elements(pesos_del_resto)
  loop
    update titularidad
    set ponderacion = (peso->>'ponderacion')::int
    where funcion_id = (peso->>'funcion_id')::uuid
      and empleado_id = quien
      and hasta is null
      and publicado_en is not null;
  end loop;
end;
$$;

grant execute on function ajustar_ponderacion(uuid, uuid, int, jsonb) to authenticated;
