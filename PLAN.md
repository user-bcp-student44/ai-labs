# Plan de remediación

Estado: plan aprobado por el usuario el 2026-11-02 para H-API-01 a H-API-05. H-API-01 recibió aprobación explícita y contrato JWT acordado el 2026-11-03; implementación local en `day1/prompting`, 18 pruebas aprobadas, cobertura API 95.22% y `api/app/security.py` 100%. Pendientes: revisión humana, provisión de configuración JWT en runtime y verificación de interoperabilidad con el emisor fuera del alcance. No se creó PR ni se hizo push por las reglas del Dia 1. `docs/ENDPOINTS.md` existe; `docs/TESTING.md` no se creó.

## api

### Alcance

Fuente: [HALLAZGOS.md](c:/Users/Usuario/Documents/T15664-hider-sanchez/ai-labs/HALLAZGOS.md). H-API-01 a H-API-05 se seleccionaron mientras estaban Pendiente; sus estados actuales se reflejan en la matriz de seguimiento.

Fuera de alcance por ahora: H-API-06 (CORS), H-API-07 (detalle de errores), H-API-08 (separación completa de capas), H-API-09 (calidad general) y H-API-10 (validación de `status` y `priority`). Solo se tocan si un cambio seleccionado lo exige, y se registra en HALLAZGOS.md.

Ejecución: H-API-05 (pins directos actualizados; quedan CVE de Starlette fuera del alcance), H-API-02 y H-API-04 implementados. H-API-03 mantiene su capa de autorización y ahora consume identidad de JWT verificada. H-API-01 está implementado localmente; el runtime debe proveer la configuración JWT y la interoperabilidad con auth no se probó.

### Restricciones comunes

- Contrato: `docs/ENDPOINTS.md` registra los endpoints observados y el contrato JWT acordado para H-API-01. Se preservan formatos de rutas y respuestas; el token legacy se rechaza conforme a la decisión aprobada.
- Convenciones de [docs/GOOD_PRACTICES.md](c:/Users/Usuario/Documents/T15664-hider-sanchez/ai-labs/docs/GOOD_PRACTICES.md) (api): modelos Pydantic, capas ruta → servicio → repositorio, SQL parametrizado, autorización por `identity["username"]`, archivos normalizados, `HTTPException` con mensaje genérico, dependencias sin CVE.
- Clean code (AGENTS.md, api, reglas 8-12): una responsabilidad por función, nombres de propósito, sin duplicación, retorno anticipado, constantes con nombre.
- Dependencias: PyJWT se fija en `api/requirements.txt` para verificar JWT con una biblioteca mantenida, sin implementar criptografía propia.

### Estructura de archivos propuesta

- `api/app/main.py`: solo rutas FastAPI; enlazan dependencias y respuestas.
- `api/app/schemas.py` (nuevo): modelos Pydantic de entrada y salida.
- `api/app/security.py` (nuevo): verificación del token (H-API-01).
- `api/app/services.py` (nuevo): regla de owner efectivo (H-API-03).
- `api/app/repository.py` (nuevo): consultas SQL parametrizadas (H-API-02).
- `api/app/uploads.py` (nuevo): normalización y validación de archivos (H-API-04).
- `api/requirements.txt`: pins corregidos de H-API-05 y PyJWT 2.15.1 para H-API-01.
- `api/tests/test_api.py`: caracterización y pruebas nuevas.

Nota: `repository.py` y `schemas.py` adelantan parte de H-API-08 (no seleccionado). Se justifica porque H-API-01, H-API-02 y H-API-03 no se pueden implementar sin separar la verificación de identidad y el acceso a datos. El resto de `main.py` no se reorganiza.

### Prerequisito P0: pruebas de caracterización base

**Actualización 2026-11-02.** P0 completado: `python -m pytest -q` (cwd `api/`) pasó con 4 pruebas, incluyendo el helper `headers()`; después, las cinco caracterizaciones nuevas pasaron antes de cambiar la aplicación.

