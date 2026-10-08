-- La empresa acota (CEB-259, ADR 0019). Hay dos administradores: el general,
-- que ve todo, y el de empresa, que solo ve y toca a la gente de la suya.
--
-- `es_administrador()` no cambia: sigue siendo "cualquier administrador", asi
-- que las compuertas que ya existen siguen abriendo. El limite se suma encima,
-- y de dos formas que no dependen de que cada funcion se acuerde de aplicarlo:
--   * politicas RESTRICTIVE, que se suman con AND a las de siempre (lectura y
--     escritura directa), y
--   * disparadores, que las funciones `security definer` no se pueden saltar
--     porque auth.uid() sale del token de la sesion, no del dueno de la funcion.
-- El service_role (scripts, pruebas) no es administrador: nada de esto lo toca.

-- ---------------------------------------------------------------- el modelo

alter table administrador
  add column nombre text,
  add column correo text,
  add column empresa_id uuid references empresa (id);

-- El administrador de hoy es el general: empresa nula. Su correo sale de la
-- cuenta de acceso.
update administrador a
set correo = lower(u.email), nombre = split_part(u.email, '@', 1)
from auth.users u
where u.id = a.auth_user_id;

alter table administrador
  alter column nombre set not null,
  alter column correo set not null,
  add constraint administrador_correo_unico unique (correo);

-- ------------------------------------------------------------- los papeles

create function es_administrador_general() returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (select 1 from administrador where auth_user_id = (select auth.uid()) and empresa_id is null);
$$;

create function es_administrador_de_empresa() returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (select 1 from administrador where auth_user_id = (select auth.uid()) and empresa_id is not null);
$$;

create function empresa_del_administrador() returns uuid
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select empresa_id from administrador where auth_user_id = (select auth.uid());
$$;

-- Puede el administrador que mira actuar sobre este empleado? El general, sobre
-- todos; el de empresa, sobre los de su empresa. Quien no es administrador, no.
create function administra_a(el_empleado uuid) returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select es_administrador_general() or (
    es_administrador_de_empresa()
    and exists (select 1 from empleado where id = el_empleado and empresa_id = empresa_del_administrador())
  );
$$;

-- Una funcion es de la empresa de su ultimo titular: si cambio de manos, el
-- administrador de la anterior deja de verla. Una recien creada no tiene
-- titular aun, y se ve hasta que se reparte.
-- ponytail: la funcion sin titular se ve desde cualquier empresa; dura lo que
-- tarda el reparto en asignarla.
create function administra_funcion(la_funcion uuid) returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select es_administrador_general() or (
    es_administrador_de_empresa()
    and (
      not exists (select 1 from titularidad where funcion_id = la_funcion)
      or exists (
        select 1
        from empleado e
        where e.empresa_id = empresa_del_administrador()
          and e.id = (
            select t.empleado_id from titularidad t
            where t.funcion_id = la_funcion
            order by t.hasta desc nulls first, t.desde desc
            limit 1
          )
      )
    )
  );
$$;

grant execute on function es_administrador_general(), es_administrador_de_empresa(),
  empresa_del_administrador(), administra_a(uuid), administra_funcion(uuid) to authenticated;

-- El general lee la lista de administradores; nadie la escribe con un token de
-- sesion (INV-58): se escribe por alta_de_administrador.
grant select on administrador to authenticated;
create policy "el general ve a los administradores"
  on administrador for select to authenticated
  using (es_administrador_general());

-- --------------------------------------------------------------- lo que se lee

do $$
declare
  por_empleado text[] := array['bono', 'foto_del_cierre', 'historial_del_reparto', 'imprevisto', 'titularidad', 'total_al_reabrir'];
  por_funcion text[] := array['marca', 'evento_flujo'];
  t text;
