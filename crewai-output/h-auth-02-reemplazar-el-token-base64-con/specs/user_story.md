# H-AUTH-02 — Reemplazar el token Base64 con secreto embebido por un token firmado

## 1) Solución propuesta

Reemplazar la emisión del token Base64 por un token firmado, sin cambiar el endpoint ni la forma establecida de la respuesta de login.

La propuesta es emitir un JWT firmado con HMAC-SHA-256 (HS256). La clave se obtiene de configuración —la documentación mencionada en el Issue señala `AUTH_TOKEN_SECRET`— y no se incluye en el token. No debe existir una clave fija de respaldo en el código; si la configuración es obligatoria y falta o es inválida, la aplicación debería fallar al iniciar, sujeto a confirmación del comportamiento de configuración existente.

El token debe incluir como mínimo:

- `sub`: sujeto del token. Debe acordarse si corresponde a un identificador estable de usuario o al nombre de usuario.
- `iat`: instante de emisión.
- `exp`: instante de expiración.

El Issue también identifica la ausencia de `iss`, `aud` y `client`, pero no especifica sus valores ni semántica. No deben añadirse valores inventados: deben acordarse con el equipo responsable del verificador en `api/` antes de cambiar el formato.

**Bloqueo de integración:** el Issue indica que el emisor debe coordinarse con el verificador de `api/`, que no se cambia en este Issue. Por tanto, no se puede desplegar el nuevo formato hasta registrar que el verificador existente acepta el algoritmo, la clave y los claims acordados. La información disponible no demuestra que dicho verificador ya admita JWT.

Los tokens firmados no son necesariamente cifrados: sus claims pueden ser legibles para quien los obtenga. La garantía propuesta es que el secreto no se incorpora al token y que las alteraciones se detectan mediante la firma.

## 2) Componentes y límites

La información recibida confirma el hallazgo en `auth/src/main/java/com/bcp/workshop/auth/LegacyTokenUtil.java` y la existencia del contrato `POST /auth/login`. No se proporcionaron los archivos fuente, los DTO, el `pom.xml` ni el código de `api/`; por ello, no se puede confirmar qué componentes existen además de lo descrito en el Issue.

Componentes propuestos, sujetos a contrastar con el código existente:

| Capa | Responsabilidad propuesta | Estado |
|---|---|---|
| `infrastructure/adapter/input/` | Mantener el controller REST actual de login y delegar en el caso de uso existente o propuesto. | No se proporcionó el controller; no se confirma su ruta interna ni estructura. |
| `domain/port/input/` | Definir el contrato de entrada del caso de uso de login. | Propuesta; no se confirma si ya existe. |
| `application/service/` | Orquestar la autenticación existente y solicitar la emisión del token. No debe conocer detalles de JWT ni leer directamente configuración de infraestructura. | Propuesta; debe adaptarse al servicio actual. |
| `domain/port/output/` | Definir el puerto de emisión de tokens usado por el servicio de aplicación. | Propuesta; no se confirma si ya existe un puerto equivalente. |
| `infrastructure/adapter/output/` | Implementar el puerto de emisión con la biblioteca JWT elegida y firmar los claims acordados. | Reemplaza o adapta `LegacyTokenUtil`; el uso exacto actual no se pudo inspeccionar. |
| `infrastructure/config/` | Cargar y validar la clave y el tiempo de expiración desde configuración. | `AUTH_TOKEN_SECRET` aparece en la documentación citada por el Issue; no se verificó la configuración efectiva. |
| `api/` | Verificar firma, expiración y claims según el contrato acordado. | Fuera del cambio de código de este Issue; la coordinación con H-API-01 es obligatoria. |

Las dependencias deben apuntar hacia adentro: infraestructura implementa los puertos del dominio; aplicación depende de los puertos, no de la biblioteca JWT; dominio no importa infraestructura.

## 3) Contrato de API (entradas, respuestas, errores)

### Endpoint de login

**Método y ruta:** `POST /auth/login`  
**Éxito exigido por el Issue:** `200 OK`, conservando `token`, `expiresIn` y `user`.

#### Entrada

El Issue no especifica el cuerpo de la petición, sus tipos, validaciones ni el formato de errores de login. Tampoco se proporcionó el controller o DTO existente. Por tanto, se debe conservar exactamente la entrada que acepte actualmente `/auth/login`; no se propone cambiar nombres de campos ni reglas de validación sin inspeccionar ese contrato.

| Elemento | Contrato verificable con la información disponible |
|---|---|
| Parámetros de ruta o query | No especificados por el Issue. |
| Body y `Content-Type` | No especificados. Deben obtenerse del controller/DTO existente. |
| Tipos y validaciones | No especificados. Se deben preservar los existentes. |

