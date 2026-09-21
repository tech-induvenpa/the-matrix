-- Dar de alta a alguien es lo que hoy hace `pnpm acceso` por terminal
-- (CEB-134). Sin esto, el administrador depende de alguien tecnico para la
-- operacion mas basica del sistema.
--
-- Crear el usuario de autenticacion pide privilegios que una sesion normal no
-- tiene. La salida facil seria meter la llave de servicio en el servidor web, y
-- es justo lo que ADR 0004 evita: hoy un fallo en la web expone como mucho lo
-- de quien este conectado, y con esa llave dentro expondria todo. Asi que el
-- privilegio se queda aqui, en una funcion que solo sabe hacer una cosa.
--
-- ponytail: escribe en auth.users y auth.identities a mano, que es fragil ante
-- un cambio de Supabase. El techo esta medido: si cambian esas tablas, el alta
-- deja de funcionar y la prueba de INV-2 lo dice en la siguiente corrida. La
-- alternativa -- un servicio aparte con la llave -- cuesta mas de lo que este
-- riesgo vale para nueve personas.
--
-- Las columnas de token van en cadena vacia y no en nulo. Con nulo, la fila se
-- inserta sin quejarse y despues gotrue no puede leer NINGUN usuario: el fallo
-- no aparece en el alta, aparece en el siguiente inicio de sesion de cualquier
-- otra persona, como "Database error checking email". Se aprendio rompiendolo.

-- Los parametros llevan prefijo porque `correo` y `nombre` chocan con las
-- columnas de empleado, y Postgres no sabe a cual te refieres.
create function dar_de_alta(el_nombre text, el_correo text) returns uuid
  language plpgsql
  security definer
  set search_path = public, auth, pg_temp
as $$
declare
  usuario uuid;
begin
  if not es_administrador() then
    raise exception 'Solo el administrador da de alta' using errcode = 'insufficient_privilege';
  end if;

  select id into usuario from auth.users where email = lower(el_correo);

  if usuario is null then
    usuario := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_sso_user, is_anonymous,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current, phone_change,
      phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', usuario, 'authenticated', 'authenticated',
      lower(el_correo), now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      false, false,
      '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      usuario::text, usuario,
      jsonb_build_object('sub', usuario::text, 'email', lower(el_correo), 'email_verified', true),
      'email', now(), now(), now()
    );
  end if;

  -- El alta no esta completa hasta que el vinculo existe: sin el, la persona
  -- entra y no ve nada, porque la seguridad por fila cuelga de ahi.
  insert into empleado (nombre_bloque, correo, auth_user_id)
  values (el_nombre, lower(el_correo), usuario)
  on conflict (correo) do update set auth_user_id = excluded.auth_user_id, nombre_bloque = excluded.nombre_bloque;

  return usuario;
end;
$$;

grant execute on function dar_de_alta(text, text) to authenticated;

-- Y el calendario, que el administrador mantiene desde su pantalla (CEB-135).
grant insert, update, delete on dia_no_habil to authenticated;
grant update on calendario to authenticated;

create policy "el administrador carga dias no habiles"
  on dia_no_habil for insert to authenticated
  with check (es_administrador());

create policy "el administrador quita dias no habiles"
  on dia_no_habil for delete to authenticated
  using (es_administrador());

create policy "el administrador declara hasta donde reviso"
  on calendario for update to authenticated
  using (es_administrador())
  with check (es_administrador());
