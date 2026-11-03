# Hallazgos del laboratorio

Matriz de seguimiento del proceso de Discovery. Cada fila lleva componente, ID y
evidencia `archivo:línea` desde la raíz. Estados iniciales `Pendiente` o
`No encontrado`; `Aprobado para implementación` registra la aprobación del
alcance, no que la remediación esté implementada o verificada. `Resuelto`
requiere una nota y evidencia de verificación.

Fuentes leídas: `README.md`, `RETO.md`, `docs/GOOD_PRACTICES.md`, `prompts/api-phyton.md`,
`docs/ENDPOINTS.md` y el código de `api/` (`app/main.py`, `app/repository.py`,
`app/schemas.py`, `app/services.py`, `app/uploads.py`, pruebas y manifiestos de
dependencias). `PLAN.md` existe. Los hallazgos nuevos de esta revisión quedan
como `CANDIDATO` hasta revisión humana; los estados previos se conservan.

## Matriz de seguimiento

Orden: severidad de mayor a menor.

id | componente | hallazgo | tipo | explicacion | evidencia (archivo:linea) | severidad | estado
--- | --- | --- | --- | --- | --- | --- | ---
H-API-01 | api | Token Base64 con secreto embebido, sin firma, emisor ni audiencia | Vulnerabilidad | Resuelto localmente: la API valida JWT HS256 con `sub`, `role`, `exp`, `iss` y `aud`, y rechaza el token Base64 legacy. La clave/issuer/audience se configuran por entorno; pruebas de tokens inválidos, expirados y claims erróneos en `api/tests/test_characterization.py`. Pendiente revisión humana y configuración del runtime. | api/app/security.py:20-74, api/tests/test_characterization.py:19-123 | alta | Implementado y probado localmente; pendiente revisión humana
H-API-02 | api | SQL con concatenación en listado, resumen y alta de tareas | Vulnerabilidad | `owner` (query) y los campos del body se insertan como texto en la consulta. Una comilla simple rompe la sentencia; un valor como `' OR '1'='1` altera el `WHERE` y expone tareas de otros owners. `sqlite3` rechaza varias sentencias, lo que limita el impacto, pero no el bypass del filtro. RETO.md: "SQL". Resuelto con consultas parametrizadas en `api/app/repository.py`; las pruebas confirman que el filtro no se altera y que comillas en texto se guardan literalmente. | api/app/main.py:79-112, api/app/repository.py:10-43 | alta | Resuelto
H-API-03 | api | Autorización por `owner` enviado por el cliente | Vulnerabilidad | La API liga la identidad y el rol a claims de un JWT verificado y conserva las reglas: TRAINER solo lectura cross-owner y prohibición de crear a nombre ajeno. La validación end-to-end con identidad firmada está cubierta por pruebas; el hallazgo queda pendiente de revisión humana independiente. | api/app/security.py:39-74, api/app/services.py:16-44, api/tests/test_characterization.py:169-213 | alta | Pendiente de revisión humana
H-API-04 | api | Nombre de archivo sin normalizar y sin límite de extensión ni de tamaño | Vulnerabilidad | `file.filename` se unía directamente a la ruta de uploads: un nombre con `../` escribía fuera del directorio. `await file.read()` cargaba todo el archivo en memoria y lo escribía sin límite. Resuelto con validación de ruta/nombre/extensión y lectura limitada; las pruebas cubren traversal, tipo rechazado y tamaño máximo. | api/app/main.py:115-125, api/app/uploads.py:18-80 | alta | Resuelto
H-API-05 | api | Dependencias con CVE publicados: `urllib3 2.5.0` y `python-multipart 0.0.21` | Vulnerabilidad | `urllib3 2.5.0` está afectada por CVE-2025-66418 y CVE-2025-66471, corregidos en 2.6.0; la API la usa en `backend_health`. El impacto real depende de respuestas comprimidas del servicio de autenticación (hipótesis, no comprobada). `python-multipart` anterior a 0.0.22 tiene CVE-2026-24486 (path traversal con `UPLOAD_DIR` y `UPLOAD_KEEP_FILENAME`, que no usa la configuración predeterminada de este código). No se ejecutó un escáner de dependencias. RETO.md: "SCA". Actualizado `urllib3` a 2.8.0 y `python-multipart` a 0.0.33; el escaneo posterior ya no los reporta, pero sí detecta vulnerabilidades de Starlette fuera de los pins de este hallazgo, registradas como riesgo pendiente en PLAN.md. | api/requirements.txt:4-5 | media | Resuelto
H-API-06 | api | CORS con `allow_origins=["*"]` y `allow_credentials=True` | Vulnerabilidad | Configuración contradictoria: cualquier origen puede leer respuestas de la API y se declara soporte de credenciales. El riesgo concreto depende de cómo el cliente envía el token (no probado). Hallazgo adicional; no está en RETO.md para api. | api/app/main.py:72-73 | media | Pendiente
H-API-07 | api | Errores exponen detalle interno | Vulnerabilidad | La autenticación ahora responde con un 401 genérico sin filtrar excepciones JWT; `backend_health` aún devuelve `str(error)` en el cuerpo y puede exponer detalles del destino configurado. Hallazgo adicional, derivado de `docs/GOOD_PRACTICES.md` (Errores). | api/app/security.py:57-60, api/app/main.py:132-145 | media | Pendiente
H-API-08 | api | Rutas, base de datos, reglas y serialización en un solo archivo | Refactor | `create_app` conserva conexión SQLite, esquema y semillas; las rutas aún están en `main.py`, pero consultas, resumen y contratos HTTP tipados se separaron parcialmente por las dependencias aprobadas. El desacoplamiento de ciclo de vida de DB y semilla no se hizo. RETO.md: "Arquitectura". | api/app/main.py:51-76, api/app/main.py:79-145, api/app/repository.py:10-43, api/app/services.py:16-76, api/app/schemas.py:6-53 | media | Pendiente
H-API-09 | api | Calidad: `dict[str, Any]`, excepciones amplias, condicionales y duplicación | Refactor | Pydantic y mapeo de respuestas, resumen de una responsabilidad y consultas extraídas resuelven esas partes relacionadas; persiste una excepción amplia en backend-health, duplicación de INSERT de semilla y tipado de identidad como dict. RETO.md: "Calidad". | api/app/main.py:54-56, api/app/main.py:142-145, api/app/schemas.py:6-53, api/app/services.py:46-76 | baja | Pendiente
H-API-10 | api | `status` y `priority` aceptan cualquier texto | Bug | `TaskCreateRequest` mantiene strings sin enum/validador de dominio; un `priority` o `status` no reconocido sigue guardándose y afecta los conteos de resumen. Los defaults de title/description aún son cadenas vacías. Hallazgo adicional; no está en RETO.md. | api/app/schemas.py:6-18, api/app/main.py:88-103, api/app/services.py:58-76 | baja | Pendiente

