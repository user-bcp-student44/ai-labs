# Informe de seguridad — H-AUTH-02

## Resumen

**Estado: riesgo alto no corregido.** La información de la feature indica que `LegacyTokenUtil.create` emite un token Base64 con el secreto fijo `WORKSHOP_SECRET_2026` y que la API acepta ese formato. Un token Base64 no proporciona integridad: quien lo decodifique puede obtener el secreto y fabricar tokens con otro usuario, rol o expiración.

El trabajo de Backend declara que el cambio **no se implementó** porque falta registrar la coordinación obligatoria con H-API-01. No hay evidencia de código actualizado, verificador compatible ni pruebas ejecutadas. Por tanto, el hallazgo de origen sigue pendiente.

No se proporcionaron el código fuente completo, el `pom.xml`, el verificador de `api/`, ni los DTO y pruebas de login. Los comandos de comprobación que siguen son propuestas; **no fueron ejecutados**.

## Activos, datos y puntos de entrada

- **Activos y datos sensibles:** token de autenticación; secreto embebido; identidad del usuario; rol y expiración incluidos en el token. También deben protegerse la futura clave de firma y los datos de usuario devueltos en el login.
- **Puntos de entrada y componentes conocidos:**
  - `POST /auth/login`, que devuelve `token`, `expiresIn` y `user`.
  - Emisor descrito en `auth/src/main/java/com/bcp/workshop/auth/LegacyTokenUtil.java`.
  - Verificador de `api/`, cuya implementación y endpoints protegidos no se proporcionaron.
  - Configuración futura de la clave, cuyo mecanismo efectivo no se pudo comprobar.
- **Formularios, almacenamiento, persistencia e integraciones externas:** no hay información suficiente para evaluarlos. El entregable frontend propone tratar el token como opaco y no persistirlo, pero no se aportó una integración ejecutable que permita verificarlo.

## Hallazgos

| ID | Severidad | Descripción y ubicación | Impacto | Corrección concreta y verificación |
|---|---|---|---|---|
| **H-AUTH-02-F01** | **Alta** | **Token falsificable y secreto expuesto.** Según la evidencia del issue, `LegacyTokenUtil.create` genera `Base64(username\|role\|expiry\|SECRET)` con `SECRET = "WORKSHOP_SECRET_2026"` (`LegacyTokenUtil.java:8, 13-14`). Base64 solo codifica; no firma ni protege el contenido. La feature también indica que la API acepta este formato. | Un atacante que obtenga un token puede decodificarlo y conocer el secreto, y fabricar tokens con otro usuario, rol o vencimiento. Esto afecta autenticación y control de acceso. | Sustituir el formato por el esquema firmado acordado con `api/`, leer la clave de configuración segura y no mantener un valor fijo de respaldo. Emitir al menos `sub`, `iat` y `exp`; fijar y validar el algoritmo permitido en el verificador. Probar que la firma verifica con la clave configurada, falla con otra clave, que alterar el token provoca rechazo y que un token expirado se rechaza. Tras el cambio, comprobar que el literal ya no está en el código, por ejemplo con `grep -R "WORKSHOP_SECRET_2026" auth/src`. |
| **H-AUTH-02-F02** | **Media** | **Coordinación emisor-verificador pendiente.** El criterio exige registrar la coordinación con H-API-01 antes de cambiar el formato. Backend informa que sigue pendiente y no se aportó evidencia del acuerdo ni del verificador. | Un cambio sin contrato y despliegue coordinados puede hacer que emisor y verificador discrepen sobre formato, algoritmo, clave o claims. La evidencia disponible no permite afirmar que ya se produzca ese fallo. | Mantener bloqueado el cambio de formato hasta registrar el acuerdo y plan de despliegue. Documentar algoritmo, aprovisionamiento de clave, semántica de claims y comportamiento ante tokens inválidos. Verificar el acuerdo mediante pruebas de integración entre el emisor y el verificador reales antes de habilitar el nuevo formato. |
| **H-AUTH-02-F03** | **Media** | **Criterios de seguridad criptográfica y claims incompletos.** Los criterios requieren un token “firmado” y una clave de configuración, pero no especifican longitud/entropía mínima, validación de configuración ausente o inválida, rotación, ni una lista permitida de algoritmos en el verificador. El issue original menciona la ausencia de `iss`, `aud` y `client`, pero sus valores y semántica no están definidos. | La implementación podría satisfacer formalmente los criterios usando parámetros débiles o aceptar un contrato de claims que no represente las expectativas del verificador. No hay evidencia de que esto ya ocurra; es una brecha en los requisitos verificables. | Antes de implementar, acordar con `api/` el algoritmo y la política de clave, el comportamiento si falta la configuración y si se requieren `iss`, `aud` o `client`. No inventar esos valores: documentarlos y validarlos en ambos lados. Añadir pruebas que comprueben configuración inválida/ausente, algoritmo no permitido y claims requeridos según el contrato acordado. |