- Verificar `api/tests/test_api.py:15-16`. En la lectura, la función `headers()` aparece ilegible (`f"****** role)}"`). Antes de caracterizar hay que confirmar que genera `Authorization: Bearer <token()>`. Corregirla es un cambio de prueba, no de contrato.
- Verificar `api/tests/test_api.py:57`, que usa un valor de token oculto en la lectura.
- Las pruebas existentes (`test_lists_seeded_tasks`, `test_creates_task_and_summary`, `test_uploads_requirement`, `test_rejects_invalid_token`) deben seguir en verde en cada paso.
- Estado: completado. Las verificaciones posteriores confirmaron la validez del encabezado y el token de prueba.

---

### H-API-05 — Dependencias con CVE

**Hallazgo.** H-API-05, severidad media, aprobado y resuelto para los dos paquetes incluidos en HALLAZGOS.md (RETO.md, «SCA»).

**Problema.** Los pins originales `urllib3==2.5.0` (`api/requirements.txt:4`) y `python-multipart==0.0.21` (`api/requirements.txt:5`) tenían advisories reportados por `pip-audit`; `urllib3` se usa en `backend_health` (`api/app/main.py:123-137`).

**Cambio propuesto.** Subir a `urllib3==2.6.0` y `python-multipart==0.0.22`, o a la versión más reciente verificada. Mantener pin exacto como el resto del archivo.

**Archivos.** `api/requirements.txt`.

**Clean code.** No aplica código nuevo: solo cambia el pin, sin funciones ni constantes.

**Caracterización previa.** Antes del cambio, `python -m pytest -q tests/test_characterization.py` (cwd `api/`) pasó con 5 pruebas, incluyendo `test_backend_health_failure_response_shape`, que fija `status=0` y las claves `requestedBy`, `status`, `body` (`api/tests/test_characterization.py:156-168`).

**Verificación.** `pip-audit -r api/requirements.txt` antes y después. Instalar en un entorno limpio y confirmar que la resolución no rompe `fastapi` ni `uvicorn`. Revisar el changelog de urllib3 2.6.0.

**Caracterización antes.** `python -m pytest -q tests/test_characterization.py` (cwd `api/`): 5 passed; `test_backend_health_failure_response_shape` confirmó 200, `status=0` y las claves observadas.

**Cambio realizado.** `api/requirements.txt`: `urllib3==2.8.0` y `python-multipart==0.0.33`, seleccionadas tras `python -m pip index versions urllib3` y `python -m pip index versions python-multipart` (cwd `api/`), que confirmaron esas versiones como las publicadas más recientes disponibles al ejecutar el cambio. `python -m pip install -r requirements.txt` terminó correctamente.

**Verificación después.** `python -m pip_audit -r requirements.txt` (cwd `api/`): ninguno de esos dos paquetes se reporta. El comando todavía termina con código 1 por 10 advisories de `starlette==0.50.0`. No se amplió el alcance a FastAPI/Starlette ni se silenció el scanner. La prueba de backend-health siguió pasando en la suite completa (9 passed).

**Estado.** Resuelto para los dos paquetes incluidos en H-API-05. Riesgo de dependencias transitivas Starlette pendiente de evaluación fuera de este alcance.

---

### H-API-02 — SQL concatenado

**Hallazgo.** H-API-02, severidad alta, aprobado y resuelto en HALLAZGOS.md (RETO.md, «SQL»).

**Problema.** En el baseline, listado, alta, lectura por `lastrowid` y resumen concatenaban valores SQL. Las cinco caracterizaciones previas confirmaron el bypass de owner y el error de comillas; el código corregido ahora está en `api/app/repository.py:10-38`.

**Cambio propuesto.** Parametrizar con `?` de `sqlite3` y pasar los valores como tupla. Mover las consultas a `api/app/repository.py`:
- `list_tasks_by_owner(connection, owner)`: `SELECT ... WHERE owner = ? ORDER BY id`.
- `insert_task(connection, task)`: `INSERT ... VALUES (?, ?, ?, ?, ?, datetime('now'))`.
- `find_task(connection, task_id)`: `SELECT ... WHERE id = ?`.
- `summarize_owner_tasks(connection, owner)`: `SELECT status, priority ... WHERE owner = ?`.

