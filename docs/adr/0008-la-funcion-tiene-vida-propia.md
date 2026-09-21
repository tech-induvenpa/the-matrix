# La funcion tiene vida propia: titular, traspaso y reparto publicado

Mientras la entrada fue el documento, la identidad de una funcion era
`hash(empleado + texto normalizado)`: la fila era la persona y la funcion a la
vez, porque en el Excel un bloque es alguien. Eso hacia que mover trabajo de una
persona a otra fuera una baja y un alta -- dos funciones distintas, historial
partido, y nadie enterandose de que era el mismo trabajo.

Decidimos que **la funcion exista por si misma y no muera al cambiar de manos**.
Tiene un titular a la vez, guarda todos los que tuvo, y la ponderacion deja de
ser una columna suya para vivir en el vinculo entre funcion y titular: la misma
funcion puede ser el 10% del cargo de una persona y el 25% del de otra, porque
tienen cargos distintos. El peso nunca describio el trabajo, describia la
relacion entre ese trabajo y alguien.

Y decidimos que **la unidad de edicion y de publicacion sea el reparto** -- las
funciones de una persona con sus ponderaciones, tomadas como un todo que suma
cien. Nadie cambia la ponderacion de una funcion suelta: se redistribuye el
reparto de alguien. JFS edita en borrador cuanto quiera; lo que ve el empleado
es siempre el ultimo reparto publicado, y un reparto que no suma cien no se
puede publicar.

## Consecuencias

- **La importacion dejo de ser el acto de publicar y hay que reponerlo.** ADR
  0001 decia: "una edicion de JFS no cambia el plan de nadie hasta que alguien
  importa y revisa. Es deliberado". Ese paso protegia contra que un cambio a
  medias llegara a la pantalla de alguien. El borrador lo reemplaza.
- **Descartamos que guardar sea publicar.** Si la pantalla no deja guardar hasta
  cuadrar cien, JFS hara la aritmetica antes de entrar, y ese otro sitio sera
  Excel: habriamos matado la hoja para resucitarla como calculadora. Quien
  reparte diecisiete funciones necesita poder dejarlo a medias e irse a almorzar.
- **Un traspaso es una sola publicacion que toca a dos personas.** Si una queda
  publicada con la funcion y la otra en borrador, la funcion esta en dos sitios;
  al reves, en ninguno.
- **El arrastre se cuenta dos veces, porque son dos preguntas.** El de la funcion
  cruza a los titulares y dice "esto lleva ocho periodos sin cumplirse, con dos
  personas distintas" -- que es la prueba mas limpia de que el problema no era la
  persona, y la que el PRD prometio cuando dijo que el cierre nunca la señala. El
  de la persona se reinicia en el traspaso y dice que es justo pedirle hoy a
  quien la recibio. Nadie hereda la mora de otro.
- **El reporte se ordena por ponderacion arrastrada, no por numero de periodos.**
  Una diaria acumula veintidos veces mas rapido que una mensual: ordenar por
  cantidad pondria siempre las diarias arriba, aunque una trimestral incumplida
  sea mucho peor. Cuanto del cargo de alguien esta sin cumplirse si es comparable
  entre personas y entre cadencias.
- **Las bajas quedan fuera de v1.** Cuando se hagan, dar de baja debe exigir el
  cargo vacio: traspasar o archivar cada funcion, una por una. El trabajo no se
  va con la persona, y si la baja lo desaparece en silencio el sistema deja de
  mostrar trabajo que la empresa sigue necesitando, justo cuando mas se cae.
  Mientras tanto, quien se vaya conserva el acceso con el cargo vacio y se le
  quita a mano.
- **Las marcas y los estados de flujo no se borran nunca.** Todo lo demas viene
  de JFS y se puede volver a escribir; las ocurrencias ni siquiera se guardan. Las
  marcas son observaciones: nacieron porque el sistema existe y no hay de donde
  volver a sacarlas.
