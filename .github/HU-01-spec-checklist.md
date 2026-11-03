# HU-01 — Feature Intake Spec Checklist

## Summary
- Definir y verificar un token firmado para `POST /auth/login` con los claims `sub`, `client`, `iat` y `exp`, y con un `expiresIn` coherente con su expiración.
- La HU también requiere evitar la exposición de datos sensibles en logs y documentar la configuración del secreto.

## Scope (in/out)
- **In scope**
  - Obtener y validar `client` desde la solicitud e incluirlo en el token.
  - Incluir los cuatro claims requeridos y comprobar la coherencia de `expiresIn`.
  - Cubrir login válido, credenciales inválidas y token expirado con pruebas.
  - Evitar registrar tokens, secretos o valores sensibles.
  - Documentar la decisión de firma y el tratamiento de `AUTH_TOKEN_SECRET`.
- **Out of scope**
  - No se especifican cambios adicionales a endpoints, contratos de respuesta o funcionalidades.
  - No se especifica ningún cambio de interfaz.

## Assumptions
- El servicio existente expone `POST /auth/login`, devuelve `token`, `expiresIn` y `user`, usa firma HMAC y lee `AUTH_TOKEN_SECRET`.
- No se asume un formato o conjunto de valores aceptados para `client`, una duración de token ni una tolerancia temporal concreta.

## Technical decisions to make
- Decidir entre conservar HMAC o adoptar una librería JWT; documentar la decisión.
- Definir y documentar la tolerancia usada para comprobar que `expiresIn` coincide con `exp - now`.
- Definir las reglas de validación de `client`.
- Definir si se elimina el secreto por defecto fuera del laboratorio o se documenta como exclusivo del laboratorio.

## Risks and mitigations
- **Exposición de credenciales o tokens en logs:** evitar registrar tokens, secretos y valores sensibles; comprobar la redacción mediante evidencia de logs.
- **Uso del secreto por defecto fuera del laboratorio:** eliminarlo fuera del laboratorio o documentar explícitamente que es exclusivo del laboratorio.
- **Desajuste entre expiración declarada y claim `exp`:** definir y documentar una tolerancia, y probar la coherencia de `expiresIn` frente a `exp - now`.
- **`client` ausente o inválido:** establecer las reglas de validación pendientes y probar la solicitud según esas reglas.

## Acceptance criteria
- Un token válido contiene los claims `sub`, `client`, `iat` y `exp`.
- `client` se obtiene de la solicitud, se valida según reglas documentadas y se refleja en el token.
- `expiresIn` coincide con `exp - now` dentro de la tolerancia documentada.
- Existen pruebas para login válido, credenciales inválidas y token expirado.
- No se registran tokens, secretos ni valores sensibles.
- La decisión entre HMAC y una librería JWT queda documentada.
- La configuración de `AUTH_TOKEN_SECRET` queda documentada, incluyendo su tratamiento fuera del laboratorio.

## Validation plan
- **Unit tests:** verificar presencia de los cuatro claims, inclusión de `client`, cálculo/coherencia de expiración y tratamiento de tokens expirados.
- **Functional tests:** verificar login válido y credenciales inválidas en `POST /auth/login`, preservando la respuesta descrita en la HU.
- **Security checks:** revisar que logs no expongan tokens, secretos ni valores sensibles; revisar la documentación sobre el secreto por defecto.
- **Evidence required:** documento de decisión y configuración; resultados de pruebas de claims, expiración y errores de autenticación; evidencia de logs redactados.

## Suggested tasks by role
- **Chapter/PO**
  - Confirmar los criterios de aceptación y el alcance de HU-01.
  - Resolver la política esperada para `client` junto con las partes responsables.
  - Confirmar la decisión sobre el tratamiento del secreto por defecto.
- **Tech Lead**
  - Resolver y documentar HMAC frente a una librería JWT.
  - Definir y documentar la tolerancia para la comparación de expiración.
  - Revisar que el contrato de `POST /auth/login` y los criterios sean consistentes.
- **Backend**
  - Incorporar y validar `client` desde la solicitud y emitir los claims requeridos.
  - Implementar la comprobación de expiración y coherencia de `expiresIn` conforme a las decisiones documentadas.
  - Evitar el registro de datos sensibles y documentar la configuración del secreto.
- **Frontend**
  - No se identifica trabajo de interfaz confirmado por la HU; confirmar si el cliente debe enviar `client` y si se requieren cambios en la interfaz.
- **QA**
  - Preparar pruebas para login válido, credenciales inválidas y token expirado.
  - Verificar claims requeridos y coherencia de `expiresIn` con la tolerancia acordada.
  - Adjuntar resultados de pruebas y evidencia de revisión de logs redactados.
- **Cyber**
  - Revisar que tokens, secretos y valores sensibles no aparezcan en logs.
  - Revisar la documentación y el tratamiento del secreto por defecto fuera del laboratorio.
  - Revisar la validación de `client` y el comportamiento de expiración frente a las decisiones documentadas.

## Open questions
- ¿Se conservará HMAC o se adoptará una librería JWT?
- ¿Cuál será la tolerancia documentada para comparar `expiresIn` con `exp - now`?
- ¿Qué valores y formato de `client` se aceptarán y cómo se validarán?
- ¿Se eliminará el secreto por defecto fuera del laboratorio o se documentará como exclusivo del laboratorio?
- ¿Qué parte del flujo obtiene `client` de la solicitud y qué comportamiento se espera si falta o no es válido?
- ¿Se requieren cambios en el frontend para enviar `client`?
