-- El historial del reparto (CEB-236, ADR 0017): cada cambio publicado de las
-- ponderaciones de una persona -- dar de alta, cambiar, archivar, eliminar o
-- traspasar una funcion, o ajustar su cotidianidad -- queda guardado con quien
-- lo hizo, cuando, que movimiento fue y los pesos antes y despues, parte por
-- parte. Hasta hoy el reparto se sobrescribia y el peso anterior se perdia.
--
-- Se anota en el mismo acto que publica, en la base: cada funcion que mueve
-- pesos se envuelve en otra con el mismo nombre que toma el reparto antes,
-- llama a la de siempre y anota el despues. Las de siempre quedan con el
-- sufijo _sin_historial y nadie con una sesion las puede llamar: no hay
-- manera de mover un peso sin dejar rastro.

create table historial_del_reparto (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references empleado (id) on delete cascade,
  movimiento text not null check (movimiento in ('alta', 'cambio', 'archivo', 'eliminacion', 'traspaso', 'cotidianidad')),
  -- La funcion que se movio, si fue una. Sin referencia: una funcion eliminada
  -- sigue nombrada en su historial, en los pesos de antes.
  funcion_id uuid,
  quien uuid default auth.uid() references auth.users (id),
  en timestamptz not null default now(),
  -- [{ funcionId, parte, ponderacion }], la cotidianidad al final y sin id.
  antes jsonb not null,
  despues jsonb not null
);

create index historial_del_reparto_empleado_idx on historial_del_reparto (empleado_id, en desc);

-- Solo el administrador lo lee. El supervisor ve pesos (ADR 0015), pero no
-- quien los movio. Nadie lo escribe directamente: solo las funciones de abajo.
alter table historial_del_reparto enable row level security;

create policy "el administrador ve el historial del reparto"
  on historial_del_reparto for select to authenticated
  using (es_administrador());

revoke all on historial_del_reparto from anon, authenticated;
grant select on historial_del_reparto to authenticated;
grant select, insert, update, delete on historial_del_reparto to service_role;

-- El reparto publicado de una persona, como lo guarda el historial: sus
-- funciones vigentes, de la que mas pesa a la que menos, y su cotidianidad
-- (cien menos la suma, areas incluidas: cotidianidadDe en el dominio).
create function reparto_publicado(el_empleado uuid) returns jsonb
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  with suyas as (
    select t.funcion_id, f.texto, t.ponderacion
    from titularidad t
    join funcion f on f.id = t.funcion_id
    where t.empleado_id = el_empleado and t.hasta is null and t.publicado_en is not null and f.activa
  )
  select coalesce(
      (select jsonb_agg(jsonb_build_object('funcionId', funcion_id, 'parte', texto, 'ponderacion', ponderacion) order by ponderacion desc, texto) from suyas),
      '[]'::jsonb
    )
    || jsonb_build_array(jsonb_build_object('funcionId', null, 'parte', 'Cotidianidad', 'ponderacion', 100 - coalesce((select sum(ponderacion) from suyas), 0)));
$$;

-- Lo que se anota despues de mover: si nada cambio, no hay nada que anotar.
create function anotar_en_el_historial(el_empleado uuid, el_movimiento text, la_funcion uuid, antes jsonb) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  despues jsonb := reparto_publicado(el_empleado);
begin
  if despues = antes then
    return;
  end if;
  insert into historial_del_reparto (empleado_id, movimiento, funcion_id, antes, despues)
  values (el_empleado, el_movimiento, la_funcion, antes, despues);
end;
$$;

revoke execute on function reparto_publicado(uuid), anotar_en_el_historial(uuid, text, uuid, jsonb) from anon, authenticated, public;

-- ── Las de siempre, sin sesion ───────────────────────────────────────────

alter function publicar_reparto(uuid) rename to publicar_reparto_sin_historial;
alter function ajustar_ponderacion(uuid, uuid, int, jsonb) rename to ajustar_ponderacion_sin_historial;
alter function archivar_funcion(uuid, uuid, jsonb) rename to archivar_funcion_sin_historial;
alter function eliminar_funcion(uuid, uuid, jsonb) rename to eliminar_funcion_sin_historial;
alter function traspasar(uuid, uuid, uuid, int, jsonb, jsonb) rename to traspasar_sin_historial;