#### Respuesta de éxito

| Campo | Tipo/contrato |
|---|---|
| `token` | Cadena con el nuevo token firmado. |
| `expiresIn` | Debe conservar el tipo, la unidad y la semántica actuales; no constan en la información disponible. |
| `user` | Debe conservar la estructura actual; sus campos no constan en la información disponible. |

No se debe afirmar que `expiresIn` está expresado en segundos ni definir campos de `user` hasta verificar el contrato actual. Se recomienda que `exp` y `expiresIn` representen el mismo vencimiento, pero la unidad y el cálculo deben confirmarse contra la implementación existente.

#### Errores

El Issue no describe los errores actuales de login ni el esquema de respuesta de error. Para no romper clientes, el cambio de emisor no debería modificar esos errores. Sus estados, códigos, mensajes y payloads deben documentarse a partir del código existente antes de cerrar el contrato de login.

Para la verificación en `api/`, se propone el siguiente resultado funcional, sujeto a coordinación con H-API-01 y a las convenciones de errores existentes:

| Situación | Estado propuesto | Código/mensaje propuestos |
|---|---:|---|
| Firma alterada, firma inválida o token no aceptado | `401 Unauthorized` | `TOKEN_INVALID` — “Token inválido”. |
| Token vencido | `401 Unauthorized` | `TOKEN_EXPIRED` — “Token expirado”. |

Los códigos y mensajes anteriores son una **propuesta**, no un comportamiento confirmado del verificador ni un formato de respuesta existente. La estructura JSON del error también debe seguir la convención actual de `api/`; no se dispone de información para especificarla sin inventar un contrato.

### Contrato que debe acordarse con H-API-01

Antes de cambiar el formato, Auth y API deben registrar y acordar:

- Que el formato es JWT/JWS y el algoritmo es HS256.
- Cómo se provisiona la misma clave de forma segura en ambos componentes, sin incluirla en código, logs ni tokens.
- El significado y fuente de `sub`, y si el token debe conservar un claim de rol para compatibilidad.
- El tiempo de expiración y la relación entre `exp` y `expiresIn`.
- Si se requieren `iss`, `aud` y/o `client`, y sus valores y validaciones.
- La respuesta del verificador ante firma alterada, vencimiento, claims faltantes o clave incorrecta.
- El plan de despliegue. Si el verificador actual solo admite el formato anterior, el emisor no puede cambiarse de forma segura antes de actualizar o coordinar ese verificador.

## 4) Ejemplo de petición y respuesta

El body exacto de login no está disponible en el Issue ni en los archivos proporcionados. Para no inventarlo, el ejemplo siguiente representa la petición usando el body que ya acepte la implementación actual, aún pendiente de verificar.

### Recorrido válido

1. El cliente envía `POST /auth/login` con el body que admite actualmente el endpoint.
2. El adapter de entrada delega en el caso de uso de login.
3. La aplicación ejecuta la autenticación existente y solicita la emisión del token por un puerto de salida.
4. El adapter de emisión construye `sub`, `iat` y `exp` según las decisiones acordadas y firma el JWT con la clave de configuración.
5. El endpoint responde `200 OK` conservando los campos `token`, `expiresIn` y `user`.

Respuesta esquemática; la forma de `user`, el tipo/unidad de `expiresIn` y los valores son ilustrativos y deben conservar los existentes:

```json
{
  "token": "<JWT firmado; valor ilustrativo>",
  "expiresIn": "<valor y tipo actuales>",
  "user": "<objeto con la estructura actual>"
}
```

### Recorrido de error representativo: token alterado

1. Un cliente presenta un token alterado ante una operación protegida existente de `api/`. No se especifica aquí una ruta, porque el Issue no proporciona ninguna.
2. El verificador debe comprobar la firma antes de confiar en los claims y rechazar la petición si la firma no coincide.
3. El resultado funcional esperado es `401 Unauthorized`, con el error de token inválido definido por el contrato acordado con H-API-01.

Este recorrido describe el comportamiento requerido, **no un comportamiento actual confirmado**. No se proporcionó el verificador de `api/`, por lo que no se puede afirmar que hoy rechace tokens alterados o que use ese estado y mensaje. El mismo requisito de rechazo aplica a tokens vencidos, comparando `exp` con el tiempo actual.

## 5) Criterios de aceptación verificables

