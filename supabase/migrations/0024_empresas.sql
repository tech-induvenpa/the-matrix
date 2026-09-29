-- Cada empleado pertenece a una empresa del grupo (CEB-184): KIA, Changan,
-- Toyota, Induvenpa u Holding, la de quien trabaja para el grupo. Y puede tener
-- una sede, uno de los concesionarios de su empresa; sin sede es todas las de
-- su empresa. Agrupan y no limitan nada: no tocan supervision, traspaso ni
-- calendario.
--
-- Fijas: las empresas entran aqui y las sedes con la carga de la gente
-- (CEB-191). No hay pantalla para editarlas.

create table empresa (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

insert into empresa (nombre) values ('KIA'), ('Changan'), ('Toyota'), ('Induvenpa'), ('Holding');

create table sede (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa (id),
  nombre text not null,
  unique (empresa_id, nombre),
  -- El blanco de la clave compuesta de empleado.
  unique (id, empresa_id)
);

-- INV-30 por construccion: la sede de alguien es de su empresa, porque la
-- clave apunta al par. Sin el check, una sede sin empresa se colaria: una
-- clave compuesta con un nulo no se comprueba.
-- ponytail: empresa_id nullable hasta que CEB-191 cargue a la gente de hoy;
-- ahi pasa a not null.
alter table empleado
  add column empresa_id uuid references empresa (id),
  add column sede_id uuid,
  add constraint sede_de_su_empresa foreign key (sede_id, empresa_id) references sede (id, empresa_id),
  add constraint sede_con_empresa check (sede_id is null or empresa_id is not null);

-- Son nombres del grupo, no datos de nadie: los lee cualquiera con sesion.
alter table empresa enable row level security;
alter table sede enable row level security;
create policy "cualquiera lee las empresas" on empresa for select to authenticated using (true);
create policy "cualquiera lee las sedes" on sede for select to authenticated using (true);
grant select on empresa, sede to authenticated;
grant select, insert, update, delete on empresa, sede to service_role;

-- INV-31: solo el administrador escribe la empresa y la sede, y solo por aqui.
-- Nadie tiene update sobre empleado; estas funciones son la unica puerta.
-- La empresa es obligatoria desde la pantalla y desde la base.
drop function dar_de_alta(text, text);

create function dar_de_alta(el_nombre text, el_correo text, la_empresa uuid, la_sede uuid default null) returns uuid
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
  if la_empresa is null then
    raise exception 'Toda persona es de una empresa' using errcode = 'not_null_violation';
  end if;

  select id into usuario from auth.users where email = lower(el_correo);

  if usuario is null then
    usuario := gen_random_uuid();

    -- Las columnas de token van en cadena vacia: ver 0013.
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

  insert into empleado (nombre_bloque, correo, auth_user_id, empresa_id, sede_id)
  values (el_nombre, lower(el_correo), usuario, la_empresa, la_sede)
  on conflict (correo) do update set
    auth_user_id = excluded.auth_user_id,
    nombre_bloque = excluded.nombre_bloque,
    empresa_id = excluded.empresa_id,
    sede_id = excluded.sede_id;

  return usuario;
end;
$$;

revoke execute on function dar_de_alta(text, text, uuid, uuid) from anon, public;
grant execute on function dar_de_alta(text, text, uuid, uuid) to authenticated;

-- Cambiar de empresa manda la sede nueva en el mismo acto: la pantalla ofrece
-- empresa y sede en un solo desplegable, asi que nunca queda una sede vieja.
-- Si alguien la manda cruzada, la clave compuesta la rechaza.
drop function editar_empleado(uuid, text, text);

create function editar_empleado(el_empleado uuid, el_nombre text, el_correo text, la_empresa uuid, la_sede uuid default null) returns void
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
  if la_empresa is null then
    raise exception 'Toda persona es de una empresa' using errcode = 'not_null_violation';
  end if;

  select auth_user_id, correo into usuario, antes from empleado where id = el_empleado;
  if not found then
    raise exception 'Esa persona no existe' using errcode = 'check_violation';
  end if;

  update empleado
  set nombre_bloque = el_nombre, correo = lower(el_correo), empresa_id = la_empresa, sede_id = la_sede
  where id = el_empleado;

  -- El correo se cambia tambien donde se comprueba al entrar: ver 0016.
  if usuario is not null and lower(el_correo) <> lower(antes) then
    update auth.users set email = lower(el_correo), updated_at = now() where id = usuario;

    update auth.identities
    set identity_data = identity_data || jsonb_build_object('email', lower(el_correo)),
        updated_at = now()
    where user_id = usuario and provider = 'email';
  end if;

  if usuario is null then
    perform dar_de_alta(el_nombre, el_correo, la_empresa, la_sede);
  end if;
end;
$$;

revoke execute on function editar_empleado(uuid, text, text, uuid, uuid) from anon, public;
grant execute on function editar_empleado(uuid, text, text, uuid, uuid) to authenticated;

-- El supervisor ve de donde es su gente. El filtro se aplica sobre esto, en
-- el servidor: nunca es un parametro que amplie la consulta (INV-29).
create or replace function lo_de_mi_gente() returns jsonb
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  with gente as (
    select e.id, e.nombre_bloque, e.empresa_id, e.sede_id
    from empleado e
    join empleado s on s.id = e.supervisor_id
    where s.auth_user_id = (select auth.uid())
  ),
  tenencias as (
    select t.funcion_id, t.empleado_id, t.desde
    from titularidad t
    join gente g on g.id = t.empleado_id
    where t.hasta is null and t.publicado_en is not null
  )
  select jsonb_build_object(
    'gente', (
      select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'nombre', g.nombre_bloque, 'empresa', g.empresa_id, 'sede', g.sede_id) order by g.nombre_bloque), '[]')
      from gente g
    ),
    'funciones', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', f.id,
        'empleado_id', t.empleado_id,
        'texto', f.texto,
        'importancia', f.importancia,
        'periodicidad', f.periodicidad,
        'tipo', coalesce(f.tipo_corregido, f.tipo_generado),
        'dia_tope', coalesce(f.dia_tope_corregido, f.dia_tope_generado),
        'fecha_alta', f.fecha_alta,
        'desde', t.desde
      )), '[]')
      from tenencias t
      join funcion f on f.id = t.funcion_id
      where f.activa
    ),
    'marcas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'funcion_id', m.funcion_id, 'periodo', m.periodo, 'resultado', m.resultado, 'razon', m.razon, 'marcada_en', m.marcada_en
      )), '[]')
      from marca m
      join tenencias t on t.funcion_id = m.funcion_id
      where (m.marcada_en at time zone 'UTC')::date >= t.desde
    ),
    'eventos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'funcion_id', e.funcion_id, 'estado', e.estado, 'razon', e.razon, 'en', e.en
      ) order by e.en), '[]')
      from evento_flujo e
      join tenencias t on t.funcion_id = e.funcion_id
      where (e.en at time zone 'UTC')::date >= t.desde
    ),
    -- Dos meses, y lo que siga abierto: lo mismo que ve el empleado.
    'imprevistos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id, 'empleado_id', i.empleado_id, 'texto', i.texto, 'pedido_en', i.pedido_en, 'vence', i.vence,
        'pedido_por', i.pedido_por, 'pedido_por_otro', i.pedido_por_otro, 'resultado', i.resultado, 'razon', i.razon,
        'marcada_en', i.marcada_en, 'delega_funcion', i.delega_funcion, 'devuelto_en', i.devuelto_en,
        'devuelto_razon', i.devuelto_razon
      ) order by i.pedido_en), '[]')
      from imprevisto i
      join gente g on g.id = i.empleado_id
      where i.borrado_en is null and (i.pedido_en >= now() - interval '62 days' or i.resultado is null)
    )
  );
$$;
