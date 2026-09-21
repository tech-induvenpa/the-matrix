-- El reparto se edita en borrador y se publica (CEB-132, ADR 0008).
--
-- Lo que se pierde al matar el importador no es solo la traduccion: era el acto
-- de publicar. ADR 0001 lo decia -- "una edicion de JFS no cambia el plan de
-- nadie hasta que alguien importa y revisa. Es deliberado". El borrador lo
-- repone.
--
-- Descartada una tabla aparte para los borradores: seria duplicar la forma del
-- reparto y mantener dos. Un borrador es una titularidad que todavia no esta
-- vigente, y eso es una columna.

alter table titularidad add column publicado_en timestamptz;

-- Lo que ya existe estaba vigente, asi que estaba publicado.
update titularidad set publicado_en = now() where hasta is null;

-- Una funcion tiene un titular publicado a la vez. El indice de antes no
-- distinguia borradores, asi que un borrador habria chocado con lo vigente.
drop index titularidad_vigente_idx;
create unique index titularidad_vigente_idx
  on titularidad (funcion_id)
  where hasta is null and publicado_en is not null;

-- Y un borrador por funcion: dos propuestas a la vez para la misma cosa no
-- significan nada.
create unique index titularidad_borrador_idx
  on titularidad (funcion_id)
  where publicado_en is null;

-- Que la funcion sea mia no hace mios todos sus vinculos: el borrador que el
-- administrador esta pensando cuelga de la misma funcion, y sin esto se cuela
-- por el embed (INV-13). Lo aprendimos con la prueba en rojo.
drop policy "cada quien ve sus titularidades" on titularidad;
create policy "cada quien ve sus titularidades"
  on titularidad for select to authenticated
  using (es_mia(funcion_id) and hasta is null and publicado_en is not null);

create index titularidad_publicada_idx
  on titularidad (empleado_id)
  where hasta is null and publicado_en is not null;

-- INV-13: un borrador nunca llega a la pantalla de un empleado. La regla vive
-- en es_mia(), que es lo que miran todas las politicas: mio es lo que esta
-- vigente Y publicado.
create or replace function es_mia(funcion uuid) returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from titularidad t
    join empleado e on e.id = t.empleado_id
    where t.funcion_id = funcion
      and t.hasta is null
      and t.publicado_en is not null
      and e.auth_user_id = (select auth.uid())
  );
$$;

-- INV-14: un reparto que no suma cien no se publica, y lo defiende la base, no
-- el formulario. Se comprueba al publicar, sobre lo que quedaria vigente.
create function el_reparto_cuadra() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  suma int;
  cuantas int;
  quien uuid := coalesce(new.empleado_id, old.empleado_id);
begin
  select count(*), coalesce(sum(t.ponderacion), 0) into cuantas, suma
  from titularidad t
  join funcion f on f.id = t.funcion_id
  where t.empleado_id = quien and t.hasta is null and t.publicado_en is not null and f.activa;

  -- La llave de servicio siembra y migra, fila a fila, y no puede cuadrar cien
  -- en cada paso. Es la misma puerta que ya se salta la seguridad por fila y
  -- que no entra al servidor web (ADR 0004): lo que INV-14 protege es el camino
  -- del administrador, que es el unico que quedara.
  if coalesce((select auth.role()), '') = 'service_role' then
    return null;
  end if;

  -- Un cargo sin nada vigente no es un reparto roto: es alguien que todavia no
  -- tiene nada, o a quien se le esta quitando todo. Lo que INV-14 protege es
  -- publicar un reparto que no cuadra, no la ausencia de reparto.
  if cuantas = 0 then
    return null;
  end if;

  if suma <> 100 then
    raise exception 'El reparto de esa persona suma %, no cien', suma
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

-- Diferido hasta el final de la transaccion: un traspaso toca dos repartos y
-- ninguno de los dos cuadra a mitad de camino (CEB-133).
create constraint trigger el_reparto_cuadra_al_publicar
  after insert or update or delete on titularidad
  deferrable initially deferred
  for each row
  execute function el_reparto_cuadra();