## Candidatos nuevos de esta revisión (api)

### H-API-11 — Fallo de la dependencia de salud se devuelve con HTTP 200
- Estado: CANDIDATO
- Evidencia: `api/app/main.py:127-142` captura el fallo y devuelve `status=0` como cuerpo normal de la ruta; `api/tests/test_characterization.py:185-198` verifica que, ante conexión rechazada, la respuesta HTTP sigue siendo 200.
- Impacto: herramientas o consumidores que determinen la salud solo por el código HTTP pueden marcar saludable la API aunque el servicio de autenticación no responda.
- Prioridad propuesta: media.
- Contrato potencialmente afectado: `GET /api/backend-health`, en particular la correspondencia entre fallo de dependencia, código HTTP y campo JSON `status`.
- Cómo validarlo: con un `AUTH_HEALTH_URL` local no disponible, comprobar qué señal consumen los clientes de health-check y acordar si el fallo debe expresarse en el código HTTP, en el cuerpo o en ambos; cubrir por separado éxito, respuesta no exitosa y error de conexión.

### H-API-12 — Las cargas no tienen cuota acumulada de almacenamiento
- Estado: CANDIDATO
- Evidencia: `api/app/uploads.py:8` limita cada archivo a 5 MiB y `api/app/uploads.py:75-83` escribe cada carga aceptada sin consultar el espacio ya ocupado ni aplicar cuota por usuario o global. `api/app/main.py:114-125` expone la operación como `POST /api/requirements`.
- Impacto: cargas autenticadas repetidas con nombres distintos pueden aumentar sin límite el almacenamiento persistente hasta agotar el volumen del servicio.
- Prioridad propuesta: media.
- Contrato potencialmente afectado: `POST /api/requirements`; el límite documentado hoy es por archivo, no por usuario, volumen ni periodo.
- Cómo validarlo: en un directorio temporal, repetir cargas válidas con nombres únicos y medir el crecimiento acumulado; confirmar con el responsable del producto si debe existir una cuota global o por usuario y probar el límite acordado.

### H-API-13 — Texto de tareas sin límite de longitud
- Estado: CANDIDATO
- Evidencia: `api/app/schemas.py:6-18` declara `title` y `description` como `str` sin longitud máxima; `api/app/repository.py:17-27` persiste ambos valores y `api/app/main.py:87-103` acepta la petición de creación. Es distinto de H-API-10, que trata los valores de dominio de `status` y `priority`.
- Impacto: una petición autenticada puede persistir campos de texto arbitrariamente grandes, aumentando la base de datos y el tamaño de las respuestas. No se encontró un límite explícito de cuerpo o de campo en el código revisado.
- Prioridad propuesta: baja, pendiente de confirmar los límites funcionales esperados.
- Contrato potencialmente afectado: campos `title` y `description` del request/response de `POST /api/tasks`.
- Cómo validarlo: probar longitudes representativas y valores de frontera en una base temporal, verificar qué tamaños acepta hoy el endpoint y acordar límites con los consumidores antes de definir el comportamiento esperado.

