# Contratos externos observados — web

## Alcance y estado del contrato

Este documento describe lo que consume el cliente Angular actual. No se
encontró un contrato acordado ni se validaron respuestas contra los servicios
reales; las pruebas usan dobles de HTTP. Por ello, los campos y ejemplos son
el contrato observado en `web/`, no una confirmación del backend.

Las URLs actuales apuntan a servicios locales. Las interfaces TypeScript
describen los tipos que espera el cliente, pero no validan todas las respuestas
en tiempo de ejecución. Los ejemplos usan valores ficticios de las pruebas; no
son credenciales ni tokens de producción.

## `POST /auth/login`

### 1. Quién lo llama

`LoginComponent.login()` valida que usuario y contraseña no estén vacíos y
llama a `AuthService.login(username, password)`. `AuthService` construye el
request, envía el POST y, si recibe un token con valor, inicia la sesión con
`SessionService`. Referencias: `web/src/app/login/login.component.ts:31`,
`web/src/app/services/auth.service.ts:12`,
`web/src/app/services/auth.service.ts:29`.

### 2. Qué envía

URL observada: `http://localhost:8080/auth/login`
(`web/src/environments/environment.ts:2`).

| Parte | Campo | Valor o regla observada |
|---|---|---|
| Header | `Content-Type` | El servicio pasa un objeto a `HttpClient`; no configura headers propios. Angular serializa el objeto como JSON. |
| Header | `Authorization` | No se configura en el login. |
| Query | — | No se agregan query params. |
| Body | `username` | String recibido por `LoginComponent`; se comprueba que no sea solo espacios, pero el valor original se envía. |
| Body | `password` | String recibido por `LoginComponent`; se comprueba que no sea solo espacios, pero el valor original se envía. |
| Body | `client` | Valor fijo `angular-workshop`, configurado en `environment.ts`. |
| Opción del cliente | timeout | `5000` ms (`web/src/environments/environment.ts:5`). |

Los nombres y tipos del body están en
`web/src/app/models/auth.models.ts:1`; su construcción y envío están en
`web/src/app/services/auth.service.ts:12` y
`web/src/app/services/auth.service.ts:19`. El timeout configurado es un
timeout del cliente Angular, no un campo HTTP.

Ejemplo basado en los valores ficticios de
`web/src/app/services/auth.service.spec.ts:29`:

```http
POST http://localhost:8080/auth/login
Content-Type: application/json

{
  "username": "student",
  "password": "Workshop123!",
  "client": "angular-workshop"
}
```

No se deben reutilizar esos valores fuera de las pruebas del laboratorio.

### 3. Qué espera recibir en éxito

El cliente no comprueba un código exacto como `200`: cualquier respuesta que
`HttpClient` trate como exitosa continúa por este flujo. El estado HTTP real del
servicio no se comprobó.

| Campo | Tipo en el cliente | Regla observada |
|---|---|---|
| `token` | `string`, opcional en la interfaz | La UI solo completa el login si el valor es truthy. |
| `user` | Objeto, opcional | Si falta, se inicia la sesión con `{}`. |
| `user.username` | `string`, opcional | Se usa como `owner` al pedir tareas; si falta, la UI envía `owner=`. |
| `user.displayName` | `string`, opcional | Se muestra como saludo; si falta, se usa `username`. |

Los tipos están definidos en `web/src/app/models/auth.models.ts:7` y
`web/src/app/models/auth.models.ts:12`; el servicio solo verifica que la
respuesta sea un objeto no nulo y no un arreglo
(`web/src/app/services/auth.service.ts:24`). Ejemplo tomado del doble de
servicio de `web/src/app/services/auth.service.spec.ts:26`:

```json
{
  "token": "test-token",
  "user": {
    "username": "student"
  }
}
```

La respuesta se espera con `token` y `user` en la raíz; el cliente actual no
lee un envoltorio `data` (`web/src/app/services/auth.service.ts:28`).

### 4. Cómo reacciona ante errores

