# La pantalla de JFS reemplaza al documento

> Retira ADR 0001 y ADR 0002.

ADR 0001 trato el Excel como formulario de entrada detras de una capa
anticorrupcion, y cerro diciendo: "el dia que JFS acepte una pantalla, es un
segundo adaptador contra el mismo modelo". Ese dia llego, y resulto no ser un
segundo adaptador sino el unico: **JFS asigna, pondera, puntua y mantiene el
calendario en una pantalla propia, y el documento deja de ser entrada.**

Decidimos que el documento no sobreviva ni como espejo. Nada se lee de el salvo
una vez, en la migracion, y nada se escribe en el nunca. Lo que JFS necesite
llevarse a su hoja de sueldos sale por una descarga que ella pega donde quiera.

Descartamos mantener las dos entradas sincronizadas. Sincronizar es tener dos
escritores y ningun dueño: alguien edita la fila el jueves en la hoja, otro la
edita el viernes en la pantalla, y el lunes hay que decidir cual gana. No se
resuelve bien nunca. Descartamos tambien escribir la ponderacion de vuelta en la
columna real del documento: esa columna esta en la misma fila que `MONTO`, y un
error de alineacion no ensucia un registro, desplaza los porcentajes con los que
se le paga a alguien.

## Consecuencias

- **Muere toda la traduccion.** El lector de bloques, la identidad por hash del
  texto normalizado, la reconciliacion de altas y bajas, la extraccion de fechas
  de la prosa. Con ella muere CEB-120: renombrar deja de ser una baja y un alta
  que alguien confirma, y pasa a ser editar el texto de algo que tiene identidad
  propia. El historial no se rompe porque el id nunca cambio.
- **Muere el agente de tipificacion (ADR 0002) y con el la dependencia de un
  modelo externo.** El tipo deja de inferirse: la pantalla pregunta, y la
  respuesta lo determina. No un desplegable con cuatro sustantivos, sino "¿esto
  se entrega y queda terminado, o se atiende mientras haya?". ADR 0002 sostenia
  que el criterio del agente era el unico lugar donde vivia la frontera entre
  flujo y area; ahora ese lugar es la interfaz, que se lee cada vez que alguien
  crea una funcion y no una vez al escribir un prompt. Se van `tipificador.mts`,
  `retipificar.mts`, las variables `AGENTE_*`, las columnas `_generado` y
  `_corregido` con su regla de precedencia, e INV-9 e INV-11.
- **Muere la pestaña de razones y con ella INV-12.** ADR 0001 la puso en el
  mismo documento "para que JFS la tenga donde ya trabaja"; si JFS trabaja en la
  pantalla, esa razon desaparece. Y con ella el permiso de escritura de la
  aplicacion sobre el documento de sueldos, que era el costo que ADR 0001
  aceptaba a regañadientes. Los rangos protegidos dejan de hacer falta porque no
  hay nada que proteger: la aplicacion no tiene credenciales sobre ese archivo.
- **Google desaparece del sistema.** `lib/hoja.ts`, la cuenta de servicio, la
  firma de JWT a mano, `GOOGLE_CREDENCIALES_JSON`. El codigo de migracion se
  borra detras de la migracion.
- **El nombre de la funcion deja de cargar el calendario.** Hoy dice "CIERRE
  FINANCIERO AUTO BENGALA (ANTES DEL 3 DE CADA MES)" porque la fecha no tenia
  otro sitio donde vivir. La migracion extrae el dia tope de la prosa y lo borra
  del nombre en la misma pasada: dejarlo seria un dato con dos dueños, y el dia
  que JFS cambie el tope a 5 el nombre seguira diciendo 3.
- **Desaparece el responsable tecnico.** Existia para revisar una traduccion, no
  para supervisar a JFS. Sin traduccion no hay nada que revisar. La llave de
  servicio deja de usarse en la operacion normal.
- **El aviso de cobertura del calendario se queda sin casa y hay que darle una.**
  Vivia en la importacion. Es la unica alarma del sistema cuyo modo de fallo es
  silencioso -- los planes se vacian y parece que no hay trabajo -- asi que pasa
  a ser un estado permanente del backoffice, que aparece a los 60 dias habiles
  de cobertura restante, insiste a los 30, y no se puede descartar.
- **Se pierde algo real:** hoy JFS lee las razones sin entrar a ningun sistema,
  en el archivo que ya tiene abierto. Manaña hay que entrar. Si resulta que por
  eso no se entera de que alguien lleva tres semanas atascado, la respuesta es un
  resumen que salga a buscarla, no resucitar la pestaña.