Mantener `ORDER BY id` y el formato de respuesta. Parametrizar no cambia los valores aceptados hoy; la validación de `status` y `priority` es H-API-10 y no se toca.

**Cambio de comportamiento a registrar.** Una comilla en `title` hoy provoca error no controlado; tras el cambio se guarda como texto y responde 201. Es una corrección, pero cambia el resultado y debe quedar en HALLAZGOS.md.

**Archivos.** `api/app/repository.py` (nuevo), `api/app/main.py`, `api/app/schemas.py`, `api/app/services.py` (mapeo tipado y resumen).

**Clean code.** Cada función del repositorio ejecuta una sola consulta. La lista de columnas se define una vez como constante `TASK_COLUMNS`, en lugar de repetirse en tres consultas. El conteo del resumen pasa a `api/app/services.py` con retorno anticipado, en lugar de los cuatro niveles de `if` de `api/app/main.py:101-104`. No se reescribe el resto de H-API-09.

**Caracterización previa.**
- Válido: crear tarea con título normal → 201 y aparece en `GET /api/tasks` (base, `api/tests/test_api.py:27`).
- Comilla en `title` de `POST /api/tasks`: hoy se espera error (no ejecutado). Después: 201 y título literal guardado.
- Defecto caracterizado: `GET /api/tasks?owner=x' OR '1'='1` hoy devuelve las 3 tareas semilla y el test lo fija. Se invierte a `[]` tras el cambio.
- Defecto caracterizado: `GET /api/summary?owner=x' OR '1'='1` hoy devuelve `total` 3. Se invierte a 0.
- Orden de `GET /api/tasks` por `id` y forma de cada elemento: se fija antes del cambio.

**Caracterización antes.** `python -m pytest -q tests/test_characterization.py` (cwd `api/`): 5 passed; se observaron 3 tareas ante el filtro inyectado, `total=3` en el resumen y HTTP 500 con una comilla simple en el título.

**Verificación después.** `python -m pytest -q` (cwd `api/`): 9 passed. Las mismas pruebas comprueban `[]` y `total=0` ante el filtro, título con comilla almacenado literalmente (201), orden de IDs y claves de respuesta existentes.

**Estado.** Resuelto. Las consultas de listado, alta, lectura por ID y resumen usan parámetros enlazados en `api/app/repository.py`; las rutas no construyen SQL.

---

### H-API-01 — Token Base64 sin firma

**Hallazgo.** H-API-01, severidad alta. El usuario aprobó explícitamente su implementación y el contrato JWT el 2026-11-03.

**Contrato acordado.** JWT firmado HS256, claims obligatorios `sub`, `role`, `exp`, `iss` y `aud`. `sub` representa username; `role` representa rol. No hay periodo de compatibilidad: los tokens Base64 legacy se rechazan.

**Implementación.** `api/app/security.py` verifica exclusivamente HS256 y compara issuer/audience con `WORKSHOP_JWT_ISSUER` y `WORKSHOP_JWT_AUDIENCE`. `WORKSHOP_JWT_SECRET` debe configurarse sin valor predeterminado y tener al menos 32 bytes. Si falta configuración o la clave es débil, la API falla durante el arranque; un token no verificable recibe 401 genérico. `api/app/main.py` valida configuración al iniciar e inyecta la dependencia en las cinco rutas. `api/requirements.txt` fija PyJWT 2.15.1.

**Archivos.** `api/app/security.py`, `api/app/main.py`, `api/requirements.txt`, `api/tests/auth_helpers.py`, `api/tests/conftest.py`, `api/tests/test_api.py`, `api/tests/test_characterization.py`; contratos y evidencias en `docs/ENDPOINTS.md` y `HALLAZGOS.md`.

