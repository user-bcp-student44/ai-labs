# Hallazgos del laboratorio

Matriz de seguimiento del proceso de Discovery. Cada fila lleva componente, ID y
evidencia `archivo:línea` desde la raíz. Estados iniciales `Pendiente` o
`No encontrado`; `Aprobado para implementación` registra la aprobación del
alcance, no que la remediación esté implementada o verificada. `Resuelto`
requiere una nota y evidencia de verificación.

Fuentes leídas: `README.md`, `RETO.md`, `docs/GOOD_PRACTICES.md`, `prompts/api-phyton.md` y
el código de `api/` (`app/main.py`, `app/repository.py`, `app/schemas.py`,
`app/services.py`, `app/uploads.py`, pruebas y manifiestos de dependencias).
`PLAN.md` existe. `docs/ENDPOINTS.md` y `docs/TESTING.md` no existen y no se
crearon en este paso.

## Matriz de seguimiento

Orden: severidad de mayor a menor.

id | componente | hallazgo | tipo | explicacion | evidencia (archivo:linea) | severidad | estado
--- | --- | --- | --- | --- | --- | --- | ---
H-API-01 | api | Token Base64 con secreto embebido, sin firma, emisor ni audiencia | Vulnerabilidad | Quien conozca el secreto, que está en el código, puede fabricar un token con `username` y `role` arbitrarios y el servicio lo acepta. La expiración solo compara un entero sin firma; cualquier campo se confía tal cual. RETO.md: "Auth" (Token). | api/app/main.py:34, api/app/main.py:37-46 | alta | Aprobado para implementación
H-API-02 | api | SQL con concatenación en listado, resumen y alta de tareas | Vulnerabilidad | `owner` (query) y los campos del body se insertan como texto en la consulta. Una comilla simple rompe la sentencia; un valor como `' OR '1'='1` altera el `WHERE` y expone tareas de otros owners. `sqlite3` rechaza varias sentencias, lo que limita el impacto, pero no el bypass del filtro. RETO.md: "SQL". Resuelto con consultas parametrizadas en `api/app/repository.py`; las pruebas confirman que el filtro no se altera y que comillas en texto se guardan literalmente. | api/app/main.py:79-112, api/app/repository.py:10-43 | alta | Resuelto
H-API-03 | api | Autorización por `owner` enviado por el cliente | Vulnerabilidad | La validación local ya liga la lectura a la identidad, permite TRAINER solo lectura cross-owner y prohíbe escribir a nombre ajeno, conforme a la política confirmada por el usuario y registrada en `docs/GOOD_PRACTICES.md`. Sin embargo, la identidad y el rol aún proceden del token legacy falsificable de H-API-01; el cierre efectivo de autorización queda pendiente de reemplazarlo por identidad JWT verificada. | api/app/main.py:83-110, api/app/services.py:16-44 | alta | Pendiente
H-API-04 | api | Nombre de archivo sin normalizar y sin límite de extensión ni de tamaño | Vulnerabilidad | `file.filename` se unía directamente a la ruta de uploads: un nombre con `../` escribía fuera del directorio. `await file.read()` cargaba todo el archivo en memoria y lo escribía sin límite. Resuelto con validación de ruta/nombre/extensión y lectura limitada; las pruebas cubren traversal, tipo rechazado y tamaño máximo. | api/app/main.py:115-125, api/app/uploads.py:18-80 | alta | Resuelto
H-API-05 | api | Dependencias con CVE publicados: `urllib3 2.5.0` y `python-multipart 0.0.21` | Vulnerabilidad | `urllib3 2.5.0` está afectada por CVE-2025-66418 y CVE-2025-66471, corregidos en 2.6.0; la API la usa en `backend_health`. El impacto real depende de respuestas comprimidas del servicio de autenticación (hipótesis, no comprobada). `python-multipart` anterior a 0.0.22 tiene CVE-2026-24486 (path traversal con `UPLOAD_DIR` y `UPLOAD_KEEP_FILENAME`, que no usa la configuración predeterminada de este código). No se ejecutó un escáner de dependencias. RETO.md: "SCA". Actualizado `urllib3` a 2.8.0 y `python-multipart` a 0.0.33; el escaneo posterior ya no los reporta, pero sí detecta vulnerabilidades de Starlette fuera de los pins de este hallazgo, registradas como riesgo pendiente en PLAN.md. | api/requirements.txt:4-5 | media | Resuelto
H-API-06 | api | CORS con `allow_origins=["*"]` y `allow_credentials=True` | Vulnerabilidad | Configuración contradictoria: cualquier origen puede leer respuestas de la API y se declara soporte de credenciales. El riesgo concreto depende de cómo el cliente envía el token (no probado). Hallazgo adicional; no está en RETO.md para api. | api/app/main.py:72-73 | media | Pendiente
H-API-07 | api | Errores exponen detalle interno | Vulnerabilidad | `legacy_identity` devuelve `str(error)` en el 401, y `backend_health` devuelve `str(error)` en el cuerpo, con lo que filtra detalles de excepciones y de la URL del servicio de autenticación. Hallazgo adicional, derivado de `docs/GOOD_PRACTICES.md` (Errores). | api/app/main.py:47-48, api/app/main.py:139-142 | media | Pendiente
H-API-08 | api | Rutas, base de datos, reglas y serialización en un solo archivo | Refactor | `create_app` conserva conexión SQLite, esquema y semillas; las rutas aún están en `main.py`, pero consultas, resumen y contratos HTTP tipados se separaron parcialmente por las dependencias aprobadas. El desacoplamiento de ciclo de vida de DB y semilla no se hizo. RETO.md: "Arquitectura". | api/app/main.py:51-76, api/app/main.py:79-145, api/app/repository.py:10-43, api/app/services.py:16-76, api/app/schemas.py:6-53 | media | Pendiente
H-API-09 | api | Calidad: `dict[str, Any]`, excepciones amplias, condicionales y duplicación | Refactor | Pydantic y mapeo de respuestas, resumen de una responsabilidad y consultas extraídas resuelven esas partes relacionadas; persisten excepciones amplias en autenticación y backend-health, duplicación de INSERT de semilla, y tipado de identidad como dict. RETO.md: "Calidad". | api/app/main.py:47-48, api/app/main.py:62-64, api/app/main.py:139-142, api/app/schemas.py:6-53, api/app/services.py:46-76 | baja | Pendiente
H-API-10 | api | `status` y `priority` aceptan cualquier texto | Bug | `TaskCreateRequest` mantiene strings sin enum/validador de dominio; un `priority` o `status` no reconocido sigue guardándose y afecta los conteos de resumen. Los defaults de title/description aún son cadenas vacías. Hallazgo adicional; no está en RETO.md. | api/app/schemas.py:6-18, api/app/main.py:88-103, api/app/services.py:58-76 | baja | Pendiente

