-- El backfill de 0007 le dio titularidad vigente a TODAS las funciones,
-- incluidas las archivadas. En local no se noto porque no habia ninguna; en
-- produccion hay siete, y aparecerian contadas en el cargo de su gente aunque
-- ya nadie las hace.
--
-- Una funcion archivada no esta a nombre de nadie: su tenencia termino cuando
-- se archivo. La fila no se borra -- el historial de quien la tuvo sigue
-- siendo cierto y sus marcas cuelgan de ahi.

update titularidad t
set hasta = current_date
from funcion f
where f.id = t.funcion_id
  and not f.activa
  and t.hasta is null;