begin
  foreach t in array por_empleado loop
    execute format(
      'create policy "la empresa acota al administrador de empresa" on %I as restrictive for all to authenticated
       using (not es_administrador_de_empresa() or administra_a(empleado_id))
       with check (not es_administrador_de_empresa() or administra_a(empleado_id))', t);
  end loop;
  foreach t in array por_funcion loop
    execute format(
      'create policy "la empresa acota al administrador de empresa" on %I as restrictive for all to authenticated
       using (not es_administrador_de_empresa() or administra_funcion(funcion_id))
       with check (not es_administrador_de_empresa() or administra_funcion(funcion_id))', t);
  end loop;
end $$;

create policy "la empresa acota al administrador de empresa" on empleado as restrictive for all to authenticated
  using (not es_administrador_de_empresa() or administra_a(id))
  with check (not es_administrador_de_empresa() or administra_a(id));

create policy "la empresa acota al administrador de empresa" on funcion as restrictive for all to authenticated
  using (not es_administrador_de_empresa() or administra_funcion(id))
  with check (not es_administrador_de_empresa() or administra_funcion(id));

create policy "la empresa acota al administrador de empresa" on intromision as restrictive for all to authenticated
  using (not es_administrador_de_empresa() or administra_a((select i.empleado_id from imprevisto i where i.id = imprevisto_id)))
  with check (not es_administrador_de_empresa() or administra_a((select i.empleado_id from imprevisto i where i.id = imprevisto_id)));

-- Los comentarios y las tareas calculadas pasan por estas dos funciones, que
-- abrian a cualquier administrador.
create or replace function puede_ver_tarea(la_funcion uuid, el_imprevisto uuid) returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select case
    when es_administrador_general() then true
    when es_administrador_de_empresa() then
      case when el_imprevisto is not null
        then administra_a((select i.empleado_id from imprevisto i where i.id = el_imprevisto))
        else administra_funcion(la_funcion)
      end
    else case
      when el_imprevisto is not null then exists (
        select 1 from imprevisto i
        where i.id = el_imprevisto
          and (soy(i.empleado_id) or a_mi_cargo(i.empleado_id) or i.pedido_por = (select auth.uid()))
      )
      else exists (
        select 1 from titularidad t
        where t.funcion_id = la_funcion and t.hasta is null and t.publicado_en is not null
          and (soy(t.empleado_id) or a_mi_cargo(t.empleado_id))
      )
    end
  end;
$$;

create or replace function tareas_de(el_empleado uuid) returns jsonb
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  with tenencias as (
    select t.funcion_id, t.desde
    from titularidad t
    where t.empleado_id = el_empleado and t.hasta is null and t.publicado_en is not null
  )
  select case when a_mi_cargo(el_empleado) or administra_a(el_empleado) then jsonb_build_object(
    'funciones', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', f.id,
        'texto', f.texto,
        'importancia', f.importancia,
        'periodicidad', f.periodicidad,
        'dia_tope', coalesce(f.dia_tope_corregido, f.dia_tope_generado),
        'fecha_alta', f.fecha_alta,
        'desde', t.desde
      )), '[]')
      from tenencias t
      join funcion f on f.id = t.funcion_id
      where f.activa and coalesce(f.tipo_corregido, f.tipo_generado) = 'entregable'
    ),
    'marcas', (
      select coalesce(jsonb_agg(jsonb_build_object('funcion_id', m.funcion_id, 'periodo', m.periodo)), '[]')
      from marca m
      join tenencias t on t.funcion_id = m.funcion_id
    ),
    'imprevistos', (
      select coalesce(jsonb_agg(to_jsonb(i) order by i.vence), '[]')
      from imprevisto i
      where i.empleado_id = el_empleado and i.resultado is null and i.borrado_en is null
    )
  ) end;
$$;

-- --------------------------------------------------------------- lo que se escribe

create function empresa_ajena() returns void
  language plpgsql
as $$
begin
  raise exception 'Eso es de otra empresa' using errcode = 'insufficient_privilege';
end;
$$;

-- Empleados: el de empresa solo crea, edita y borra a los suyos, y no los cambia
-- de empresa (el cambio es del general).
create function acotar_empleado() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if es_administrador_de_empresa() then
    if tg_op <> 'INSERT' and old.empresa_id is distinct from empresa_del_administrador() then
      perform empresa_ajena();
    end if;
    if tg_op <> 'DELETE' and new.empresa_id is distinct from empresa_del_administrador() then
      perform empresa_ajena();
    end if;
  end if;
  return case tg_op when 'DELETE' then old else new end;
end;
$$;

create trigger acotar_empleado before insert or update or delete on empleado
  for each row execute function acotar_empleado();

-- INV-57: el supervisor de alguien es de su misma empresa, lo escriba quien lo
-- escriba. Sin empresa (aun hay gente sin cargar) no hay con que comparar.
create function supervisor_de_la_misma_empresa() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if new.supervisor_id is not null and new.empresa_id is not null and exists (
    select 1 from empleado s
    where s.id = new.supervisor_id and s.empresa_id is not null and s.empresa_id <> new.empresa_id
  ) then
    raise exception 'El supervisor es de otra empresa' using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE' and new.empresa_id is not null and new.empresa_id is distinct from old.empresa_id and exists (
    select 1 from empleado e
    where e.supervisor_id = new.id and e.empresa_id is not null and e.empresa_id <> new.empresa_id
  ) then
    raise exception 'Tiene gente a cargo de otra empresa: quitale el supervisor o la gente antes de cambiarlo de empresa'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger supervisor_de_la_misma_empresa before insert or update of supervisor_id, empresa_id on empleado
  for each row execute function supervisor_de_la_misma_empresa();

-- Lo que cuelga de un empleado (reparto, bono, imprevisto, historial).
create function acotar_por_empleado() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if es_administrador_de_empresa() then
    if tg_op <> 'INSERT' then
      if not administra_a((to_jsonb(old) ->> 'empleado_id')::uuid) then perform empresa_ajena(); end if;
    end if;
    if tg_op <> 'DELETE' then
      if not administra_a((to_jsonb(new) ->> 'empleado_id')::uuid) then perform empresa_ajena(); end if;
    end if;
  end if;
  return case tg_op when 'DELETE' then old else new end;