Ningún hallazgo de RETO.md para api quedó como `No encontrado`: SCA, Auth,
Autorización, SQL, Files, Arquitectura y Calidad están presentes en el código.

## Contrato observado (derivado del código)

`docs/ENDPOINTS.md` no existe; no se creó en este paso. Esto es lo que
hace el código hoy, sin acuerdo previo. Estado: contrato observado, no acordado.

Autenticación: encabezado `Authorization: Bearer <base64(usuario|rol|expiracion|secreto)>`.
Sin token válido responde 401 (`api/app/main.py:17-26`).

Endpoint | Entrada | Salida observada | evidencia
--- | --- | --- | ---
GET /api/tasks | query `owner` opcional (por defecto el usuario del token) | 200, lista de tareas con `id,title,description,status,owner,priority,createdAt` | api/app/main.py:67-76
POST /api/tasks | body JSON libre: `title`, `description`, `status` (defecto `TODO`), `priority` (defecto `MEDIUM`), `owner` (defecto usuario del token) | 201, la tarea creada | api/app/main.py:77-88
GET /api/summary | query `owner` opcional | 200, `{owner,total,byStatus,highPriorityOpen}` | api/app/main.py:90-106
POST /api/requirements | multipart `file` | 201, `{owner,fileName,storedAt,size}`; guarda el archivo en uploads | api/app/main.py:107-112
GET /api/backend-health | ninguna | 200, `{requestedBy,status,body}`; `status` 0 si falla la consulta a `AUTH_HEALTH_URL` | api/app/main.py:114-122

