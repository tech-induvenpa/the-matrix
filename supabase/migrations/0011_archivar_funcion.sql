-- Archivar una funcion la saca del plan y la saca del cargo, en un solo acto.
--
-- Si solo la archivara, el reparto de su titular se quedaria corto en silencio:
-- la persona seguiria vigente sumando noventa, y nadie se enteraria hasta la
-- siguiente publicacion. Los pesos nuevos los calcula el dominio (reescalar
-- conserva las proporciones que el administrador eligio) y aqui solo se
-- aplican, porque la aritmetica no es cosa de la base.

create function archivar_funcion(la_funcion uuid, quien uuid, pesos jsonb) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  peso jsonb;
begin
  if not es_administrador() then
    raise exception 'Solo el administrador archiva' using errcode = 'insufficient_privilege';
  end if;

  update funcion set activa = false where id = la_funcion;

  update titularidad
  set hasta = current_date
  where funcion_id = la_funcion and empleado_id = quien and hasta is null;

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

grant execute on function archivar_funcion(uuid, uuid, jsonb) to authenticated;
