# backend_spec.md

## 1. Resumen de la implementación

**Implementación no realizada.** El cambio de formato está bloqueado hasta registrar la coordinación requerida con el equipo de `api/` (H-API-01). Cambiar el emisor antes de confirmar que el verificador acepta el formato y la clave acordados podría dejar incompatibles al emisor y al verificador.

La información disponible identifica `auth/src/main/java/com/bcp/workshop/auth/LegacyTokenUtil.java` y describe su método `create`, que produce el token Base64 con un secreto fijo. No se proporcionaron los archivos fuente, el contrato detallado del endpoint, el `pom.xml`, las pruebas ni el código del verificador. Por eso no puedo reconstruir con fidelidad las firmas existentes ni entregar una sustitución Java integrada sin inventar o contradecir código.

No se identificó un modelo de datos ni una operación de persistencia relacionada con la emisión del token. No se añadieron clases, endpoints, tablas ni migraciones.

## 2. Clases y responsabilidades

- **`com.bcp.workshop.auth.LegacyTokenUtil`** — clase identificada por la evidencia del Issue. Según esa evidencia, `create` genera el token Base64 problemático. No se recibió su contenido; no se modificó.
- **Emisor JWT** — pendiente de implementación. Antes de definirlo se deben confirmar el contrato de configuración, la biblioteca disponible y la interfaz que actualmente consume `LegacyTokenUtil`.
- **Endpoint `POST /auth/login` y servicio de autenticación** — el contrato exige conservar `200` y los campos `token`, `expiresIn` y `user`, pero sus clases, DTO, validaciones y flujo actuales no fueron proporcionados.
- **Verificador de `api/`** — fuera del cambio de código de este Issue. No se proporcionó su implementación; su aceptación del nuevo formato no está confirmada.
- **Repository y modelo de datos** — no identificados con la información recibida. No se puede afirmar qué persistencia utiliza el login ni proponer acceso a datos sin inventar el esquema.

**Código Java completo:** no se entrega en esta iteración porque faltan las interfaces existentes y, principalmente, la coordinación obligatoria previa al cambio de formato. Generar una clase nueva o reemplazar `LegacyTokenUtil` en estas condiciones no permitiría asegurar compatibilidad con el proyecto ni con `api/`.

## 3. Recorrido de un caso válido y uno de error

### Caso válido — recorrido exigido, no verificado en el código

1. El cliente envía `POST /auth/login` usando la entrada que actualmente acepte el endpoint; el body y sus reglas no fueron proporcionados.
2. El flujo existente autentica al usuario; no se recibieron las clases que permiten describir ese recorrido con precisión.
3. Tras coordinar el contrato con `api/`, el emisor deberá producir un token firmado con una clave de configuración, con al menos `sub`, `iat` y `exp`.
4. El endpoint deberá responder `200` conservando `token`, `expiresIn` y `user`, con los tipos y la estructura actuales. No se pudieron verificar porque no se entregó el DTO o controller.

**No se afirma que este recorrido esté implementado o funcione actualmente.** No se identificó un paso de persistencia específico del emisor.

### Error representativo — token alterado o expirado

El criterio requiere que el verificador rechace un token alterado o expirado. La verificación corresponde a `api/`, que no se cambia en este Issue, y su código no fue proporcionado. Por ello no puedo describir una respuesta real, confirmar el estado HTTP ni afirmar que el rechazo ya ocurre. La respuesta y su formato deben acordarse con H-API-01 y seguir la convención existente de `api/`.

## 4. Trazabilidad: criterio de aceptación → código

| Criterio | Cobertura |
|---|---|
| El token no contiene el secreto, está firmado y la clave se lee de configuración. | **No cubierto.** `LegacyTokenUtil.create` está identificado como el origen del formato inseguro; no se modificó por el bloqueo de coordinación. |
| El token incluye expiración y claims explícitos (`sub`, `iat`, `exp` como mínimo). | **No cubierto.** Requiere acordar el significado de `sub` y la semántica temporal con `api/`. |
| Un token alterado o expirado es rechazado por la verificación. | **No verificable en este cambio.** El verificador de `api/` no fue proporcionado ni se modifica en este Issue. |
| `POST /auth/login` válido conserva `200` con `token`, `expiresIn` y `user`. | **No verificable.** Es el contrato que debe preservarse; faltan el endpoint y los DTO actuales para comprobarlo. |
| La coordinación con H-API-01 queda registrada antes de cambiar el formato. | **No cubierto.** No se recibió registro de coordinación o aprobación. El cambio permanece bloqueado. |
| `mvn test` pasa desde `auth/` con cobertura del código modificado de 85% o más. | **No cubierto.** No hubo cambios ni se proporcionaron pruebas o configuración de cobertura. |

## 5. Comandos de verificación

- `cd auth && mvn test` — **NO EJECUTADO**.
- Verificación de cobertura de al menos 85% — **NO EJECUTADA**; no se proporcionó la configuración de cobertura del proyecto.

No se afirma que compile, funcione o pase pruebas.

## 6. Supuestos y pendientes para otros roles

### Pendientes de Arquitectura y del equipo de `api/`

Registrar antes de modificar el emisor:

- Aceptación del formato JWT/JWS y del algoritmo HS256 por el verificador.
- Aprovisionamiento seguro y configuración compartida de la clave, sin valor fijo de respaldo.
- Significado y fuente de `sub`; confirmar si se requiere conservar un claim de rol.
- Duración del token y relación entre `exp` y `expiresIn`.
- Necesidad y valores de `iss`, `aud` y `client`.
- Comportamiento y formato de error del verificador ante firma alterada, expiración y claims inválidos.
- Plan de despliegue compatible entre emisor y verificador.

### Pendientes del equipo de Backend

- Proporcionar el código de `LegacyTokenUtil`, el endpoint y servicio de login, sus DTO y las pruebas actuales.
- Proporcionar `auth/pom.xml` y la configuración relevante para identificar las dependencias JWT y de configuración disponibles.
- Confirmar el flujo de autenticación y si existe persistencia asociada; no se recibió modelo de datos.
- Una vez resuelta la coordinación, implementar el cambio conservando las interfaces existentes y añadir pruebas de emisión y errores.
- Ejecutar las verificaciones solicitadas y reportar sus resultados reales.