# Hallazgos

## Contrato observado en web

`docs/ENDPOINTS.md` no existe en este workspace, por lo que lo siguiente es
observado en el cliente y no un contrato acordado con los servicios:

- Login: `POST http://localhost:8080/auth/login`, con `username`, `password` y
  `client: "angular-workshop"`. Si la respuesta contiene `data.token`, el
  cliente guarda el token y `data.user` en `sessionStorage` y navega a
  `/dashboard`. El token sigue siendo accesible a JavaScript del mismo origen.
- Tareas: `GET http://localhost:8000/api/tasks?owner=<user.username>`, con
  `Authorization: Bearer <token>`. El dashboard espera una lista en
  `response.data`, oculta tareas con estado `ARCHIVED` y presenta un mensaje de
  error a partir de `detail`, `message` o el mensaje de la excepción.
- Sesión: el dashboard redirige a `/login` si no encuentra token. Cerrar sesión
  elimina `workshop_token` y `workshop_user` de `sessionStorage` y las claves
  heredadas de `localStorage`, y navega a `/login`; no se observa una llamada
  HTTP de logout. `workshop_preferences` permanece guardado.

## Matriz de seguimiento

| id | componente | hallazgo | tipo | explicacion | evidencia (archivo:linea) | severidad | estado |
|---|---|---|---|---|---|---|---|
| H-WEB-01 | web | Token bearer guardado en `localStorage` | Vulnerabilidad | Pendiente: `sessionStorage` reduce persistencia, pero el token bearer continúa accesible a JavaScript del mismo origen y, por tanto, expuesto ante XSS. La limitación está documentada en PLAN.md; no se considera corregido hasta que el almacenamiento deje de exponer el token al código del frontend. | `web/src/app/services/session.service.ts:12`; `web/src/app/dashboard/dashboard.component.ts:43` | Alta | Pendiente |
| H-WEB-02 | web | Mensaje dinámico mostrado con `[innerHTML]` | Vulnerabilidad | El mensaje podía contener datos ingresados y del error del backend. Resolución: la plantilla usa interpolación de texto y los errores muestran mensajes genéricos, sin interpretar HTML dinámico. | `web/src/app/login/login.component.ts:53`; `web/src/app/login/login.component.html:39` | Media | Resuelto |
| H-WEB-03 | web | Dependencias Axios y Lodash fijadas en versiones candidatas a revisión | Sugerencia | `npm run audit:workshop` identificó advisories de alta severidad aplicables a ambas dependencias. Resolución: se retiraron Axios y Lodash del manifiesto/lockfile y se reemplazaron sus usos por `HttpClient` y combinación tipada de preferencias. La auditoría sigue reportando vulnerabilidades en otras dependencias, fuera de este hallazgo y del alcance aprobado; ver PLAN.md. | `web/package.json:12`; `web/src/app/services/auth.service.ts:1`; `web/src/app/services/tasks.service.ts:1` | Media | Resuelto |
| H-WEB-04 | web | Los componentes mezclan HTTP, sesión, configuración y navegación | Refactor | Resolución: `AuthService` y `TasksService` concentran HTTP; `SessionService` y `PreferencesService` centralizan persistencia; `environment.ts` centraliza URLs. Los componentes conservan presentación y navegación. | `web/src/app/services/auth.service.ts:9`; `web/src/app/services/tasks.service.ts:9`; `web/src/environments/environment.ts:2` | Media | Resuelto |
| H-WEB-05 | web | Uso de `any` y validación anidada | Refactor | Pendiente de cierre completo: se eliminaron los usos de `any` y se simplificó la validación, pero el tipado estático no valida el payload HTTP en runtime. `statusLabel` invoca `toUpperCase()` directamente; un estado vacío o nulo puede interrumpir la representación del dashboard. | `web/src/app/models/task.model.ts:1`; `web/src/app/dashboard/dashboard.component.ts:39`; `web/src/app/dashboard/dashboard.component.html:25` | Media | Pendiente |
| H-WEB-06 | web | Prueba automatizada observada limitada a una utilidad | Sugerencia | Resolución: se añadieron caracterizaciones y pruebas de componentes, servicios, bootstrap y utilidades. La ejecución final obtuvo 37 pruebas aprobadas y 91.34% de cobertura global de sentencias/líneas; detalle por ejecución en PLAN.md. | `web/src/app/login/login.component.spec.ts:23`; `web/src/app/dashboard/dashboard.component.spec.ts:9`; `web/src/app/services/session.service.spec.ts:20`; `web/src/app/utils/task-utils.spec.ts:5` | Baja | Resuelto |