Ningún hallazgo de RETO.md para api quedó como `No encontrado`: SCA, Auth,
Autorización, SQL, Files, Arquitectura y Calidad están presentes en el código.

## Contrato observado (derivado del código)

Esto es lo que hace el código hoy, contrastado con `docs/ENDPOINTS.md` y sin
acuerdo previo adicional. Estado: contrato observado, no acordado.

Autenticación: encabezado `Authorization: Bearer <base64(usuario|rol|expiracion|secreto)>`.
La autenticación exige JWT HS256 con `sub`, `role`, `exp`, `iss` y `aud`
verificados por `api/app/security.py`; tokens inválidos responden 401.

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

Contrato de autenticación acordado para H-API-01: JWT HS256 con `sub`, `role`,
`exp`, `iss` y `aud`, sin aceptación del token Base64 legacy. Los otros
contratos de endpoints siguen requiriendo aprobación antes de modificarse.

## Mapa del flujo (Discovery)

- Entrada HTTP → `verified_identity` (`api/app/security.py`) → claims verificados.
- `owner` de la query → `list_tasks` (`api/app/main.py:69-70`) y `summary` (`api/app/main.py:92-93`) → SQL por concatenación.
- Campos del body → `create_task` (`api/app/main.py:79-84`) → SQL por concatenación; el `lastrowid` se concatena en `api/app/main.py:87`.
- Archivo → `upload_requirement` (`api/app/main.py:109-111`) → escritura sin normalizar.
- Único acceso a SQLite: una conexión compartida creada en `api/app/main.py:35-36`, con `check_same_thread=False`.

## Pruebas y ejecución

`api/tests/test_api.py`:

- `test_lists_seeded_tasks` (`api/tests/test_api.py:9`): lista de semilla, camino válido.
- `test_creates_task_and_summary` (`api/tests/test_api.py:17`): alta y resumen, camino válido.
- `test_uploads_requirement` (`api/tests/test_api.py:36`): subida con nombre normal.
- `test_rejects_invalid_token` (`api/tests/test_api.py:55`): token inválido, 401.

`api/tests/test_characterization.py` agrega las pruebas ligadas a H-API-01/02/03/04/05.
Antes de H-API-01, las cinco caracterizaciones pasaron y confirmaron el comportamiento
legacy. Después de H-API-02/03/04, `python -m pytest -q` (cwd `api/`) pasó con
9 pruebas. La cobertura de esa ejecución fue:
`main.py` 97%, `repository.py` 90%, `schemas.py` 100%, `services.py` 98% y
`uploads.py` 88%. `python -m compileall -q app tests` (cwd `api/`) pasó.
La caracterización de H-API-01 ahora verifica el rechazo del token legacy y
tokens JWT con firma, expiración, issuer, audience y claims incorrectos.
`python tools/lab.py test api` pasó con 18 pruebas y cobertura total de 95.22%;
`api/app/security.py` tiene 100% de cobertura. H-API-03 conserva sus reglas de
owner y está pendiente de revisión humana independiente.

### auth — H-AUTH-01 (Iniciar sesión con usuario y contraseña)

`auth/src/test/java/com/bcp/workshop/auth/AuthResourceLoginUnitTest.java` (JUnit 5 + Mockito, `LegacyDatabase` simulada) cubre los CA-1 a CA-7 de `AuthResource.login`. `python tools/lab.py test auth` pasó: 13 pruebas (12 nuevas). JaCoCo sobre `AuthResource`: 100% de instrucciones (129/129) y de ramas (14/14). Dependencia agregada: `quarkus-junit5-mockito` (test).

## Pendientes

- La aprobación humana del plan para H-API-01 a H-API-05 se registró el 2026-11-02. H-API-01 fue aprobado explícitamente el 2026-11-03 y está implementado y probado localmente; falta revisión humana e inyectar la configuración JWT en el runtime. H-API-02 y H-API-04 están resueltos; H-API-03 queda pendiente de revisión humana; H-API-05 resuelve solo los dos paquetes incluidos en el hallazgo.
- `python -m pip_audit -r requirements.txt` (cwd `api/`): antes, 32 advisories en 3 paquetes; después de corregir los dos pins de H-API-05, 10 advisories, todos en Starlette 0.50.0. Ambos escaneos terminaron con código 1 por hallazgos; Starlette requiere evaluación fuera del alcance seleccionado.
- H-API-01: el contrato JWT HS256 con `sub`, `role`, `exp`, `iss`, `aud` se acordó el 2026-11-03. El runtime aún debe proveer `WORKSHOP_JWT_SECRET`, `WORKSHOP_JWT_ISSUER` y `WORKSHOP_JWT_AUDIENCE`; sin esa configuración la API falla al iniciar.
- H-API-03: política de TRAINER de solo lectura cross-owner confirmada por el usuario el 2026-11-02 y documentada en `docs/GOOD_PRACTICES.md`; la autorización ahora opera con claims JWT verificados, a la espera de revisión humana.
- Crear `docs/TESTING.md` solo en su paso de documentación.
