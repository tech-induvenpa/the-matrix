-- INV-38 · La cotidianidad nunca es una funcion (CEB-206, ADR 0014). Es el
-- resto del cargo: no se da de alta. Las funciones de holgura que existian ya
-- se archivaron (0029) y conservan su historia; ninguna puede volver a estar
-- activa, ni por la pantalla, ni por el agente, ni por la llave de servicio.
alter table funcion
  add constraint la_cotidianidad_no_es_una_funcion
  check (not activa or coalesce(tipo_corregido, tipo_generado) is distinct from 'holgura');