### Evaluación OWASP y áreas sin evidencia

- **Control de acceso y autenticación:** riesgo confirmado por el token falsificable descrito en F01. No se proporcionó el código de autorización de `api/`, por lo que no se evaluaron reglas adicionales de roles.
- **Sesiones y tokens:** el formato actual no proporciona integridad; el rechazo de tokens alterados o expirados no está demostrado en el verificador.
- **Fallos criptográficos y exposición de datos:** el secreto fijo se incorpora al contenido codificado. Un JWT firmado no cifra sus claims; no deben incluirse secretos ni datos sensibles innecesarios.
- **Inyección (SQL, comandos) y validación de entradas:** no se proporcionó código de login o acceso a datos que permita identificar o descartar vulnerabilidades en esas áreas. No hay evidencia para reportar una inyección.
- **XSS:** no se aportó una implementación frontend verificable. El entregable frontend declara que no usa `innerHTML`, pero es una propuesta y no se pudo comprobar en código integrado.
- **Secretos y configuración:** el secreto fijo está documentado en F01. El uso, calidad, almacenamiento y rotación de una futura clave de configuración no se pudieron verificar.
- **Logs y respuestas:** no se proporcionaron logs ni código suficiente para determinar si se exponen tokens, claves o credenciales.
- **Dependencias vulnerables:** no se recibió `auth/pom.xml` ni un árbol de dependencias; no es posible evaluar versiones o vulnerabilidades conocidas.
- **Otros riesgos de entrada, como SSRF:** no hay información de integraciones o entradas pertinentes para evaluarlos.

## Criterios de aceptación y brechas

| Criterio | Estado según la evidencia recibida | Observación de seguridad |
|---|---|---|
| Token firmado, sin secreto en el token y clave desde configuración | **No cubierto** | Backend indica que no se implementó el cambio. |
| `sub`, `iat` y `exp` explícitos | **No cubierto** | No hay emisor actualizado ni semántica acordada para `sub` y expiración. |
| Rechazo de token alterado o expirado | **No verificable** | El verificador de `api/` no se proporcionó ni se modificó en este issue. |
| `POST /auth/login` conserva 200 con `token`, `expiresIn` y `user` | **No verificable** | Faltan controller, DTO y pruebas actuales. Deben conservarse también los tipos y estructura existentes, que no constan aquí. |
| Coordinación con H-API-01 antes del cambio | **Pendiente** | Backend indica expresamente que no se ha registrado. |
| `mvn test` pasa y cobertura del código modificado ≥85% | **No ejecutado** | No hubo cambios ni se proporcionaron pruebas o configuración de cobertura. |

Conviene complementar los criterios con una política verificable para la clave y el algoritmo, y acordar con `api/` qué claims adicionales —si alguno— deben exigirse. La falta de `iss`, `aud` y `client` está señalada en el issue, pero no se deben asignar valores ni imponer semánticas sin ese acuerdo.

## Recomendaciones

1. **No desplegar un emisor con formato nuevo** hasta registrar el acuerdo de H-AUTH-02 con H-API-01 y probar la compatibilidad con el verificador real.
2. Eliminar el formato Base64 y el secreto embebido; usar una firma y una clave configurada conforme a una política documentada. No registrar la clave ni el token en logs.
3. Definir los claims y su semántica con el equipo de `api/`. Mantener los claims legibles libres de información sensible; la firma no cifra el token.
4. Añadir pruebas de emisión y verificación: clave correcta e incorrecta, token alterado, expiración, claims obligatorios y contrato de respuesta de login.
5. Revisar el almacenamiento y rotación de la clave, la configuración de inicio y las dependencias cuando estén disponibles `pom.xml` y la configuración efectiva.
6. Ejecutar pruebas de cobertura sobre el código modificado e informar el resultado real, sin considerar el criterio satisfecho hasta obtener evidencia.

## Checklist de verificación

- [ ] Acuerdo con H-API-01 registrado antes de cambiar el formato.
- [ ] La clave no está en el código ni dentro del token; su configuración y política están documentadas.
- [ ] El verificador permite solo el algoritmo acordado y valida firma y claims requeridos.
- [ ] Pruebas demuestran que un token alterado, expirado o firmado con otra clave se rechaza.
- [ ] Se comprueba que el token incluye `sub`, `iat` y `exp` según la semántica acordada.
- [ ] `POST /auth/login` conserva el contrato existente de `200`, `token`, `expiresIn` y `user`.
- [ ] Se confirma que logs y respuestas no revelan claves, credenciales ni tokens.
- [ ] Se revisan dependencias con el `pom.xml` disponible.
- [ ] Se ejecuta `cd auth && mvn test` y se obtiene evidencia de cobertura ≥85% para el código modificado.
- [ ] **Estado actual:** las verificaciones anteriores no están demostradas; Backend reporta que no implementó el cambio y que la coordinación sigue pendiente.