Configuración observada: `WORKSHOP_DB_PATH` (predeterminado `./data/workshop.db`),
`WORKSHOP_UPLOAD_DIR` (`./uploads`), `AUTH_HEALTH_URL`
(`http://localhost:8080/q/health`) en `api/app/main.py:30-31` y `api/app/main.py:116`.

Contrato acordado: no existe. Pendiente de acuerdo humano antes de cambiar
cualquier endpoint, incluido el formato que usa el frontend.

## Mapa del flujo (Discovery)

- Entrada HTTP → `legacy_identity` (`api/app/main.py:17`) → identidad del token.
- `owner` de la query → `list_tasks` (`api/app/main.py:69-70`) y `summary` (`api/app/main.py:92-93`) → SQL por concatenación.
- Campos del body → `create_task` (`api/app/main.py:79-84`) → SQL por concatenación; el `lastrowid` se concatena en `api/app/main.py:87`.
- Archivo → `upload_requirement` (`api/app/main.py:109-111`) → escritura sin normalizar.
- Único acceso a SQLite: una conexión compartida creada en `api/app/main.py:35-36`, con `check_same_thread=False`.

## Pruebas y ejecución

`api/tests/test_api.py`:

- `test_lists_seeded_tasks` (`api/tests/test_api.py:19`): lista de semilla, camino válido.
- `test_creates_task_and_summary` (`api/tests/test_api.py:27`): alta y resumen, camino válido.
- `test_uploads_requirement` (`api/tests/test_api.py:41`): subida con nombre normal.
- `test_rejects_invalid_token` (`api/tests/test_api.py:54`): token inválido, 401.

`api/tests/test_characterization.py` agrega las pruebas ligadas a H-API-01/02/03/04/05.
Antes de cambiar la aplicación, las cinco pasaron y confirmaron el comportamiento
anterior. Después de H-API-02, H-API-03 (capa local) y H-API-04, `python -m pytest -q` (cwd `api/`)
pasó: 9 pruebas. La cobertura de los archivos de aplicación modificados fue:
`main.py` 97%, `repository.py` 90%, `schemas.py` 100%, `services.py` 98% y
`uploads.py` 88%. `python -m compileall -q app tests` (cwd `api/`) pasó.
H-API-01 aún no se ha modificado; su caracterización confirma el comportamiento
legacy previo. H-API-03 se caracterizó antes de implementarse y la prueba ahora
verifica la política local acordada, pero el cierre end-to-end depende de
resolver H-API-01. La prueba base confirmó que el helper de encabezado funciona.

### auth — H-AUTH-01 (Iniciar sesión con usuario y contraseña)

`auth/src/test/java/com/bcp/workshop/auth/AuthResourceLoginUnitTest.java` (JUnit 5 + Mockito, `LegacyDatabase` simulada) cubre los CA-1 a CA-7 de `AuthResource.login`. `python tools/lab.py test auth` pasó: 13 pruebas (12 nuevas). JaCoCo sobre `AuthResource`: 100% de instrucciones (129/129) y de ramas (14/14). Dependencia agregada: `quarkus-junit5-mockito` (test).

## Pendientes

- La aprobación humana del plan para H-API-01 a H-API-05 se registró el 2026-11-02. H-API-02 y H-API-04 están resueltos; H-API-03 tiene su corrección local aplicada pero queda pendiente de cierre conjunto con H-API-01; H-API-05 resuelve solo los dos paquetes incluidos en el hallazgo. H-API-01 está aprobado pero bloqueado por coordinación externa en PLAN.md.
- `python -m pip_audit -r requirements.txt` (cwd `api/`): antes, 32 advisories en 3 paquetes; después de corregir los dos pins de H-API-05, 10 advisories, todos en Starlette 0.50.0. Ambos escaneos terminaron con código 1 por hallazgos; Starlette requiere evaluación fuera del alcance seleccionado.
- H-API-01: contrato de JWT compatible con el emisor de auth, junto con origen/configuración de emisor, audiencia y secreto, requiere coordinación externa antes de implementar.
- H-API-03: política de TRAINER de solo lectura cross-owner confirmada por el usuario el 2026-11-02 y documentada en `docs/GOOD_PRACTICES.md`; cierre end-to-end pendiente de H-API-01 porque el token legacy aún permite falsificar `role`.
- Crear `docs/ENDPOINTS.md` y `docs/TESTING.md` solo en sus pasos de documentación.