**Pruebas.** Baseline antes del cambio: `python tools/lab.py test api` pasó con 9 pruebas y 94.53% de cobertura total. Después del cambio: el mismo comando pasó con 18 pruebas, 95.22% total y 100% de cobertura de `app/security.py`. Se cubre token válido, rechazo de legacy, firma/expiración/issuer/audience/claims inválidos, configuración ausente o débil durante startup, encabezado Bearer y reglas de autorización conservadas.

**Riesgos residuales.** No se modificó ni inspeccionó `auth/` o el despliegue. La emisión real del JWT y la provisión de `WORKSHOP_JWT_SECRET`, `WORKSHOP_JWT_ISSUER` y `WORKSHOP_JWT_AUDIENCE` en el runtime quedan por verificar antes de habilitar tráfico autenticado. Sin esa configuración la API no inicia.

**Estado.** Implementado y probado localmente en `day1/prompting`; pendiente revisión humana. No se creó PR ni se hizo push conforme a las reglas del Dia 1.

---

### H-API-03 — Autorización por `owner` del cliente

**Hallazgo.** H-API-03, severidad alta, aprobado en HALLAZGOS.md (RETO.md, «Autorización»). La implementación local está probada y ahora consume identidad JWT verificada; se deja pendiente para revisión humana independiente.

**Problema.** Antes, `owner or identity["username"]` permitía que el cliente seleccionara datos de otros owners y el body permitía crear tareas bajo otro owner. La caracterización previa en `api/tests/test_characterization.py:82-105` confirmó esa conducta.

**Cambio propuesto.**
- `api/app/services.py`: `resolve_read_owner` limita los roles ordinarios a su identidad y permite TRAINER leer otro owner. `resolve_create_owner` siempre liga la escritura a la identidad y devuelve 403 si el cliente envía otro owner.
- Las rutas resuelven el owner autorizado antes de llamar al repositorio.
- El permiso de TRAINER solo aplica a lectura de lista y resumen; la política fue confirmada por el usuario y documentada en `docs/GOOD_PRACTICES.md`.

**Cambio de comportamiento.** `GET /api/tasks?owner=trainer` y `GET /api/summary?owner=trainer` con token student pasan de 200 a 403; TRAINER puede leer owners ajenos. El alta con owner que difiere del token pasa de 201 a 403.

**Archivos.** `api/app/services.py`, `api/app/main.py`, `api/app/schemas.py`, `api/tests/test_characterization.py`, `docs/GOOD_PRACTICES.md` (regla acordada en sección api).

**Clean code.** `resolve_read_owner`, `resolve_create_owner` y `ensure_owner_matches_identity` tienen responsabilidades pequeñas, usan retorno anticipado y una constante para 403.

**Decisión acordada antes de implementar.** El usuario confirmó que TRAINER puede leer tareas ajenas en `GET /api/tasks` y `GET /api/summary`, pero no puede crear tareas a nombre de otro owner. La regla se añadió a `docs/GOOD_PRACTICES.md` en la sección api.

**Caracterización previa.**
- Sin `owner` → 2 tareas de `student` (semilla).
- Defecto caracterizado: `GET /api/tasks?owner=trainer` con token `student` hoy → 200 con 1 tarea. Se invierte a 403.
- Defecto caracterizado: `POST /api/tasks` con `owner: "trainer"` y token `student` hoy → 201 con `owner: "trainer"`. Se invierte.
- `GET /api/summary?owner=trainer` hoy → `total` 1. Se invierte a 403.
- Base que debe seguir en verde: `test_creates_task_and_summary` (`api/tests/test_api.py:27-38`) con `owner` igual a `student`.

**Caracterización antes.** `python -m pytest -q tests/test_characterization.py` (cwd `api/`): 5 passed; `student` lee `/api/tasks?owner=trainer` (200/1), obtiene summary total 1 y crea una tarea con `owner=trainer` (201).