## Candidatos de auth para revisión humana

### H-AUTH-01 — Token construido sin firma criptográfica
- Estado: CANDIDATO
- Evidencia: `auth/src/main/java/com/bcp/workshop/auth/LegacyTokenUtil.java:12-15` concatena los campos del token y usa Base64 para codificarlos; no se observa una firma criptográfica.
- Impacto: si los consumidores aceptan este valor como prueba de autenticación sin validación adicional, un cliente podría alterar sus campos.
- Prioridad propuesta: Alta.
- Contrato potencialmente afectado: respuesta de `POST /auth/login` y cualquier consumidor que interprete el campo de token.
- Cómo validarlo: caracterizar el formato actual y comprobar mediante una prueba que modificar el contenido invalida la autenticación en cada consumidor; confirmar el contrato con esos consumidores.

### H-AUTH-02 — Consulta de credenciales vulnerable a inyección SQL
- Estado: CANDIDATO
- Evidencia: `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java:32-35` concatena usuario y contraseña recibidos en la consulta SQL y la ejecuta con `Statement`.
- Impacto: entrada manipulada puede alterar la condición SQL y comprometer la autenticación o los datos consultados.
- Prioridad propuesta: Alta.
- Contrato potencialmente afectado: solicitud y respuestas de `POST /auth/login`; se debe preservar la respuesta para credenciales válidas e inválidas.
- Cómo validarlo: añadir una prueba de caracterización del login y pruebas con entradas que contengan sintaxis SQL, verificando que no autentiquen ni alteren la consulta.

### H-AUTH-03 — Credenciales predeterminadas insertadas en la base de datos
- Estado: CANDIDATO
- Evidencia: `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java:22-24` crea una columna `password` y siembra dos cuentas con contraseñas literales en el código.
- Impacto: las cuentas y sus credenciales conocidas pueden permitir acceso no autorizado; el flujo compara directamente el valor recibido con la columna.
- Prioridad propuesta: Alta.
- Contrato potencialmente afectado: disponibilidad de las cuentas iniciales y comportamiento de autenticación de `POST /auth/login`.
- Cómo validarlo: comprobar en una prueba aislada qué cuentas se crean en una base vacía, revisar que la inicialización no inserte credenciales predeterminadas y probar el flujo de login con las cuentas configuradas según el mecanismo acordado.

### H-AUTH-04 — CORS permite cualquier origen
- Estado: CANDIDATO
- Evidencia: `auth/src/main/resources/application.properties:5` configura los orígenes mediante la expresión `/.*/`.
- Impacto: navegadores de cualquier origen pueden intentar consumir el servicio desde páginas de terceros; CORS no sustituye autenticación, pero amplía la superficie de interacción permitida.
- Prioridad propuesta: Media.
- Contrato potencialmente afectado: acceso cross-origin a los endpoints, incluidos los métodos y headers declarados en `application.properties:6-7`.
- Cómo validarlo: probar solicitudes preflight y solicitudes con un origen permitido y otro no permitido, verificando los headers CORS que devuelve el servidor.

### H-AUTH-05 — Respuestas de autenticación exponen información de diagnóstico
- Estado: CANDIDATO
- Evidencia: `auth/src/main/java/com/bcp/workshop/auth/AuthResource.java:48` agrega un campo `debug` a la respuesta exitosa; las líneas 54-58 devuelven el mensaje de excepción y el nombre de su clase.
- Impacto: las respuestas revelan detalles internos de implementación y posibles datos del error a los clientes.
- Prioridad propuesta: Media.
- Contrato potencialmente afectado: formato de éxito y error de `POST /auth/login`; validar compatibilidad de clientes antes de retirar campos.
- Cómo validarlo: probar respuestas exitosas y fallidas, verificando que mantienen los campos funcionales requeridos y no exponen mensajes ni nombres de excepciones internas.
