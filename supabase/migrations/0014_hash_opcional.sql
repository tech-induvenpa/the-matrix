-- `hash_identidad` es lo que queda del modelo viejo: la identidad salia del
-- texto normalizado, y era obligatoria porque sin ella no habia funcion.
--
-- Desde CEB-130 la identidad es el id, y esta columna solo le sirve al
-- importador para reconocer filas del documento. Pero seguia siendo NOT NULL,
-- asi que crear una funcion desde el backoffice fallaba: nadie escribe ese
-- hash, y la base lo exigia. Se descubrio creando las dos funciones de
-- preliminar a mano.
--
-- Se queda nullable hasta CEB-138, que se lleva el importador y con el la
-- columna entera.

alter table funcion alter column hash_identidad drop not null;