**Verificación después.** `python -m pytest -q` (cwd `api/`): 9 passed. Se verifican 403 a student ante lectura/escritura ajena, lecturas cross-owner con rol TRAINER para lista y resumen, y 403 a TRAINER al crear a nombre ajeno.

**Estado.** Corrección local implementada y probada; pendiente de revisión humana independiente.

---

### H-API-04 — Carga de archivos sin normalizar

**Hallazgo.** H-API-04, severidad alta, aprobado y resuelto en HALLAZGOS.md (RETO.md, «Files»).

**Problema.** En el baseline, `file.filename` se unía directamente a la ruta, se aceptaban separadores y `await file.read()` cargaba el contenido sin límite. La prueba previa confirmó escritura fuera de uploads; la solución actual está en `api/app/uploads.py:16-65`.

**Cambio propuesto.** `api/app/uploads.py` con responsabilidades separadas:
- `sanitize_filename(name)`: rechaza nombres con separadores `/` o `\` (el caso de traversal debe responder 400 como fija la caracterización propuesta), conserva `[A-Za-z0-9._-]`, rechaza vacío, `.` y `..`, y limita la longitud con `MAX_FILENAME_LENGTH`.
- `ensure_allowed_extension(name)`: lista permitida `ALLOWED_EXTENSIONS`. Propuesta: `.txt` y `.md`. Rechazo con 400.
- `read_limited(file)`: lee en fragmentos de `CHUNK_SIZE` y corta al superar `MAX_UPLOAD_BYTES` con 413. Propuesta: 5 MiB.
- `resolve_target(upload_dir, name)`: confirma con `resolve()` y `is_relative_to()` que la ruta final queda dentro de uploads.
- Respuesta sin cambios de forma: `{owner, fileName, storedAt, size}` (`api/app/main.py:112`). `fileName` pasa a ser el nombre saneado.

**Decisión sobre sobrescritura.** Hoy un nombre repetido sobrescribe. Se propone mantener el nombre para no romper `test_uploads_requirement` (`api/tests/test_api.py:41-51`). Un prefijo único cambiaría ese contrato.

**Archivos.** `api/app/uploads.py` (nuevo), `api/app/main.py`, `api/app/schemas.py`, `api/tests/test_characterization.py`.

**Clean code.** Cuatro funciones, cada una con una responsabilidad. Constantes con nombre: `MAX_UPLOAD_BYTES` (5 MiB), `CHUNK_SIZE` (propuesta 64 KiB), `MAX_FILENAME_LENGTH` (propuesta 255) y `ALLOWED_EXTENSIONS`. Las validaciones usan retorno anticipado y no anidan `if`. Pendiente, fuera de alcance: `storedAt` sigue devolviendo la ruta absoluta del servidor (`api/app/main.py:112`); corresponde a H-API-07.

**Caracterización previa.**
- `requirements.txt` → 201 y archivo en uploads (base, `api/tests/test_api.py:41-51`).
- Defecto caracterizado: nombre `../escape.txt` hoy escribe en el directorio padre de uploads. La prueba usa `tmp_path`. Se invierte a 400 sin archivo escrito.
- Defecto caracterizado: archivo de 6 MiB hoy → 201. Se invierte a 413.
- Defecto caracterizado: `evil.exe` hoy → 201. Se invierte a 400.
- Forma de la respuesta con sus cuatro claves, fijada antes del cambio.

**Caracterización antes.** `python -m pytest -q tests/test_characterization.py` (cwd `api/`): 5 passed; `../escape.txt`, 6 MiB y `.exe` fueron aceptados, y el traversal escribió fuera de uploads.

**Verificación después.** `python -m pytest -q` (cwd `api/`): 9 passed. Traversal y extensión `.exe` responden 400, tamaño superior a 5 MiB responde 413, exactamente 5 MiB se acepta; un `.txt` válido conserva 201 y las cuatro claves de respuesta. No se crea el archivo fuera de uploads.

**Estado.** Resuelto con `.txt`/`.md`, límite 5 MiB y sobrescritura por nombre conservada.

---

### Decisiones del responsable del laboratorio

Respondidas por el responsable del laboratorio en la sesión. Cierran las decisiones de diseño de esta sección.

1. H-API-01: biblioteca JWT **PyJWT** (dependencia nueva, justificada en este plan).
2. H-API-01: rechazar tokens Base64 legacy inmediatamente; no hay periodo de transición.
3. H-API-01: contrato JWT HS256 con `sub`, `role`, `exp`, `iss` y `aud`, confirmado por el usuario el 2026-11-03. Las variables de entorno deben configurarse en el runtime; la interoperabilidad con el emisor real no se probó en este alcance.
4. H-API-03: student recibe **403** ante `owner` ajeno en lectura y escritura; TRAINER puede leer owners ajenos en lista y resumen, pero no crear a nombre de otro owner. Confirmado por el usuario el 2026-11-02 y registrado en `docs/GOOD_PRACTICES.md`.
5. H-API-04: extensiones permitidas **`.txt`, `.md`**; tamaño máximo **5 MiB**; sobrescritura por nombre repetido **se conserva**.
6. H-API-05: versiones seleccionadas `urllib3==2.8.0` y `python-multipart==0.0.33`, verificadas con el índice de paquetes y `pip-audit`; el usuario confirmó mantener el alcance actual y registrar Starlette como riesgo aparte (2026-11-02).
7. Revisión humana del plan antes de implementar (paso 5 del README): **aprobada por el usuario (2026-11-02)** para el alcance H-API-01 a H-API-05.

### Ejecuciones y cobertura

- Antes de modificar `api/app/`: `python -m pytest -q` (cwd `api/`): 4 passed.
- Caracterización antes de corregir: `python -m pytest -q tests/test_characterization.py` (cwd `api/`): 5 passed.
- Después de H-API-02/03/04: `python -m pytest -q` (cwd `api/`): 9 passed.
- H-API-01 después del cambio: `python tools/lab.py test api`: 18 passed; 95.22% cobertura total y 100% en `app/security.py`.
- Compilación: `python -m compileall -q app tests` (cwd `api/`): passed.
- Cobertura de archivos de app modificados (`python -m coverage report --include='app/main.py,app/repository.py,app/services.py,app/schemas.py,app/uploads.py,app/security.py' --no-skip-covered --show-missing`, con cobertura generada por `python -m pytest -q --cov=app --cov-report=term-missing`): main 96% (77 statements), repository 90% (19), schemas 100% (38), security 100% (36), services 98% (36), uploads 88% (49). Cada archivo supera la meta de 85%.
- Dependencias antes/después: `python -m pip_audit -r requirements.txt` (cwd `api/`) reportó primero 32 advisories en 3 paquetes y después 10 en Starlette 0.50.0; ambos comandos terminaron con código 1. Los dos paquetes del alcance H-API-05 ya no aparecen en el segundo reporte.

### Pendientes y riesgos

- H-API-01: pendiente revisión humana, provisión de las tres variables JWT en runtime y prueba de interoperabilidad con el emisor antes de habilitar tráfico autenticado.
- H-API-03: autorización local usa identidad y rol JWT verificados; pendiente revisión humana independiente.
- Auditoría tras añadir PyJWT: `api\.venv\Scripts\python.exe -m pip_audit -r api\requirements.txt` terminó con código 1 por 10 advisories de `starlette==0.50.0`; PyJWT no fue reportado. Starlette queda fuera del alcance y no se silenció el scanner.
- H-API-05: 10 advisories de Starlette 0.50.0 siguen detectados; requiere evaluación y posible plan aprobado separado. No se modificó el pin de FastAPI ni se excluyó el scanner.
- `docs/ENDPOINTS.md` registra los endpoints observados y el contrato JWT acordado para H-API-01; los demás contratos siguen pendientes de revisión.
- No se creó `docs/TESTING.md`; corresponde a un paso posterior.
