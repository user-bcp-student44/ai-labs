# Contrato de endpoints

## api

Componente: `api` (FastAPI). Hallazgos relacionados: H-API-01, H-API-03, H-API-04, H-API-07, H-API-10.

Estado del documento: contratos de rutas observados y comprobados en `api/app/`;
el mecanismo de autenticación JWT quedó acordado para H-API-01 y fue verificado
con pruebas locales. Los demás contratos y riesgos pendientes se mantienen
señalados al final de la sección.

Base URL: depende del despliegue (la API es una aplicación FastAPI; el puerto no se define en el código revisado, ver preguntas abiertas). Todas las rutas empiezan por `/api`.

### Autenticación común (los 5 endpoints)

- Header exacto: `Authorization: Bearer <token>` (api/app/main.py:39-41).
- La API acepta JWT firmados exclusivamente con HS256 y valida los claims `sub`, `role`, `exp`, `iss` y `aud` mediante `api/app/security.py`. El formato legacy Base64 se rechaza.
- El encabezado debe usar el esquema `Bearer`; la API rechaza otros esquemas (api/app/security.py).
- Cualquier token ausente, inválido, expirado o con claims no verificables responde **401** con `{"detail":"Invalid token"}`; no se devuelve el detalle interno de la librería JWT.
- La clave se configura mediante `WORKSHOP_JWT_SECRET` y debe tener al menos 32 bytes; emisor y audiencia se configuran mediante `WORKSHOP_JWT_ISSUER` y `WORKSHOP_JWT_AUDIENCE`. No hay valores predeterminados.
- Si falta configuración o la clave tiene menos de 32 bytes, la aplicación falla durante el arranque con un error explícito de configuración.

- El 401 aplica a todos los endpoints y no se repite en cada uno, pero cada sección lo lista.
- Roles: la API solo distingue `TRAINER` (api/app/services.py:11,22). Cualquier otro valor se trata como usuario normal.

### Errores de validación comunes (422)

FastAPI/Pydantic devuelven **422** cuando el cuerpo o los parámetros no cumplen el esquema. Forma: `{"detail": [{"type", "loc", "msg", "input", ...}]}`. Los ejemplos están en cada endpoint donde aplica.

---

### 1. GET /api/tasks

1. **Qué hace:** lista las tareas de un responsable (por defecto, las del usuario autenticado).
2. **Autenticación:** sí. Header `Authorization: Bearer <token>`.
3. **Request**

| Parámetro | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `owner` | query | string | No | Responsable cuyas tareas se piden. Si se omite o va vacío, se usa el `username` del token. Un usuario no `TRAINER` solo puede enviar su propio username; un `TRAINER` puede enviar cualquiera. |

Ejemplo completo:

```http
GET /api/tasks?owner=student HTTP/1.1
Authorization: Bearer <token de student>
```

4. **Respuesta exitosa: 200**

Lista (puede ser vacía), ordenada por `id` ascendente (api/app/repository.py:13).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | integer | Identificador de la tarea. |
| `title` | string | Título. |
| `description` | string | Descripción. |
| `status` | string | Estado. Texto libre; los valores usados por la semilla son `TODO` e `IN_PROGRESS`. |
| `owner` | string | Responsable. |
| `priority` | string | Prioridad. Texto libre; la semilla usa `HIGH`, `MEDIUM`, `LOW`. |
| `createdAt` | string | Fecha de creación en UTC, formato `YYYY-MM-DD HH:MM:SS` (no ISO 8601). |

```json
[
  {"id":1,"title":"Refactor login","description":"Separar responsabilidades en frontend","status":"TODO","owner":"student","priority":"HIGH","createdAt":"2026-11-02 22:19:28"},
  {"id":2,"title":"Review API","description":"Revisar seguridad de endpoints","status":"IN_PROGRESS","owner":"student","priority":"MEDIUM","createdAt":"2026-11-02 22:19:28"}
]
```

5. **Errores**

| Código | Cuándo | Cuerpo de ejemplo |
|---|---|---|
| 401 | Token ausente, inválido, expirado o con claims no verificables | `{"detail":"Invalid token"}` |
| 403 | Usuario no `TRAINER` pide `owner` distinto del suyo | `{"detail":"Forbidden owner"}` |

