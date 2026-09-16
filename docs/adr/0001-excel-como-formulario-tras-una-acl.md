# El Excel es un formulario de entrada detras de una capa anticorrupcion

El documento "Funciones cuantificadas del personal" no es un catalogo de tareas:
es un instrumento de reparto salarial. Sus filas son unidades de sueldo, esta
maquetado en bloques con celdas combinadas para que lo lea una persona, no tiene
identificadores, y el ritmo de cada funcion esta escrito en prosa dentro del
nombre. JFS trabaja ahi y no va a dejar de hacerlo.

Decidimos tratarlo como **formulario de entrada**, no como fuente de consulta. Un
adaptador lo importa a demanda, traduce, y escribe el modelo de dominio en
Postgres. Toda la fragilidad de esa traduccion -- lector de bloques, identidad de
fila por hash del texto normalizado, extraccion de fechas de la prosa,
tipificacion -- vive dentro del adaptador y en ningun otro sitio. El dominio no
conoce la forma del spreadsheet.

Descartamos leer el Sheet en vivo en cada peticion: desde que la estructura
derivada se revisa a mano, tiene que persistir, y recomputarla en cada lectura la
perderia. Descartamos tambien guardar lo derivado en una pestaña tecnica del
propio documento: obliga a permiso de escritura y a pelear con el archivo abierto,
para beneficio de nadie, ya que quien revisa es el responsable tecnico.

## Consecuencias

- La importacion corre a demanda, sin scheduler. Una edicion de JFS no cambia el
  plan de nadie hasta que alguien importa y revisa. Es deliberado.
- La unica escritura sobre el documento es una pestaña de razones: un registro con
  una fila por evento (no pude, me atrase, me puse al dia), regenerado completo
  desde la base en cada cambio. Es proyeccion, no persistencia: la base es la
  fuente, y si la escritura en la hoja falla, la marca igual queda guardada y el
  siguiente cambio corrige la pestaña. Guarda historial, no solo la ultima razon.
- La pestaña vive en el mismo documento, y no en un archivo aparte, para que JFS
  la tenga donde ya trabaja. El costo es que la aplicacion puede escribir en el
  documento de sueldos. Se contiene con los rangos protegidos de la propia hoja,
  en modo restringido y no solo de advertencia: la cuenta de la aplicacion solo
  puede editar la pestaña de razones, y nadie mas puede editar esa pestaña.
- La granularidad queda desacoplada: el Excel dice "una fila es una fila" porque
  una fila es sueldo; el dominio puede darle items marcables a una funcion sin
  tocar la ponderacion. Descomponer sin repesar se vuelve posible.
- El dia que JFS acepte una pantalla, es un segundo adaptador contra el mismo
  modelo. Hasta ese dia se construye **un** adaptador, no dos: la pantalla propia
  de JFS esta explicitamente fuera de alcance en CEB-105.
