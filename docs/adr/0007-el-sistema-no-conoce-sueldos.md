# El sistema no conoce sueldos, aunque el trabajo mueva dinero

En JFS el trabajo mueve plata: si una funcion que vale el 10% del cargo de
alguien pasa a otra persona, ese pago se mueve con ella. Eso hace tentador que
el sistema calcule montos, porque tiene las dos mitades que hacen falta -- el
peso y quien ejecuta -- y le falta solo el sueldo.

Decidimos que no lo tenga. **El sistema registra quien tiene que hacer que,
cuanto pesa dentro de su cargo y quien lo esta ejecutando. JFS lee eso y decide
la plata en su hoja.** Es la evidencia, no la nomina.

El motivo no es de alcance. Hoy el sueldo de nadie esta protegido por cuidado:
esta protegido porque **el dato no existe**, y por eso INV-1 se puede verificar
recorriendo todas las tablas y todas las respuestas buscando un numero. El dia
que el sueldo entre, esa garantia deja de ser estructural y pasa a depender de
que ninguna ruta, ninguna consulta y ningun reporte se equivoque nunca. Es una
puerta que, una vez abierta, obliga a rediseñar el acceso entero.

## Consecuencias

- **El traspaso es asimetrico, y tiene que serlo.** Quien entrega se recalcula
  solo: se va la funcion y el resto se reescala a cien, porque nada cambio de
  valor, solo cambio el total. Quien recibe no se puede calcular: para saber
  cuanto pesan esos puntos dentro de su cargo haria falta saber lo que gana, asi
  que lo escribe JFS. La pantalla la ayuda con lo unico que sabe -- "para
  Douglenis esto era el 10% de su cargo" -- y el resto lo pone ella.
- **El impacto salarial se expresa en porcentaje, que es lo que ya se sabia
  expresar.** El glosario define el cumplimiento ponderado como "peso salarial
  expresado en porcentaje". Ponderacion por incumplimiento ya es la respuesta; el
  monto aparece cuando JFS multiplica.
- **La salida es una descarga, no una escritura.** Cero credenciales que
  custodiar, cero posibilidad de escribir mal en la hoja de nadie, y sigue siendo
  JFS quien decide que entra a su documento.
- **El empleado sigue viendo la ponderacion de sus funciones** y sigue sin ver su
  tasa de cumplimiento (INV-3). Lo primero le dice el peso de su rol, que es
  para lo que existe; lo segundo lo convierte en un numero que persigue.
- **Los incentivos no se rompen, y conviene saber por que.** Una ocurrencia que
  vence sin marcar cuenta igual que un "no pude": callarse no protege. Marcar
  "no pude" con su razon es estrictamente mejor que el silencio, porque es lo
  unico que deja argumentar. Eso vale para los entregables, que se verifican
  contra algo -- la declaracion se presento o no --, **y no vale para los
  flujos**, cuyo estado lo declara la persona y nadie puede contradecir. Si el
  reporte llega a pesar en la evaluacion, ahi es donde el dato se puede secar.
- **Queda una consecuencia incomoda sin resolver:** si a alguien le quitan una
  funcion y su sueldo baja, su pantalla se ve identica -- sigue sumando cien, con
  una funcion menos. El porcentaje es justo la unidad que oculta una bajada de
  sueldo. Si eso debe decirse, se dice explicitamente en el traspaso, y es una
  decision de producto.