6. **Notas de seguridad**
   - La autorización depende de la identidad del token, no del parámetro `owner`: `owner` solo se acepta si coincide con el usuario o si el rol es `TRAINER` (api/app/services.py:16-25).
   - La consulta SQL está parametrizada (api/app/repository.py:13-14).
   - Un `TRAINER` puede leer tareas de cualquier owner: es política confirmada y registrada en `docs/GOOD_PRACTICES.md`.
   - El username y rol provienen de claims JWT verificados por `api/app/security.py`; la autorización aplica las reglas de identidad de `api/app/services.py`. La interoperabilidad con el emisor y la configuración del runtime aún deben verificarse.

---

### 2. POST /api/tasks

1. **Qué hace:** crea una tarea a nombre del usuario autenticado.
2. **Autenticación:** sí. Header `Authorization: Bearer <token>`.
3. **Request** (cuerpo JSON, `Content-Type: application/json`)

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `title` | string | No (defecto `""`) | Título. |
| `description` | string | No (defecto `""`) | Descripción. |
| `status` | string | No (defecto `"TODO"`) | Estado. Sin lista de valores permitidos (H-API-10). |
| `priority` | string | No (defecto `"MEDIUM"`) | Prioridad. Sin lista de valores permitidos (H-API-10). |
| `owner` | string | No | Si se envía, debe ser igual al `username` del token; de lo contrario 403. Se ignora como fuente de identidad: el owner guardado es siempre el del token. |

Comportamiento heredado: todos los campos se convierten a texto con `str(...)` (api/app/schemas.py:13-18). Un número se guarda como texto y `null` se guarda como la cadena `"None"`; un título omitido se guarda vacío. Campos desconocidos se ignoran.

Ejemplo completo:

```http
POST /api/tasks HTTP/1.1
Authorization: Bearer <token de student>
Content-Type: application/json

{"title":"Escribir pruebas","description":"Cubrir API","status":"TODO","priority":"HIGH","owner":"student"}
```

4. **Respuesta exitosa: 201**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | integer | Identificador generado. |
| `title` | string | Título guardado. |
| `description` | string | Descripción guardada. |
| `status` | string | Estado guardado. |
| `owner` | string | Username del token. |
| `priority` | string | Prioridad guardada. |
| `createdAt` | string | Fecha de creación UTC, `YYYY-MM-DD HH:MM:SS`. |

```json
{"id":4,"title":"Escribir pruebas","description":"Cubrir API","status":"TODO","owner":"student","priority":"HIGH","createdAt":"2026-11-02 22:19:28"}
```

5. **Errores**

| Código | Cuándo | Cuerpo de ejemplo |
|---|---|---|
| 401 | Token ausente, inválido, expirado o con claims no verificables | `{"detail":"Invalid token"}` |
| 403 | `owner` enviado y distinto del username del token (también para `TRAINER`) | `{"detail":"Forbidden owner"}` |
| 422 | Cuerpo que no es JSON válido | `{"detail":[{"type":"json_invalid","loc":["body",0],"msg":"JSON decode error","input":{},"ctx":{"error":"Expecting value"}}]}` |
| 500 | La tarea se insertó pero no se pudo releer (rama defensiva, no reproducida) | `{"detail":"Task could not be created"}` |

6. **Notas de seguridad**
   - Las escrituras siempre ligan la tarea a la identidad del token; no se puede crear a nombre de otro, ni siquiera un `TRAINER` (api/app/services.py:28-43).
   - INSERT parametrizado (api/app/repository.py:20-24); comillas y texto con SQL se guardan literalmente.
   - No hay validación de dominio de `status`/`priority` ni límite de longitud (H-API-10); valores no reconocidos alteran los conteos de `/api/summary`.

---

### 3. GET /api/summary

1. **Qué hace:** devuelve el total de tareas de un responsable, su reparto por estado y cuántas tareas de prioridad alta siguen abiertas.
2. **Autenticación:** sí. Header `Authorization: Bearer <token>`.
3. **Request**

| Parámetro | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `owner` | query | string | No | Igual que en `GET /api/tasks`: por defecto el usuario del token; solo `TRAINER` puede pedir otro owner. |

Ejemplo completo:

```http
GET /api/summary?owner=student HTTP/1.1
Authorization: Bearer <token de student>
```

4. **Respuesta exitosa: 200**

