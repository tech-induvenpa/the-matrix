-- El administrador deja de ser solo un lector (CEB-131). Crea funciones, las
-- edita y las archiva desde el navegador, sin que la llave de servicio entre al
-- servidor web (ADR 0004): sus permisos son suyos y la base los comprueba.
--
-- Lo que sigue sin poder hacer nadie, ni el administrador: borrar una funcion.
-- Archivar la saca del plan y conserva sus marcas, que son observaciones y no
-- se pueden reconstruir (INV-16). Por eso no hay politica de delete.

grant insert, update on funcion to authenticated;
grant insert, update, delete on titularidad to authenticated;

create policy "el administrador crea funciones"
  on funcion for insert to authenticated
  with check (es_administrador());

create policy "el administrador edita funciones"
  on funcion for update to authenticated
  using (es_administrador())
  with check (es_administrador());

create policy "el administrador reparte"
  on titularidad for insert to authenticated
  with check (es_administrador());

create policy "el administrador cambia lo que reparte"
  on titularidad for update to authenticated
  using (es_administrador())
  with check (es_administrador());

create policy "el administrador deshace lo que reparte"
  on titularidad for delete to authenticated
  using (es_administrador());