| Caso | Reacción observada de la UI |
|---|---|
| Usuario vacío o solo espacios | No envía el request; muestra `Ingrese un usuario.` |
| Contraseña vacía o solo espacios | No envía el request; muestra `Ingrese una contraseña.` |
| Respuesta exitosa sin token truthy | No navega al dashboard; muestra `El backend respondió sin token.` |
| Error HTTP, credenciales rechazadas, error de red o timeout de 5 segundos | Angular rechaza la operación; el componente registra el error en consola, muestra `No se pudo autenticar. Verifica tus credenciales e inténtalo de nuevo.` y vuelve a habilitar el botón. No diferencia estos casos por status. |
| Body `null`, primitivo o arreglo | `AuthService` lo rechaza como forma inválida; la UI muestra el mismo mensaje genérico de error. |
| Objeto con `token` truthy pero de tipo inesperado | El servicio no valida el tipo en runtime antes de guardarlo. El resultado no está definido por una prueba de integración. |

Validaciones y mensajes: `web/src/app/login/login.component.ts:31`,
`web/src/app/login/login.component.ts:34`,
`web/src/app/login/login.component.ts:38`,
`web/src/app/login/login.component.ts:45` y
`web/src/app/login/login.component.ts:51`.

### 5. Notas de seguridad

- `SessionService` centraliza la sesión. Guarda token y usuario en
  `sessionStorage`, y elimina claves heredadas de `localStorage`
  (`web/src/app/services/session.service.ts:9`).
- `sessionStorage` sigue siendo accesible a JavaScript del mismo origen; no
  protege el token frente a XSS. Este riesgo sigue pendiente (H-WEB-01).
- El mensaje del login se renderiza mediante interpolación Angular, no mediante
  `[innerHTML]` (`web/src/app/login/login.component.html:39`).
- El flujo observado no hace una llamada HTTP de logout: al cerrar sesión se
  borran las claves de sesión y se navega al login
  (`web/src/app/services/session.service.ts:41`).

## `GET /api/tasks`

### 1. Quién lo llama

Al inicializarse, `DashboardComponent` lee la sesión. Si existe, llama a
`TasksService.getTasks()` con `session.user.username`; si no existe, navega a
`/login` sin solicitar tareas. Referencias:
`web/src/app/dashboard/dashboard.component.ts:42`,
`web/src/app/dashboard/dashboard.component.ts:45` y
`web/src/app/dashboard/dashboard.component.ts:51`.

### 2. Qué envía

URL observada: `http://localhost:8000/api/tasks`
(`web/src/environments/environment.ts:3`).

| Parte | Campo | Valor o regla observada |
|---|---|---|
| Header | `Authorization` | Bearer token leído de la sesión actual. |
| Header | `Content-Type` | No se configura; la petición GET no lleva body. |
| Query | `owner` | `session.user.username`; si no hay username, se envía una cadena vacía. |
| Body | — | No se envía body. |
| Opción del cliente | timeout | No se configura un timeout específico para esta petición. |

El query param y el header se construyen en
`web/src/app/services/tasks.service.ts:19`. La prueba de caracterización
comprueba `owner=student` y un bearer token en
`web/src/app/services/tasks.service.spec.ts:29`.

Ejemplo con el token ficticio usado en la prueba:

```http
GET http://localhost:8000/api/tasks?owner=student
Authorization: Bearer test-token
```

### 3. Qué espera recibir en éxito

El cliente no comprueba un status HTTP exacto. Un status que Angular considere
exitoso debe tener un body que sea un arreglo de tareas; la respuesta se
consume directamente como `Task[]`, no como `{ "data": [...] }`
(`web/src/app/services/tasks.service.ts:19`).

| Campo de tarea | Tipo en el cliente | Regla observada |
|---|---|---|
| `id` | `string`, opcional | Se conserva en el objeto; no se usa para decidir qué tareas mostrar. |
| `title` | `string`, opcional | Se muestra como título. |
| `description` | `string`, opcional | Se muestra como descripción. |
| `status` | `string`, requerido en la interfaz | Las tareas `ARCHIVED` se ocultan. `TODO`, `IN_PROGRESS`, `DONE`, `RESUELTO` y `COMPLETED` tienen etiquetas traducidas; otros valores se muestran como llegan. |
| `priority` | `string`, opcional | Se usa para construir la etiqueta y ordenar; valores se ordenan lexicográficamente en orden descendente. |
| `owner` | `string`, opcional | Se usa para construir la etiqueta. |
| `label` | `string`, opcional | El cliente lo reemplaza por una etiqueta calculada a partir de prioridad y owner. |