| Campo | Tipo | Descripción |
|---|---|---|
| `owner` | string | Owner resumido. |
| `total` | integer | Número de tareas del owner. |
| `byStatus` | objeto (string → integer) | Conteo por valor de `status`. Solo aparecen estados con al menos una tarea; vacío si no hay tareas. |
| `highPriorityOpen` | integer | Tareas con `priority` exactamente `HIGH` y `status` distinto de `DONE` y `ARCHIVED` (api/app/services.py:10,67). |

```json
{"owner":"student","total":2,"byStatus":{"TODO":1,"IN_PROGRESS":1},"highPriorityOpen":1}
```

Ejemplo ilustrativo coherente con los datos semilla de `student` (sin tareas creadas adicionales).

5. **Errores**

| Código | Cuándo | Cuerpo de ejemplo |
|---|---|---|
| 401 | Token ausente, inválido, expirado o con claims no verificables | `{"detail":"Invalid token"}` |
| 403 | Usuario no `TRAINER` pide `owner` distinto del suyo | `{"detail":"Forbidden owner"}` |

6. **Notas de seguridad**
   - Misma regla de identidad que el listado (api/app/services.py:16-25); consulta parametrizada (api/app/repository.py:40-42).
   - Los conteos dependen de texto libre en `status`/`priority`; un valor con otra capitalización no cuenta como `HIGH` ni como cerrado.

---

### 4. POST /api/requirements

1. **Qué hace:** recibe un archivo de requisitos de texto y lo guarda en el servidor.
2. **Autenticación:** sí. Header `Authorization: Bearer <token>`.
3. **Request** (`multipart/form-data`)

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `file` | archivo | Sí | Archivo a subir. Extensión permitida: `.txt` o `.md` (sin distinguir mayúsculas). Tamaño máximo 5 MiB (5 242 880 bytes). Nombre sin `/` ni `\`, de hasta 255 caracteres tras normalizar. |

El nombre se normaliza: cualquier carácter fuera de `A-Z a-z 0-9 . _ -` se reemplaza por `_` (api/app/uploads.py:30). Un archivo con el mismo nombre sobrescribe el existente.

Ejemplo completo:

```http
POST /api/requirements HTTP/1.1
Authorization: Bearer <token de student>
Content-Type: multipart/form-data; boundary=----b

------b
Content-Disposition: form-data; name="file"; filename="req.md"
Content-Type: text/markdown

hola
------b--
```

4. **Respuesta exitosa: 201**

| Campo | Tipo | Descripción |
|---|---|---|
| `owner` | string | Username del token. |
| `fileName` | string | Nombre normalizado con el que se guardó. |
| `storedAt` | string | Ruta absoluta en el sistema de archivos del servidor (ver riesgos). |
| `size` | integer | Tamaño en bytes. |

```json
{"owner":"student","fileName":"req.md","storedAt":"C:\\Users\\Usuario\\AppData\\Local\\Temp\\tmpa44r9i5f\\up\\req.md","size":4}
```

(La ruta de `storedAt` depende del servidor; es la ruta real devuelta en la prueba.)

5. **Errores**

| Código | Cuándo | Cuerpo de ejemplo |
|---|---|---|
| 400 | Nombre vacío, con `/` o `\`, `.`/`..`, de más de 255 caracteres, o extensión distinta de `.txt`/`.md` | `{"detail":"Invalid upload"}` |
| 401 | Token ausente, inválido, expirado o con claims no verificables | `{"detail":"Invalid token"}` |
| 413 | El archivo supera 5 MiB | `{"detail":"Uploaded file is too large"}` |
| 422 | Falta el campo `file` | `{"detail":[{"type":"missing","loc":["body","file"],"msg":"Field required","input":null}]}` |

6. **Notas de seguridad**
   - Mitiga path traversal: rechaza separadores, normaliza el nombre y verifica que la ruta resuelta quede dentro del directorio de subidas (api/app/uploads.py:24-56).
   - Lectura por bloques con corte al superar el límite (api/app/uploads.py:59-72); el contenido aceptado se mantiene en memoria hasta 5 MiB antes de escribirse.
   - **Riesgo abierto (H-API-04):** el archivo se guarda sin el owner ni un identificador único, así que otro usuario autenticado puede sobrescribirlo subiendo el mismo nombre. `storedAt` expone la ruta interna del servidor (api/app/main.py:123). No se valida el contenido, solo nombre, extensión y tamaño.

---

### 5. GET /api/backend-health

1. **Qué hace:** consulta el estado del servicio de autenticación y lo devuelve junto con quién lo pidió.
2. **Autenticación:** sí. Header `Authorization: Bearer <token>`.
3. **Request**

Sin parámetros ni cuerpo. La URL consultada se toma de la variable de entorno del servidor `AUTH_HEALTH_URL` (por defecto `http://localhost:8080/q/health`) con timeout de 3 s (api/app/main.py:131-133); el cliente no la controla.

