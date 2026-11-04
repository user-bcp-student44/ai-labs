**📄 Archivo: `proposal.md`**

**Proposal (ya escrito, no se modifica)**

- **Por qué:** hoy el cliente que pierde su tarjeta debe llamar al centro de atención. Un bloqueo inmediato desde la app reduce el riesgo de fraude mientras decide si la reporta como perdida.
- **Qué cambia:** el cliente puede bloquear y desbloquear su tarjeta de forma temporal desde la app.
- **Alcance:** tarjetas de débito y crédito del propio cliente. Quedan fuera el bloqueo definitivo, la reposición y el reporte de robo.
- **Cómo se sabrá que está hecho:** los criterios de las specs pasan en las pruebas.

**📄 Archivo: `specs/tarjetas/spec.md`**

**Specs (completar al menos 3 criterios verificables)**

1. Dada una tarjeta de débito o crédito en estado disponible que pertenece al cliente, cuando este solicita bloquearla temporalmente desde la app, la tarjeta queda bloqueada y la app confirma el cambio. Si la tarjeta no está disponible, no se bloquea y se informa que no puede realizarse la operación.
2. Mientras la tarjeta está bloqueada temporalmente, el cliente conserva el acceso a la app, pero cualquier nuevo intento de realizar un movimiento con esa tarjeta es rechazado y su estado permanece bloqueado.
3. Dada una tarjeta propia bloqueada temporalmente, cuando el cliente solicita desbloquearla desde la app, la tarjeta vuelve al estado activo y la app confirma el cambio.
4. Si el cliente intenta bloquear o desbloquear una tarjeta que no le pertenece, el sistema rechaza la solicitud, no modifica el estado de la tarjeta y responde con un mensaje genérico que no revela si la tarjeta existe ni de quién es.
5. Este flujo solo aplica a tarjetas de débito y crédito; no ejecuta un bloqueo definitivo, una reposición ni un reporte de robo, y no cambia tarjetas en esos estados.
6. Validaciones de entrada y sesión: si la solicitud no tiene sesión válida, no incluye identificador de tarjeta o este tiene formato inválido, el sistema la rechaza sin modificar la tarjeta. Nunca se acepta ni se muestra el número completo de la tarjeta.
7. Idempotencia: bloquear una tarjeta ya bloqueada, o desbloquear una ya activa, no produce error ni cambia el estado; la app confirma el estado actual. Una tarjeta en bloqueo definitivo, cancelada o en reposición no puede desbloquearse con este flujo.
8. Se consideran movimientos rechazados mientras haya bloqueo: compras, retiros y pagos nuevos, con el motivo "tarjeta bloqueada". Las operaciones ya autorizadas antes del bloqueo no se revierten. Tras un desbloqueo, la siguiente autorización debe aprobarse si cumple las demás reglas.
9. Efecto inmediato: el estado se consulta en cada autorización, por lo que ninguna operación iniciada después de confirmar el bloqueo o desbloqueo usa el estado anterior. Ante solicitudes simultáneas gana la última confirmada y el estado final es consistente.
10. Auditoría: cada bloqueo o desbloqueo, exitoso o rechazado, registra fecha y hora, canal, cliente, acción, resultado e identificador de tarjeta enmascarado, sin guardar el número completo.
11. Fallos: si el cambio de estado no puede persistirse, la app informa el error y la tarjeta conserva su estado anterior; nunca se muestra una confirmación falsa.
12. Revalidación del cliente: para desbloquear, el sistema exige un código de verificación de un solo uso (OTP o biométrico) enviado al cliente autenticado. El código vence en 5 minutos, solo sirve para esa tarjeta y esa acción, y no puede reutilizarse. Si es incorrecto, vencido o reutilizado, la tarjeta sigue bloqueada. Tras 3 intentos fallidos se bloquea la verificación por un tiempo definido y se registra el evento. Bloquear no exige código, para que la protección sea inmediata si se pierde la tarjeta.

**📄 Archivo: `design.md`**

**Decisiones de diseño (completar al menos 2)**

- **Estado temporal y reversible.** Contexto: la función permite reducir el riesgo temporalmente sin reportar la tarjeta como robada ni cancelarla. Opciones: reutilizar un estado definitivo o representar el bloqueo como un estado temporal que admita reversión. Decisión: permitir el bloqueo solo para tarjetas en estado disponible; manejarlo como temporal y restaurar ese estado al desbloquear. Consecuencia: el flujo no debe cancelar ni reemplazar la tarjeta.
- **Bloqueo de tarjeta separado del acceso a la app.** Contexto: el cliente necesita bloquear el uso de la tarjeta sin perder acceso a los demás servicios de la app. Opciones: asociar el bloqueo de la tarjeta al acceso de la cuenta o limitarlo al uso de la tarjeta. Decisión: el bloqueo temporal no afecta la autenticación ni el acceso a la app; impide los movimientos realizados con la tarjeta bloqueada. Consecuencia: la política de acceso a la cuenta permanece independiente del estado de la tarjeta.
- **Autorización vinculada al titular.** Contexto: solo se pueden cambiar tarjetas propias y una tarjeta bloqueada debe rechazar nuevas autorizaciones. Opciones: confiar en que la app filtre las tarjetas disponibles o validar titularidad y estado al procesar cada operación. Decisión: validar en el servidor que la tarjeta pertenece al cliente autenticado y consultar su estado al autorizar una compra. Consecuencia: ocultar o manipular controles en la app no permite modificar tarjetas ajenas ni autorizar compras, retiros o pagos con una tarjeta bloqueada.
- **Revalidación asimétrica.** Contexto: bloquear reduce el riesgo y debe ser inmediato; desbloquear lo reabre, y un atacante con la sesión abierta podría hacerlo. Decisión: exigir código de un solo uso solo al desbloquear. Consecuencia: la sesión robada no basta para reactivar la tarjeta, y el bloqueo no tiene fricción.
- **Auditoría sin datos sensibles.** Contexto: se debe poder reconstruir quién bloqueó qué y cuándo. Decisión: registrar fecha, canal, acción, resultado e identificador enmascarado de cada intento, incluidos los rechazados. Consecuencia: ningún registro contiene el número completo.

**📄 Archivo: `tasks.md`**

- [ ] Añadir el indicador reversible de bloqueo temporal, separado del estado definitivo.
- [ ] Crear el servicio de bloqueo y desbloqueo, idempotente y que rechace estados no permitidos (criterios 1, 3, 5, 7).
- [ ] Validar sesión, formato del identificador y titularidad, con respuesta genérica (criterios 4 y 6).
- [ ] Consultar el estado en cada autorización de compra, retiro y pago (criterios 2, 8 y 9).
- [ ] Mostrar en la app el control de bloqueo y desbloqueo con confirmación y errores (criterios 1, 3 y 11).
- [ ] Registrar auditoría enmascarada, incluidos los intentos rechazados (criterio 10).
- [ ] Implementar la verificación con código de un solo uso para desbloquear: emisión, vencimiento, límite de intentos y vínculo a tarjeta y acción (criterio 12).
- [ ] Añadir en la app el paso de ingreso del código y sus mensajes de error (criterios 3 y 12).
- [ ] Escribir las pruebas automáticas de los criterios 1 a 12, incluidos casos negativos y de concurrencia.