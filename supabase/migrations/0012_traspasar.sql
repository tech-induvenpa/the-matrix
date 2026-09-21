-- Traspasar una funcion sin partirle la historia a nadie (CEB-133, ADR 0007).
--
-- Es asimetrico y tiene que serlo. Quien entrega se recalcula solo: se va la
-- funcion y el resto se reescala, porque nada cambio de valor, solo cambio el
-- total. Quien recibe no se puede calcular -- para saber cuanto pesan esos
-- puntos en su cargo haria falta saber lo que gana, y el sistema no lo sabe ni
-- lo va a saber. Ese numero lo escribe el administrador y llega aqui.
--
-- Y es una sola publicacion que toca a dos personas (INV-15): si una quedara
-- con la funcion y la otra sin ella, la funcion estaria en dos cargos; al
-- reves, en ninguno. El trigger del cien es diferido justo para esto: ninguno
-- de los dos repartos cuadra a mitad de camino.

create function traspasar(
  la_funcion uuid,
  de_quien uuid,
  a_quien uuid,
  peso_nuevo int,
  pesos_de_quien_entrega jsonb,
  pesos_de_quien_recibe jsonb
) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  peso jsonb;
begin
  if not es_administrador() then
    raise exception 'Solo el administrador traspasa' using errcode = 'insufficient_privilege';
  end if;

  if de_quien = a_quien then
    raise exception 'Esa funcion ya es suya' using errcode = 'check_violation';
  end if;

  -- La tenencia de quien entrega se cierra, no se borra: su arrastre y sus
  -- marcas se quedan con quien las hizo (INV-16, INV-17).
  update titularidad
  set hasta = current_date
  where funcion_id = la_funcion and empleado_id = de_quien and hasta is null and publicado_en is not null;

  if not found then
    raise exception 'Esa funcion no esta a nombre de quien la entrega' using errcode = 'check_violation';
  end if;

  -- Quien recibe le hace sitio: sus demas funciones conservan sus proporciones
  -- dentro de lo que queda. Cuanto sitio lo decidio el administrador al
  -- escribir el peso; repartir el resto es aritmetica.
  for peso in select * from jsonb_array_elements(pesos_de_quien_recibe)
  loop
    update titularidad
    set ponderacion = (peso->>'ponderacion')::int
    where funcion_id = (peso->>'funcion_id')::uuid
      and empleado_id = a_quien
      and hasta is null
      and publicado_en is not null;
  end loop;

  -- Y empieza una tenencia nueva, ya vigente.
  insert into titularidad (funcion_id, empleado_id, ponderacion, publicado_en)
  values (la_funcion, a_quien, peso_nuevo, now());

  -- Y el cargo de quien entrega se reacomoda con los pesos que calculo el
  -- dominio: reescalar conserva las proporciones que el administrador eligio.
  for peso in select * from jsonb_array_elements(pesos_de_quien_entrega)
  loop
    update titularidad
    set ponderacion = (peso->>'ponderacion')::int
    where funcion_id = (peso->>'funcion_id')::uuid
      and empleado_id = de_quien
      and hasta is null
      and publicado_en is not null;
  end loop;
end;
$$;

grant execute on function traspasar(uuid, uuid, uuid, int, jsonb, jsonb) to authenticated;
