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
