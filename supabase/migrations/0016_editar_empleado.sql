-- Editar a una persona: su nombre y su correo (CEB-134, continuacion).
--
-- El nombre que hay viene del Excel, donde era el titulo de un bloque: hay
-- gente llamada "YANIRA (KIA" porque el parentesis se partio al leer. Y los
-- correos son inventados, porque nadie tenia el real cuando se sembro.
--
-- El correo no es un dato mas: es como entra esa persona. Cambiarlo en
-- `empleado` y no en auth dejaria a alguien sin poder entrar y sin que nadie se
-- entere hasta que lo intente. Por eso se cambian los dos aqui, en un solo
-- acto, con el mismo criterio que dar_de_alta: el privilegio se queda en la
-- base y no entra al servidor web (ADR 0004).

create function editar_empleado(el_empleado uuid, el_nombre text, el_correo text) returns void
  language plpgsql
  security definer
  set search_path = public, auth, pg_temp
as $$
declare
  usuario uuid;
  antes text;
begin
  if not es_administrador() then
    raise exception 'Solo el administrador edita a la gente' using errcode = 'insufficient_privilege';
  end if;

  select auth_user_id, correo into usuario, antes from empleado where id = el_empleado;
  if not found then
    raise exception 'Esa persona no existe' using errcode = 'check_violation';
  end if;

  update empleado
  set nombre_bloque = el_nombre, correo = lower(el_correo)
  where id = el_empleado;

  -- Si el correo cambio, tiene que cambiar tambien donde se comprueba al
  -- entrar. `identities` lleva su propia copia y gotrue la mira.
  if usuario is not null and lower(el_correo) <> lower(antes) then
    update auth.users set email = lower(el_correo), updated_at = now() where id = usuario;

    update auth.identities
    set identity_data = identity_data || jsonb_build_object('email', lower(el_correo)),
        updated_at = now()
    where user_id = usuario and provider = 'email';
  end if;

  -- Quien no tenia acceso lo gana al ponerle un correo de verdad.
  if usuario is null then
    perform dar_de_alta(el_nombre, el_correo);
  end if;
end;
$$;

grant execute on function editar_empleado(uuid, text, text) to authenticated;
