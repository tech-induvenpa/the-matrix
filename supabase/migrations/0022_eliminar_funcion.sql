-- Eliminar una funcion por completo: para la que se creo por error.
--
-- Archivar (0011) la saca del cargo y conserva su historia, porque una funcion
-- tiene vida propia (ADR 0008). Eliminar la borra, y por eso solo vale para
-- una que no tiene historia que perder: sin marcas, sin atrasos, sin
-- delegaciones y sin haber pasado por otras manos. La que tiene historia se
-- archiva. Como al archivar, el reparto de su titular se reacomoda en el mismo
-- acto con los pesos que calcula el dominio.

create function eliminar_funcion(la_funcion uuid, quien uuid, pesos jsonb) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  peso jsonb;
begin
  if not es_administrador() then
    raise exception 'Solo el administrador elimina' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from marca where funcion_id = la_funcion)
     or exists (select 1 from evento_flujo where funcion_id = la_funcion)
     or exists (select 1 from imprevisto where delega_funcion = la_funcion)
     or exists (select 1 from titularidad where funcion_id = la_funcion and (empleado_id <> quien or hasta is not null))
  then
    raise exception 'Esta funcion ya tiene historia: archivala en lugar de eliminarla' using errcode = 'check_violation';
  end if;

  delete from funcion where id = la_funcion;

  for peso in select * from jsonb_array_elements(pesos)
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

revoke execute on function eliminar_funcion(uuid, uuid, jsonb) from anon, public;
grant execute on function eliminar_funcion(uuid, uuid, jsonb) to authenticated;