end;
$$;

create trigger acotar_por_empleado before insert or update or delete on titularidad
  for each row execute function acotar_por_empleado();
create trigger acotar_por_empleado before insert or update or delete on bono
  for each row execute function acotar_por_empleado();
create trigger acotar_por_empleado before insert or update or delete on imprevisto
  for each row execute function acotar_por_empleado();
create trigger acotar_por_empleado before insert or update or delete on historial_del_reparto
  for each row execute function acotar_por_empleado();

create function acotar_funcion() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if es_administrador_de_empresa() and not administra_funcion(old.id) then
    perform empresa_ajena();
  end if;
  return case tg_op when 'DELETE' then old else new end;
end;
$$;

create trigger acotar_funcion before update or delete on funcion
  for each row execute function acotar_funcion();

-- Lo del grupo: el calendario y el cierre del mes los toca solo el general.
create function solo_el_general() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if es_administrador_de_empresa() then
    raise exception 'Eso es del grupo: lo hace el administrador general' using errcode = 'insufficient_privilege';
  end if;
  return case tg_op when 'DELETE' then old else new end;
end;
$$;

create trigger solo_el_general before insert or update or delete on calendario
  for each row execute function solo_el_general();
create trigger solo_el_general before insert or update or delete on dia_no_habil
  for each row execute function solo_el_general();
create trigger solo_el_general before insert or update or delete on reapertura
  for each row execute function solo_el_general();
create trigger solo_el_general before insert or update or delete on foto_del_cierre
  for each row execute function solo_el_general();
create trigger solo_el_general before insert or update or delete on total_al_reabrir
  for each row execute function solo_el_general();

-- ------------------------------------------------------- administradores nuevos

-- INV-59: un correo es de un administrador o de un empleado, nunca de los dos.
create function correo_sin_dos_papeles() returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if tg_table_name = 'empleado' and exists (select 1 from administrador where correo = lower(new.correo)) then
    raise exception 'Ese correo ya es de un administrador' using errcode = 'unique_violation';
  end if;
  if tg_table_name = 'administrador' and exists (select 1 from empleado where correo = lower(new.correo)) then
    raise exception 'Ese correo ya es de un empleado' using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;

create trigger correo_sin_dos_papeles before insert or update of correo on empleado
  for each row execute function correo_sin_dos_papeles();
create trigger correo_sin_dos_papeles before insert or update of correo on administrador
  for each row execute function correo_sin_dos_papeles();

-- INV-58: solo el general da de alta administradores. Sin empresa es general.
create function alta_de_administrador(el_nombre text, el_correo text, la_empresa uuid default null) returns uuid
  language plpgsql
  security definer
  set search_path = public, auth, pg_temp
as $$
declare
  usuario uuid;
begin
  if not es_administrador_general() then
    raise exception 'Solo el administrador general da de alta administradores' using errcode = 'insufficient_privilege';
  end if;
  if la_empresa is not null and not exists (select 1 from empresa where id = la_empresa) then
    raise exception 'Esa empresa no existe' using errcode = 'foreign_key_violation';
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

  insert into administrador (auth_user_id, nombre, correo, empresa_id)
  values (usuario, el_nombre, lower(el_correo), la_empresa)
  on conflict (auth_user_id) do update set
    nombre = excluded.nombre,
    correo = excluded.correo,
    empresa_id = excluded.empresa_id;

  return usuario;
end;
$$;

revoke execute on function alta_de_administrador(text, text, uuid) from anon, public;
grant execute on function alta_de_administrador(text, text, uuid) to authenticated;

-- ---------------------------------------------------------------- la auditoria

-- Los vinculos supervisor-empleado que cruzan empresas y que ya existian: la
-- regla nueva no los cierra, solo impide crear mas. Alguien decide uno por uno
-- (CEB-263): `select * from vinculos_cruzados()` con la llave de servicio.
create function vinculos_cruzados()
  returns table (empleado uuid, nombre text, empresa uuid, supervisor uuid, nombre_supervisor text, empresa_supervisor uuid)
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select e.id, e.nombre_bloque, e.empresa_id, s.id, s.nombre_bloque, s.empresa_id
  from empleado e
  join empleado s on s.id = e.supervisor_id
  where e.empresa_id is not null and s.empresa_id is not null and e.empresa_id <> s.empresa_id;
$$;

revoke execute on function vinculos_cruzados() from anon, authenticated, public;
grant execute on function vinculos_cruzados() to service_role;

do $$
declare cuantos int;
begin
  select count(*) into cuantos from vinculos_cruzados();
  if cuantos > 0 then
    raise notice '% vinculo(s) supervisor-empleado cruzan empresas: select * from vinculos_cruzados()', cuantos;
  end if;
end $$;
