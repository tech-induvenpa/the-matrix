-- Datos de ejemplo para la rebanada CEB-107. Importar el documento es CEB-111.
-- La importancia y la periodicidad son inventadas: el documento real todavia no
-- tiene ninguna fila puntuada.

insert into dia_no_habil (desde, hasta, descripcion) values
  ('2026-09-08', '2026-09-08', 'Feriado de la empresa');

insert into empleado (id, nombre_bloque, correo) values
  ('11111111-1111-1111-1111-111111111111', 'DOUGLENIS', 'douglenis@ejemplo.test');

insert into funcion (empleado_id, hash_identidad, texto, ponderacion, importancia, periodicidad, tipo_generado, dia_tope_generado, fecha_alta) values
  ('11111111-1111-1111-1111-111111111111', 'siembra-001', 'Cierre financiero Auto Bengala', 25, 9, 'mensual', 'entregable', 3, '2026-08-01'),
  ('11111111-1111-1111-1111-111111111111', 'siembra-002', 'Cierre financiero Changan CCS', 25, 9, 'mensual', 'entregable', 3, '2026-08-01'),
  ('11111111-1111-1111-1111-111111111111', 'siembra-003', 'Pago condominio SEDEFANB', 2, 5, 'mensual', 'entregable', null, '2026-08-01');

-- Una que venza dentro de la ventana de cinco dias habiles, para que la pantalla
-- no nazca vacia. El dia tope se calcula sobre la fecha de siembra.
insert into funcion (empleado_id, hash_identidad, texto, ponderacion, importancia, periodicidad, tipo_generado, dia_tope_generado, fecha_alta) values
  ('11111111-1111-1111-1111-111111111111', 'siembra-004', 'Pago de impuestos y servicios públicos', 5, 7, 'mensual', 'entregable',
   least(extract(day from current_date)::int + 2, extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int),
   '2026-08-01');


-- Flujos: no producen ocurrencias, tienen estado. La periodicidad no se usa en
-- ellos, pero la columna es obligatoria.
insert into funcion (empleado_id, hash_identidad, texto, ponderacion, importancia, periodicidad, tipo_generado, fecha_alta) values
  ('11111111-1111-1111-1111-111111111111', 'siembra-005', 'Cuentas por pagar MDV', 5, 5, 'diaria', 'flujo', '2026-08-01'),
  ('11111111-1111-1111-1111-111111111111', 'siembra-006', 'Pagos en bolívares a proveedores', 7, 8, 'diaria', 'flujo', '2026-08-01'),
  ('11111111-1111-1111-1111-111111111111', 'siembra-007', 'Revisar y validar pagos y expedientes de venta', 10, 7, 'diaria', 'flujo', '2026-08-01');

-- Calendario de JFS (CEB-115). El documento no tiene pestaña de dias no
-- habiles, asi que viven aqui. Feriados nacionales de la LOTTT mas el
-- aniversario de la fundacion de Caracas, que es local. Carnaval y Semana
-- Santa salen de la Pascua: 5 de abril de 2026 y 28 de marzo de 2027.
insert into dia_no_habil (desde, hasta, descripcion) values
  ('2026-10-12', '2026-10-12', 'Día de la Resistencia Indígena'),
  -- Las colectivas se comen Navidad y Fin de año: un solo bloque, no tres
  -- rangos solapados. No existen las vacaciones individuales.
  ('2026-12-21', '2027-01-18', 'Vacaciones colectivas'),
  ('2027-02-08', '2027-02-09', 'Carnaval'),
  ('2027-03-25', '2027-03-26', 'Jueves y Viernes Santo'),
  ('2027-04-19', '2027-04-19', 'Declaración de la Independencia'),
  ('2027-05-01', '2027-05-01', 'Día del Trabajador'),
  ('2027-06-24', '2027-06-24', 'Batalla de Carabobo'),
  ('2027-07-05', '2027-07-05', 'Día de la Independencia'),
  ('2027-07-24', '2027-07-24', 'Natalicio de Bolívar'),
  ('2027-07-25', '2027-07-25', 'Aniversario de la Fundación de Caracas'),
  ('2027-10-12', '2027-10-12', 'Día de la Resistencia Indígena'),
  ('2027-12-24', '2027-12-25', 'Navidad'),
  ('2027-12-31', '2027-12-31', 'Fin de año');

-- Hasta donde alcanza el calendario. Sin esto, el sistema no sabe si cubre.
update calendario set cargado_hasta = '2027-12-31';