| Criterio del Issue | Verificación propuesta | Estado con la información disponible |
|---|---|---|
| El token no contiene el secreto, está firmado y la clave proviene de configuración. | Configurar una clave exclusiva de prueba; emitir el token; verificar su firma con esa clave y comprobar que el valor del secreto no aparece en el token ni en su payload. Revisar que no haya secreto fijo ni fallback en código. | Diseño propuesto; requiere inspeccionar y cambiar la implementación. |
| Incluye `sub`, `iat` y `exp` como mínimo. | Decodificar los claims del token emitido en una prueba y comprobar su presencia y valores coherentes con el usuario y el vencimiento acordados. | Diseño propuesto; semántica de `sub` pendiente. |
| Un token alterado o expirado es rechazado por la verificación. | Pruebas del verificador de `api/` —o una prueba de integración acordada— con firma alterada y token vencido. | No puede acreditarse modificando solo el emisor. Depende de H-API-01 o de confirmar que el verificador actual ya lo soporta. |
| Login válido conserva `200` y `token`, `expiresIn`, `user`. | Prueba del endpoint existente que compare estado, nombres de campos y estructura/tipos actuales antes y después del cambio. | Debe verificarse contra el controller y sus pruebas, no proporcionados. |
| La coordinación con H-API-01 queda registrada antes del cambio de formato. | Registrar en el Issue, PR o artefacto acordado la compatibilidad del verificador y las decisiones de formato, clave, claims y despliegue antes de cambiar el emisor. | No hay evidencia de esa coordinación en la información recibida; pendiente y bloqueante. |
| `mvn test` pasa desde `auth/` y la cobertura del código modificado es ≥85%. | Ejecutar `mvn test` desde `auth/` y comprobar la cobertura con el mecanismo ya configurado en el proyecto. Cubrir emisión válida, claims, firma inválida/alterada y vencimiento, según corresponda a los componentes existentes. | No verificable sin el proyecto, sus pruebas y configuración de cobertura. También falta confirmar cómo se mide el 85%. |

## 6) Supuestos y decisiones pendientes para otros roles

### Backend / Auth

- Inspeccionar `LegacyTokenUtil`, el controller de `/auth/login`, los DTO, el servicio de autenticación y las pruebas actuales para confirmar qué está construido y qué debe reemplazarse.
- Confirmar el body de login, sus validaciones y los errores actuales. La propuesta no cambia esos contratos.
- Confirmar el tipo y la unidad actuales de `expiresIn`, así como la estructura exacta de `user`.
- Confirmar si el claim de rol del token anterior se consume en `api/` y, de ser así, acordar cómo se representa en el nuevo token.
- Definir la duración del token y si la aplicación debe fallar al iniciar cuando falta `AUTH_TOKEN_SECRET`. Se recomienda no usar una clave codificada o de respaldo.
- Confirmar la biblioteca JWT, la validación de configuración y el mecanismo de pruebas de cobertura existente.

### Backend / API (H-API-01)

- Confirmar que el verificador aceptará el formato y algoritmo acordados y rechazará firma inválida y expiración.
- Acordar `sub`, `iat`, `exp` y la posible inclusión de `iss`, `aud`, `client` y roles.
- Acordar el estado, los códigos, los mensajes y el payload de error sin contradecir el contrato existente.
- Acordar la provisión y rotación de la clave, además del orden de despliegue. El cambio del emisor queda bloqueado si el verificador no acepta primero el nuevo formato.
- Registrar la coordinación antes del cambio, como exige el Issue. No se proporcionó evidencia de que ya se haya realizado.

### Datos

- Confirmar qué identificador de usuario es estable y adecuado para `sub`. No se conoce el modelo ni se presume que el nombre de usuario sea único o inmutable.
- Confirmar si existe una fuente autorizada para los roles y si se requieren restricciones de unicidad, cambios de rol o tratamiento de usuarios concurrentemente modificados. El Issue no especifica persistencia ni reglas de concurrencia; no se propone crear ni modificar tablas.
- Confirmar si los datos actuales disponibles al autenticar bastan para construir los claims requeridos, sin consultar ni duplicar información no necesaria.

### Frontend

- Confirmar que el cliente solo depende de `token`, `expiresIn` y `user`, y documentar el tipo y la unidad actuales de cada campo.
- Confirmar cómo presenta los errores de login existentes y cómo maneja un `401` de una operación protegida, manteniendo las convenciones actuales.
- No se propone cambiar el body de login ni añadir endpoints; ambos contratos deben verificarse en el producto antes de implementar.

**Información pendiente para cerrar el diseño:** el código existente y los contratos actuales no se proporcionaron, por lo que el body exacto de login, el esquema de errores, la estructura de `user`, la unidad de `expiresIn`, la configuración de cobertura y la compatibilidad actual del verificador no se pueden afirmar. Esos puntos requieren inspección y confirmación; en particular, la coordinación con H-API-01 es una condición previa al cambio de formato.