```http
GET /api/backend-health HTTP/1.1
Authorization: Bearer <token de student>
```

4. **Respuesta exitosa: 200**

| Campo | Tipo | Descripción |
|---|---|---|
| `requestedBy` | string | Username del token. |
| `status` | integer | Código HTTP devuelto por el servicio de autenticación, o `0` si no se pudo consultar. |
| `body` | string | Cuerpo de esa respuesta decodificado como UTF-8, o el texto de la excepción si falló. |

Los ejemplos sin `body` real del servicio de autenticación no se inventan aquí; esta es la respuesta real cuando el servicio no está disponible (la API sigue respondiendo 200):

```json
{"requestedBy":"student","status":0,"body":"HTTPConnectionPool(host='localhost', port=8080): Max retries exceeded with url: /q/health (Caused by NewConnectionError(...))"}
```

El texto exacto de `body` en el caso de éxito depende del servicio `auth` y no se verificó en este paso.

5. **Errores**

| Código | Cuándo | Cuerpo de ejemplo |
|---|---|---|
| 401 | Token ausente, inválido, expirado o con claims no verificables | `{"detail":"Invalid token"}` |

Un fallo de conexión o timeout con el servicio de autenticación **no** es un error HTTP: devuelve 200 con `status: 0`.

6. **Notas de seguridad**
   - **Riesgo abierto (H-API-07):** `body` incluye `str(error)`, lo que expone host, puerto, URL y detalles internos a cualquier usuario autenticado.
   - No admite entrada del cliente que cambie el destino de la petición (sin riesgo SSRF por parámetros).
   - Cualquier rol autenticado puede llamarlo; no hay restricción por rol.

---

### Riesgos pendientes de la sección api

| ID | Riesgo | Estado |
|---|---|---|
| H-API-01 | Token Base64 con secreto embebido y sin firma; identidad y rol falsificables | JWT HS256 implementado y probado localmente; pendiente revisión humana y configuración del runtime |
| H-API-03 | La autorización por identidad depende de la verificación del token | Autorización local usa identidad JWT verificada; pendiente revisión humana |
| H-API-04 | Subidas sin owner/id único (sobrescritura) y `storedAt` con ruta interna | Pendiente según revisión local; ver `HALLAZGOS.md` |
| H-API-06 | CORS con `allow_origins=["*"]` y credenciales (api/app/main.py:72-73) | Pendiente |
| H-API-07 | Errores de `backend-health` exponen detalle interno | Pendiente; los errores JWT ahora devuelven un mensaje genérico |
| H-API-10 | `status` y `priority` sin validación de dominio | Pendiente |

### Preguntas abiertas

1. ¿Cuál es el puerto/URL base oficial de la API? No está definido en el código de `api/app/` revisado.
2. ¿Qué despliegue configurará `WORKSHOP_JWT_SECRET`, `WORKSHOP_JWT_ISSUER` y `WORKSHOP_JWT_AUDIENCE`? La provisión está fuera del componente API y debe completarse antes de arrancar la API.
3. ¿Qué cuerpo devuelve el servicio `auth` en `/q/health`? Pertenece a otro componente y no se leyó.
4. ¿Debe `POST /api/tasks` rechazar `status`/`priority` desconocidos y títulos vacíos? Hoy los acepta.
5. ¿Se mantendrá `storedAt` como ruta absoluta? No hay endpoint de descarga que la use.

### Contrato acordado

Para H-API-01: JWT HS256 con `sub`, `role`, `exp`, `iss` y `aud`; sin transición
que acepte el token Base64 legacy. La clave, issuer y audience se proveen por
`WORKSHOP_JWT_SECRET`, `WORKSHOP_JWT_ISSUER` y `WORKSHOP_JWT_AUDIENCE`.
Los demás contratos de endpoints permanecen observados y requieren revisión
humana antes de cambiarse.