revoke execute on function
  publicar_reparto_sin_historial(uuid),
  ajustar_ponderacion_sin_historial(uuid, uuid, int, jsonb),
  archivar_funcion_sin_historial(uuid, uuid, jsonb),
  eliminar_funcion_sin_historial(uuid, uuid, jsonb),
  traspasar_sin_historial(uuid, uuid, uuid, int, jsonb, jsonb)
from anon, authenticated, public;

-- ── Las mismas, con historial ────────────────────────────────────────────

-- Publicar el borrador. Si entra una funcion es un alta; si no, lo que diga
-- la pantalla: un cambio de pesos o un ajuste de la cotidianidad, que desde
-- la base no se distinguen (los dos mueven todo el reparto).
create function publicar_reparto(quien uuid, el_movimiento text default 'cambio') returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  antes jsonb := reparto_publicado(quien);
  entra uuid;
begin
  if el_movimiento not in ('cambio', 'cotidianidad') then
    raise exception 'Publicar es un cambio o un ajuste de la cotidianidad' using errcode = 'check_violation';
  end if;

  perform publicar_reparto_sin_historial(quien);

  select (d->>'funcionId')::uuid into entra
  from jsonb_array_elements(reparto_publicado(quien)) d
  where d->>'funcionId' is not null
    and not exists (select 1 from jsonb_array_elements(antes) a where a->>'funcionId' = d->>'funcionId')
  limit 1;

  perform anotar_en_el_historial(quien, case when entra is null then el_movimiento else 'alta' end, entra, antes);
end;
$$;

create function ajustar_ponderacion(la_funcion uuid, quien uuid, nueva int, pesos_del_resto jsonb) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  antes jsonb := reparto_publicado(quien);
begin
  perform ajustar_ponderacion_sin_historial(la_funcion, quien, nueva, pesos_del_resto);
  perform anotar_en_el_historial(quien, 'cambio', la_funcion, antes);
end;
$$;

create function archivar_funcion(la_funcion uuid, quien uuid, pesos jsonb) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  antes jsonb := reparto_publicado(quien);
begin
  perform archivar_funcion_sin_historial(la_funcion, quien, pesos);
  perform anotar_en_el_historial(quien, 'archivo', la_funcion, antes);
end;
$$;

create function eliminar_funcion(la_funcion uuid, quien uuid, pesos jsonb) returns void
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  antes jsonb := reparto_publicado(quien);
begin
  perform eliminar_funcion_sin_historial(la_funcion, quien, pesos);
  perform anotar_en_el_historial(quien, 'eliminacion', la_funcion, antes);
end;
$$;

-- Un traspaso toca dos repartos: deja una version en cada uno.
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
  antes_de_quien_entrega jsonb := reparto_publicado(de_quien);
  antes_de_quien_recibe jsonb := reparto_publicado(a_quien);
begin
  perform traspasar_sin_historial(la_funcion, de_quien, a_quien, peso_nuevo, pesos_de_quien_entrega, pesos_de_quien_recibe);
  perform anotar_en_el_historial(de_quien, 'traspaso', la_funcion, antes_de_quien_entrega);
  perform anotar_en_el_historial(a_quien, 'traspaso', la_funcion, antes_de_quien_recibe);
end;
$$;

revoke execute on function
  publicar_reparto(uuid, text),
  ajustar_ponderacion(uuid, uuid, int, jsonb),
  archivar_funcion(uuid, uuid, jsonb),
  eliminar_funcion(uuid, uuid, jsonb),
  traspasar(uuid, uuid, uuid, int, jsonb, jsonb)
from anon, public;

grant execute on function
  publicar_reparto(uuid, text),
  ajustar_ponderacion(uuid, uuid, int, jsonb),
  archivar_funcion(uuid, uuid, jsonb),
  eliminar_funcion(uuid, uuid, jsonb),
  traspasar(uuid, uuid, uuid, int, jsonb, jsonb)
to authenticated;
