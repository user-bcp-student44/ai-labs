# Revisión final — H-AUTH-02

## Resumen

La entrega **no implementa** el reemplazo del token Base64. Backend declara que mantiene el cambio bloqueado porque no se ha registrado la coordinación requerida con H-API-01; tampoco hay evidencia de un emisor JWT, de un verificador compatible ni de pruebas ejecutadas. El frontend aporta una propuesta, no una integración verificable.

No es posible confirmar la coherencia efectiva entre backend, frontend y verificador: faltan el código fuente, los DTO actuales, el contrato de errores y la implementación de `api/`. El hallazgo de seguridad de severidad alta permanece abierto. Hay criterios sin cubrir, pruebas pendientes y riesgo de incompatibilidad en despliegue.

## Matriz de criterios

| Criterio | Estado | Evidencia |
|---|---|---|
| El token no contiene el secreto, está firmado y la clave se lee de configuración, no del código. | **Sin cubrir** | `backend_spec.md` declara que no hubo implementación y que `LegacyTokenUtil` no se modificó. El informe de seguridad identifica el secreto fijo en `LegacyTokenUtil.java:8, 13-14`. |
| El token incluye expiración y claims explícitos (`sub`, `iat`, `exp` como mínimo). | **Sin cubrir** | `backend_spec.md` indica que no se emitió un nuevo token. La propuesta de Arquitectura señala que el significado de `sub` y la semántica temporal deben acordarse. |
| Un token alterado o expirado es rechazado por la verificación. | **Sin cubrir** | `backend_spec.md` y `testing_report.md` indican que el verificador de `api/` no fue proporcionado y no se probó. No hay evidencia de rechazo efectivo. |
| `POST /auth/login` válido conserva 200 con `token`, `expiresIn` y `user`. | **Parcial** | `frontend_spec.md` usa la ruta `/auth/login` y esos nombres de campos en una propuesta de modelos; sin embargo, sus tipos son `unknown` y el frontend no está integrado. Backend indica que no pudo verificar el controller, el DTO ni la respuesta real. |
| La coordinación con H-API-01 queda registrada antes de cambiar el formato. | **Sin cubrir** | `backend_spec.md` dice que la coordinación sigue pendiente. `testing_report.md` no recibió evidencia del acuerdo. |
| `mvn test` pasa desde `auth/` con cobertura del código modificado de 85% o más. | **Sin cubrir** | `backend_spec.md` indica que `cd auth && mvn test` **no se ejecutó**. No hay salida real ni reporte de cobertura; tampoco se proporciona un comando concreto de cobertura configurado para el proyecto. |

## Hallazgos

### H-AUTH-02-F01 — Token falsificable y secreto expuesto

- **Severidad:** Alta — abierto.
- **Ubicación:** `auth/src/main/java/com/bcp/workshop/auth/LegacyTokenUtil.java:8, 13-14`, según el hallazgo de origen y el informe de Seguridad.
- **Evidencia:** El token descrito es Base64 e incluye el secreto fijo. La codificación no acredita integridad ni evita que el contenido se decodifique. Backend confirma que el código no se modificó.
- **Corrección concreta:** Tras registrar el acuerdo con H-API-01, reemplazar el formato por el token firmado acordado; cargar la clave desde configuración segura, sin valor fijo de respaldo; emitir los claims acordados, como mínimo `sub`, `iat` y `exp`. Probar la firma, el rechazo de alteraciones y expiración, y que la clave no aparece en el token ni en el código.

### H-AUTH-02-F02 — Contrato de emisor y verificador sin coordinar

- **Severidad:** Media — pendiente.
- **Ubicación:** Integración Auth–`api/` (H-API-01); la evidencia recibida no identifica los archivos del verificador.
- **Evidencia:** Backend informa que la coordinación no se registró. No se conoce la compatibilidad del verificador con JWT/HS256, la clave ni los claims.
- **Corrección concreta:** Registrar el acuerdo antes de cambiar el emisor: formato y algoritmo, aprovisionamiento de clave, semántica de `sub`, duración y relación entre `exp` y `expiresIn`, claims adicionales si aplican, respuestas ante tokens inválidos y plan de despliegue. Validar después la integración con el verificador real.

### H-AUTH-02-F03 — Contrato de login y errores no verificable entre capas

- **Severidad:** Media — pendiente.
- **Ubicación:** `POST /auth/login`; modelos propuestos en `frontend_spec.md`; controller y DTO backend no proporcionados.
- **Evidencia:** El frontend conserva los nombres `token`, `expiresIn` y `user`, pero tipa los dos últimos como `unknown`. Backend no pudo comprobar el estado 200, los tipos ni la estructura actuales. El mapeo de errores del frontend se presenta como fallback genérico, no como contrato confirmado.
- **Corrección concreta:** Entregar y verificar el DTO, los tipos y la estructura actuales de la respuesta exitosa; confirmar la configuración de ruta/base URL y los errores reales. Integrar el frontend contra ese contrato sin alterar la respuesta existente.

### Calidad de código, pruebas y mantenibilidad

- **Revisión de código y arquitectura hexagonal:** No es posible evaluar separación de responsabilidades, validaciones, manejo de errores, duplicación ni prácticas de Quarkus porque no se entregó código backend modificado. La arquitectura presenta una propuesta hexagonal, no una implementación comprobable.
- **Frontend:** `frontend_spec.md` es una propuesta no integrada. El uso de `unknown` deja pendiente la tipificación efectiva de la respuesta, y la ruta relativa presupone un enrutamiento del mismo origen que no está confirmado. No se puede emitir una evaluación del código Angular completo a partir de este artefacto.
- **Datos:** No se entregó modelo ni cambio de persistencia asociado a la emisión del token; no hay evidencia de migraciones necesarias.
- **Pruebas:** `testing_report.md` propone casos para emisión, claims, clave, alteración, expiración y login, pero no aporta ejecuciones reales. `cd auth && mvn test` consta como **NO EJECUTADO**; la cobertura de 85% tampoco está demostrada. Los comandos frontend propuestos (`ng test --watch=false` y `ng build`) también están sin ejecutar.
- **Operación y despliegue:** Sin coordinación y verificación del contrato compartido, desplegar solo el nuevo emisor puede dejarlo incompatible con el verificador. No se ha acreditado la configuración efectiva, validación de clave ausente o inválida, ni el procedimiento de despliegue.

## Pendientes antes de integrar

1. **Arquitectura y responsables de Auth/API:** registrar y aprobar la coordinación H-API-01, incluyendo algoritmo, clave, claims, expiración, errores y plan de despliegue.
2. **Backend:** implementar el emisor conforme al contrato aprobado; preservar el comportamiento y DTO actuales de `/auth/login`; adjuntar el código y la configuración relevantes.
3. **Backend y equipo de API:** demostrar con pruebas de integración que el verificador rechaza tokens alterados y expirados y acepta los emitidos con la configuración acordada.
4. **QA:** ejecutar `cd auth && mvn test` y adjuntar la salida real. Adjuntar también el reporte que demuestre cobertura de al menos 85% del código modificado; definir el comando de cobertura concreto según la configuración del proyecto.
5. **Frontend:** integrar la propuesta con los tipos reales de la respuesta y la configuración efectiva del API; ejecutar las pruebas y compilación correspondientes si forma parte de la entrega.
6. **Seguridad:** verificar que el secreto fijo fue eliminado, que no hay clave de respaldo en código y que la nueva clave y el token no se exponen en logs o respuestas indebidas.

VEREDICTO: RECHAZADO