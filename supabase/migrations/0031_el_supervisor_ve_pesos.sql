-- El supervisor ve pesos, no montos (CEB-217, ADR 0015). Hasta aqui no veia
-- ningun peso de su gente; ahora lo_de_mi_gente le devuelve la ponderacion de
-- cada funcion, la cotidianidad de cada persona y lo necesario para su
-- ponderacion arrastrada y su intromision: las marcas y los eventos con su id,
-- y que imprevisto desplazo a cual. Nunca un bono ni un monto (INV-40).
--
-- Sigue sin politicas nuevas sobre las tablas: todo pasa por esta funcion,
-- que solo devuelve lo de la gente a su cargo hoy.
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
    select t.funcion_id, t.empleado_id, t.desde, t.ponderacion
    from titularidad t
    join gente g on g.id = t.empleado_id
    join funcion f on f.id = t.funcion_id
    where t.hasta is null and t.publicado_en is not null and f.activa
  )
  select jsonb_build_object(
    'gente', (
      -- La cotidianidad es el resto del cargo (ADR 0014): cien menos sus funciones.
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', g.id, 'nombre', g.nombre_bloque, 'empresa', g.empresa_id, 'sede', g.sede_id,
        'cotidianidad', 100 - coalesce((select sum(t.ponderacion) from tenencias t where t.empleado_id = g.id), 0)
      ) order by g.nombre_bloque), '[]')
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
        'desde', t.desde,
        'ponderacion', t.ponderacion
      )), '[]')
      from tenencias t
      join funcion f on f.id = t.funcion_id
    ),
    'marcas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'funcion_id', m.funcion_id, 'periodo', m.periodo, 'resultado', m.resultado, 'razon', m.razon,
        'marcada_en', m.marcada_en
      )), '[]')
      from marca m
      join tenencias t on t.funcion_id = m.funcion_id
      where (m.marcada_en at time zone 'UTC')::date >= t.desde
    ),
    'eventos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'funcion_id', e.funcion_id, 'estado', e.estado, 'razon', e.razon, 'en', e.en
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
        'marcada_en', i.marcada_en, 'delega_funcion', i.delega_funcion, 'delega_periodo', i.delega_periodo,
        'devuelto_en', i.devuelto_en, 'devuelto_razon', i.devuelto_razon, 'borrado_en', i.borrado_en
      ) order by i.pedido_en), '[]')
      from imprevisto i
      join gente g on g.id = i.empleado_id
      where i.borrado_en is null and (i.pedido_en >= now() - interval '62 days' or i.resultado is null)
    ),
    -- Que imprevisto desplazo a que incumplimiento. Un imprevisto borrado no
    -- cuenta en ninguna cifra (INV-42), tampoco en lo desplazado.
    'intromisiones', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'imprevisto_id', x.imprevisto_id, 'marca_id', x.marca_id, 'evento_flujo_id', x.evento_flujo_id
      )), '[]')
      from intromision x
      join imprevisto i on i.id = x.imprevisto_id
      join gente g on g.id = i.empleado_id
      where i.borrado_en is null
    )
  );
$$;
