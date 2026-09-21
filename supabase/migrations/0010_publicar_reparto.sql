-- Publicar un reparto es una sola cosa, aunque toque varias filas: o entra
-- entero o no entra (CEB-132). Por eso vive en la base y no en tres llamadas
-- desde el servidor, que podrian quedarse a medias.

create function publicar_reparto(quien uuid) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if not es_administrador() then
    raise exception 'Solo el administrador publica un reparto' using errcode = 'insufficient_privilege';
  end if;

  -- Un cambio de peso no es un cambio de manos. Se corrige en su sitio, para
  -- que el historial de titulares no se ensucie con filas que no son
  -- traspasos: quien mire por cuantas manos paso una funcion tiene que ver
  -- manos, no publicaciones.
  update titularidad vigente
  set ponderacion = borrador.ponderacion
  from titularidad borrador
  where vigente.empleado_id = quien
    and vigente.hasta is null
    and vigente.publicado_en is not null
    and borrador.empleado_id = quien
    and borrador.publicado_en is null
    and borrador.funcion_id = vigente.funcion_id;

  -- Lo que el borrador ya no trae sale del cargo. No se borra: se cierra, y su
  -- historial se queda con quien la tuvo.
  update titularidad vigente
  set hasta = current_date
  where vigente.empleado_id = quien
    and vigente.hasta is null
    and vigente.publicado_en is not null
    and not exists (
      select 1 from titularidad b
      where b.empleado_id = quien and b.publicado_en is null and b.funcion_id = vigente.funcion_id
    );

  -- Lo que el borrador trae y no estaba, entra.
  update titularidad borrador
  set publicado_en = now()
  where borrador.empleado_id = quien
    and borrador.publicado_en is null
    and not exists (
      select 1 from titularidad v
      where v.empleado_id = quien and v.hasta is null and v.publicado_en is not null
        and v.funcion_id = borrador.funcion_id
    );

  -- Lo que quedaba del borrador ya se aplico sobre la fila vigente.
  delete from titularidad where empleado_id = quien and publicado_en is null;
end;
$$;

grant execute on function publicar_reparto(uuid) to authenticated;