Tipos: `web/src/app/models/task.model.ts:1`. Filtrado, etiqueta y orden:
`web/src/app/utils/task-utils.ts:4` y
`web/src/app/utils/legacy-format.ts:3`. Ejemplo de forma tomado de la prueba del
dashboard (`web/src/app/dashboard/dashboard.component.spec.ts:63`):

```json
[
  {
    "id": "low",
    "title": "Low",
    "status": "TODO",
    "priority": "LOW",
    "owner": "student"
  }
]
```

Si el arreglo está vacío, el dashboard muestra `No hay tareas para mostrar
todavía.` (`web/src/app/dashboard/dashboard.component.html:27`).

### 4. Cómo reacciona ante errores

| Caso | Reacción observada de la UI |
|---|---|
| No hay token o la sesión guardada no se puede restaurar | `DashboardComponent` navega a `/login` y no llama al endpoint. `SessionService` borra la sesión si no encuentra token o si el usuario guardado no se puede parsear/validar. |
| Token inválido o expirado (por ejemplo, si el backend responde 401/403) | `HttpClient` rechaza el request; no hay rama especial por status ni se limpia la sesión automáticamente. El dashboard muestra `No se pudo cargar el dashboard. Inténtalo de nuevo.` y permanece en esa vista. El status que usa el backend no está confirmado. |
| Error del servidor o de red | Se captura en el dashboard; se registra el error en consola y se muestra el mismo mensaje genérico. |
| Demora o timeout | Esta petición no configura timeout en el servicio. Si el navegador o la capa de red termina reportando un error, la UI sigue el manejo genérico anterior; no hay un límite de tiempo propio documentado en el cliente. |
| Body exitoso que no es un arreglo | No hay validación runtime del body. Al intentar filtrar la respuesta, ocurre un error que cae en el `catch` del dashboard y se muestra el mensaje genérico. |
| Tarea con `status` ausente o nulo | La interfaz TypeScript no valida el JSON en runtime; el template llama `statusLabel(task.status)`, que usa `toUpperCase()`. Puede fallar al renderizar; no hay mensaje alternativo documentado para ese caso (riesgo H-WEB-05). |

El manejo común está en `web/src/app/dashboard/dashboard.component.ts:53`;
la condición de sesión, en `web/src/app/dashboard/dashboard.component.ts:43`;
el parseo de usuario guardado, en
`web/src/app/services/session.service.ts:23`; y el renderizado de estado, en
`web/src/app/dashboard/dashboard.component.html:25` y
`web/src/app/dashboard/dashboard.component.ts:38`.

### 5. Notas de seguridad

- El token se toma de `SessionService` y se adjunta como bearer; los
  componentes no leen directamente el almacenamiento
  (`web/src/app/services/tasks.service.ts:13`).
- Aunque se usa `sessionStorage`, el token sigue expuesto a JavaScript del
  origen. La documentación de la sesión no debe interpretarse como protección
  contra XSS (H-WEB-01).
- `owner` es un query param enviado por el cliente. El código Angular no
  demuestra que el backend lo contraste con la identidad del token; esa
  autorización debe confirmarse con el contrato del servicio.
- Los títulos, descripciones, etiquetas y errores visibles se interpolan en
  Angular; no se usa `[innerHTML]` para estos datos
  (`web/src/app/dashboard/dashboard.component.html:18` y
  `web/src/app/dashboard/dashboard.component.html:22`).
- Cerrar sesión elimina la sesión local y navega a `/login`; no se observa
  endpoint de logout ni revocación remota
  (`web/src/app/dashboard/dashboard.component.ts:61`).

## Preguntas abiertas

- **Login:** confirmar con el servicio real el status de éxito, si la respuesta
  actual es `{token, user}` en la raíz o si existe un contrato envolvente
  anterior `{data: ...}`, los status y formas de error para credenciales
  inválidas, y si `token` y `user` deben ser obligatorios.
- **Tareas:** confirmar el status de éxito, que el body real sea un arreglo
  directo, los campos y tipos de cada tarea, los status para token inválido y
  las reglas de autorización entre `owner` y la identidad autenticada.
- **Timeout de tareas:** acordar si el cliente debe tener un timeout explícito;
  el código actual no lo configura.
- **Evidencia de integración:** las pruebas actuales son dobles locales. La
  estructura HTTP real y los códigos indicados arriba siguen pendientes de
  validación contra los backends.
