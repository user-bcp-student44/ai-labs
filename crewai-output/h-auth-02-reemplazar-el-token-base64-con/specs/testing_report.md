# testing_report.md

# H-AUTH-02 — Informe de pruebas

## 1. Resumen del Issue

El Issue requiere sustituir el token Base64 con secreto embebido por un token firmado, configurando la clave fuera del código e incluyendo, como mínimo, `sub`, `iat` y `exp`. También exige rechazar tokens alterados o vencidos, preservar la respuesta exitosa de `POST /auth/login`, registrar la coordinación con H-API-01 antes de cambiar el formato y alcanzar al menos 85% de cobertura del código modificado.

### Contraste con los artefactos recibidos

- El Issue identifica `LegacyTokenUtil.create` como generador del formato inseguro. No se recibió su archivo fuente, por lo que su comportamiento no se pudo inspeccionar directamente.
- El entregable de Backend declara que la implementación **no se realizó** y que está bloqueada a la espera de la coordinación con `api/`.
- No se recibió evidencia de que esa coordinación haya sido registrada. El entregable de Backend informa que sigue pendiente.
- No se recibieron el código del endpoint, sus DTO, `auth/pom.xml`, las pruebas existentes ni el código del verificador en `api/`.
- El entregable de Frontend describe una propuesta, no una pantalla o integración verificable; no permite confirmar el contrato real de entrada de login.
- No se identificaron esquema, restricciones ni operaciones de persistencia relacionados con la emisión del token.

Por tanto, el comportamiento heredado se conoce únicamente por la descripción del Issue; **no se pudo verificar en código**. Las pruebas de este informe son propuestas de validación. No hay resultados de ejecución disponibles.

## 2. Matriz de trazabilidad

| Criterio de aceptación | Caso(s) | Tipo | Resultado esperado observable | Estado |
|---|---|---|---|---|
| El token no contiene el secreto, está firmado y la clave se lee de configuración, no del código. | TA-01, TA-02, TA-03 | Positivo, negativo, integración | El token emitido tiene una firma válida con la clave configurada; el secreto no aparece en el token. Cambiar la clave configurada cambia qué clave verifica el token. | **NO EJECUTADO** — implementación y configuración no disponibles. |
| El token incluye expiración y claims explícitos (`sub`, `iat`, `exp` como mínimo). | TA-02, TA-06 | Positivo, borde | El token emitido contiene esos claims con valores coherentes con el contrato acordado y el tiempo de expiración. | **NO EJECUTADO** — falta implementación y definición de algunos valores/semánticas. |
| Un token alterado o expirado es rechazado por la verificación. | TA-04, TA-05, TA-08 | Negativo, borde, integración | El verificador rechaza ambos tokens. El estado HTTP y el formato de error deben ser los ya acordados para `api/`; no constan en los artefactos recibidos. | **NO EJECUTADO** — verificador y contrato de error no disponibles. |
| `POST /auth/login` válido conserva 200 con `token`, `expiresIn` y `user`. | TA-07 | Positivo, integración | Respuesta `200` que conserva esos tres campos y sus tipos/estructura actuales. | **NO EJECUTADO** — controller, DTO y fixture de login no disponibles. |
| La coordinación con H-API-01 queda registrada antes de cambiar el formato. | TA-09 | Integración / control de cambio | Existe evidencia aprobada y fechada del acuerdo antes del cambio del emisor. | **PENDIENTE** según los entregables suministrados; no se aportó evidencia. |
| `mvn test` pasa desde `auth/` con cobertura del código modificado de 85% o más. | TA-10 | Suite / cobertura | La suite termina correctamente y un reporte del mecanismo de cobertura del proyecto muestra al menos 85% para el código modificado. | **NO EJECUTADO** — no hay salida, fuente modificada ni configuración de cobertura disponible. |

## 3. Casos de prueba propuestos

Los datos concretos de credenciales, claims particulares, endpoints protegidos, tipos de respuesta y errores no se inventan aquí: deben extraerse del código y del contrato aprobado antes de ejecutar los casos.

### TA-01 — Emisión firmada y ausencia del secreto en el token

- **Tipo:** Positivo.
- **Precondiciones:** Emisor implementado; clave de prueba configurada según la política aprobada; acceso al servicio de emisión o a un login válido; formato y algoritmo acordados con `api/`.
- **Pasos:**
  1. Emitir un token usando el flujo válido existente.
  2. Comprobar que el token cumple el formato acordado.
  3. Verificar su firma con la clave de prueba configurada.
  4. Inspeccionar el contenido decodificable y buscar el valor literal de la clave.
- **Datos de prueba:** Usuario válido del fixture existente y clave exclusivamente de prueba. No imprimir ni registrar el valor de la clave o el token.
- **Resultado esperado observable:** La firma verifica con la clave configurada y el valor literal del secreto no aparece en el token.
- **Nota:** Un JWT firmado no implica que sus claims estén cifrados. No se debe esperar que el contenido sea ilegible.
- **Estado:** **NO EJECUTADO**.

### TA-02 — Claims obligatorios y expiración

- **Tipo:** Positivo.
- **Precondiciones:** Emisor disponible y semántica aprobada para `sub`, `iat`, `exp`, duración y tolerancia de reloj.
- **Pasos:**
  1. Emitir un token para el usuario válido del fixture.
  2. Decodificar sus claims sin exponer el token en logs.
  3. Comprobar la presencia y el tipo de `sub`, `iat` y `exp`.
  4. Comparar `iat` y `exp` con la duración y tolerancia definidas en el contrato aprobado.
- **Datos de prueba:** Usuario válido del fixture y reloj controlable, si el proyecto dispone de esa capacidad.
- **Resultado esperado observable:** Los tres claims están presentes y satisfacen la semántica temporal acordada.
- **Pendiente:** No se conoce si `sub` identifica al usuario mediante ID estable o nombre; tampoco consta la duración ni la unidad de `expiresIn`.
- **Estado:** **NO EJECUTADO**.

### TA-03 — La clave procede de configuración

- **Tipo:** Positivo / integración.
- **Precondiciones:** Configuración efectiva del emisor identificada; uso de una clave de prueba y de la interfaz de verificación aprobada.
- **Pasos:**
  1. Iniciar el emisor con una clave de prueba A.
  2. Emitir un token y verificarlo con A.
  3. Cambiar a una clave de prueba B en la configuración, sin cambiar el código.
  4. Emitir otro token y comprobar que la verificación usa B; comprobar también que el token anterior no se acepta con B, si así lo define el contrato de verificación.
- **Datos de prueba:** Claves A y B exclusivamente de prueba; no registrar sus valores.
- **Resultado esperado observable:** La clave efectiva proviene de configuración y no de un valor fijo de respaldo en el código.
- **Estado:** **NO EJECUTADO** — no se recibió configuración ni implementación.

### TA-04 — Rechazo de token alterado

- **Tipo:** Negativo.
- **Precondiciones:** Verificador de `api/` disponible, token válido emitido y contrato de error acordado.
- **Pasos:**
  1. Obtener un token válido.
  2. Alterar una parte del token de manera que la firma ya no corresponda al contenido.
  3. Enviar el token al punto de verificación protegido aprobado.
  4. Observar respuesta y efecto funcional, sin asumir un estado o payload de error no documentado.
- **Datos de prueba:** Token válido de TA-01 y una copia alterada; no utilizar tokens reales.
- **Resultado esperado observable:** El verificador rechaza el token. El estado y cuerpo deben coincidir con el contrato aprobado de `api/`.
- **Estado:** **NO EJECUTADO** — el verificador, la ruta protegida y el contrato de error no se proporcionaron.

### TA-05 — Rechazo de token expirado

- **Tipo:** Negativo.
- **Precondiciones:** Verificador disponible y método aprobado para obtener un token expirado, por ejemplo reloj controlable o generación en entorno de prueba.
- **Pasos:**
  1. Obtener un token cuya expiración ya haya ocurrido según el reloj del verificador.
  2. Enviarlo al punto de verificación protegido aprobado.
  3. Observar si se rechaza conforme al contrato existente.
- **Datos de prueba:** Token expirado de prueba. No se fija una duración, tolerancia ni código de error que no consten en el contrato.
- **Resultado esperado observable:** El verificador rechaza el token expirado.
- **Estado:** **NO EJECUTADO** — mecanismo temporal y contrato de error pendientes.

### TA-06 — Borde de expiración

- **Tipo:** Borde.
- **Precondiciones:** Regla acordada para el instante exacto de vencimiento, tolerancia de reloj y reloj controlable.
- **Pasos:**
  1. Probar verificación antes del vencimiento.
  2. Probar en el instante límite definido por el contrato.
  3. Probar después del vencimiento.
- **Datos de prueba:** Token de prueba y reloj fijado en los tres instantes acordados.
- **Resultado esperado observable:** Cada resultado coincide con la regla documentada de expiración y tolerancia.
- **Estado:** **NO EJECUTADO** — la regla de borde y las herramientas disponibles no se proporcionaron.

### TA-07 — Compatibilidad de `POST /auth/login`

- **Tipo:** Positivo / integración.
- **Precondiciones:** Body, `Content-Type`, credenciales de prueba y tipos actuales de la respuesta identificados en el controller/DTO existente.
- **Pasos:**
  1. Enviar un login válido a `POST /auth/login` con el body definido por la implementación actual.
  2. Comprobar el status HTTP.
  3. Comprobar la presencia y estructura/tipos actuales de `token`, `expiresIn` y `user`.
  4. Verificar que la emisión nueva no cambia el contrato de respuesta.
- **Datos de prueba:** Fixture de autenticación válido aprobado por el proyecto. El body no se especifica aquí porque no se recibió el DTO.
- **Resultado esperado observable:** `200` y los tres campos conservados con su forma y semántica actuales.
- **Estado:** **NO EJECUTADO** — falta el controller, el DTO y un fixture válido.

### TA-08 — Integración emisor–verificador

- **Tipo:** Integración.
- **Precondiciones:** Coordinación registrada; emisor y verificador disponibles con algoritmo, clave, claims y política temporal comunes.
- **Pasos:**
  1. Obtener un token del endpoint de login.
  2. Presentarlo a un recurso protegido existente en `api/`.
  3. Comprobar que un token válido es aceptado.
  4. Repetir con tokens alterado y expirado.
- **Datos de prueba:** Login válido y tokens de prueba controlados.
- **Resultado esperado observable:** Aceptación del token válido y rechazo de los casos negativos conforme al contrato acordado.
- **Estado:** **NO EJECUTADO / BLOQUEADO** — no se recibieron el verificador, la ruta protegida ni el registro de coordinación.

### TA-09 — Evidencia de coordinación previa

- **Tipo:** Integración / control de cambio.
- **Precondiciones:** Acceso al registro acordado de coordinación entre Auth y el equipo responsable de H-API-01.
- **Pasos:**
  1. Localizar la aprobación o registro verificable.
  2. Confirmar que identifica el formato y algoritmo, aprovisionamiento de clave, significado de claims, expiración, errores y plan de despliegue acordados.
  3. Comparar su fecha con la del cambio que reemplaza el formato del emisor.
- **Datos de prueba:** Registro aprobado y referencia al cambio de emisor.
- **Resultado esperado observable:** La aprobación precede al cambio y cubre los acuerdos necesarios para compatibilidad.
- **Estado:** **PENDIENTE** — el entregable de Backend indica que no se recibió esa coordinación.

### TA-10 — Suite y cobertura

- **Tipo:** Suite de regresión / cobertura.
- **Precondiciones:** Código modificado, pruebas del proyecto y configuración de cobertura disponibles.
- **Pasos:**
  1. Ejecutar `mvn test` desde `auth/`.
  2. Ejecutar el mecanismo de cobertura ya configurado en el proyecto.
  3. Revisar el reporte correspondiente al código modificado.
- **Datos de prueba:** Suite del proyecto y datos de prueba aislados definidos por esta.
- **Resultado esperado observable:** Suite sin fallos y cobertura del código modificado igual o superior a 85%.
- **Estado:** **NO EJECUTADO** — no se recibió código modificado, configuración de cobertura ni salida de comandos.

## 4. Cobertura por tipo

- **Positivas:** TA-01, TA-02, TA-03 y TA-07.
- **Negativas:** TA-04 y TA-05.
- **Borde:** TA-06. La conducta exacta en el instante de vencimiento depende de una regla que debe acordarse.
- **Integración:** TA-03, TA-07, TA-08 y TA-09.
- **Persistencia:** No se propone una prueba de persistencia para la emisión en sí: los artefactos recibidos no identifican una escritura de datos asociada a la creación del token. No se puede concluir que el flujo completo de login carezca de persistencia, ya que no se recibió su implementación. Si la autenticación consulta o modifica datos, se necesitan el modelo, repositorios y restricciones actuales para diseñar pruebas sin inventar el contrato.

## 5. Revisión de contratos

### API

| Aspecto | Contrato disponible | Verificación necesaria |
|---|---|---|
| Método y ruta de login | `POST /auth/login` | Confirmar en controller y pruebas existentes. |
| Entrada de login | No especificada en los artefactos recibidos. | Obtener body, `Content-Type`, campos y validaciones del DTO/controller actuales. |
| Respuesta exitosa | `200` con `token`, `expiresIn` y `user`. | Comparar tipos, estructura y semántica con la implementación actual. |
| Errores de login | No especificados. | Preservar estados y payloads actuales; inspeccionar controller y manejadores de errores. |
| Verificación de tokens | Corresponde a `api/`, que no se modifica en este Issue. | Obtener ruta protegida, algoritmo, clave, claims y errores aprobados antes de integrar. |

El rechazo funcional de tokens alterados o expirados es criterio del Issue, pero no se dispone del estado HTTP ni del esquema de error del verificador. No se deben adoptar como contrato los códigos de error que el entregable de Arquitectura presenta solo como propuesta.

### Persistencia

No se recibió esquema, entidad, repositorio, migración ni contrato de persistencia de Auth. La emisión del token no demuestra por sí sola una operación de escritura. No se pueden proponer verificaciones de tablas, restricciones o integridad, ni afirmar que el flujo completo de login no las use.

## 6. Revisión de correcciones propuestas

- **Coordinación antes del cambio:** Backend declara el cambio bloqueado hasta obtenerla. Es una corrección de proceso coherente con el criterio del Issue, pero no hay evidencia de que se haya registrado. TA-09 queda pendiente.
- **HS256 y `AUTH_TOKEN_SECRET`:** aparecen como propuesta de Arquitectura basada en la documentación citada por el Issue; no hay implementación ni aprobación de `api/` aportada. TA-01 y TA-03 quedan condicionadas a confirmar el acuerdo.
- **Claims `sub`, `iat`, `exp`:** el Issue exige esos claims mínimos, pero no especifica el significado de `sub` ni la política temporal. TA-02 y TA-06 requieren completar esas definiciones.
- **Fallo de inicio si falta configuración:** es una recomendación de Arquitectura sujeta a confirmar el comportamiento de configuración existente, no un criterio de aceptación aprobado. No se convierte aquí en requisito.
- **Preservación del login:** está exigida por el Issue, pero sin DTO/controller no se puede validar que un test use la entrada correcta.
- **Frontend:** el entregable recibido afirma que el cliente trata el token como opaco, pero es una especificación y no evidencia de código ejecutable. No se usa como prueba del emisor ni del verificador.

## 7. Preparación y datos de prueba

Para ejecutar los casos cuando se disponga del proyecto:

1. Obtener el repositorio completo y situarse en su raíz.
2. Inspeccionar `auth/pom.xml` para confirmar JDK, framework de pruebas, plugins y cobertura; no se proporcionaron, por lo que no se asume que estén instalados.
3. Obtener las clases de emisión, controller/DTO de login, configuración y pruebas existentes.
4. Obtener el verificador de `api/` o el entorno integrado acordado, su ruta protegida y sus convenciones de error.
5. Registrar la coordinación de H-API-01 antes de probar o desplegar el nuevo formato.
6. Usar usuario y credenciales de un fixture de prueba existente; no se proporcionaron valores ni un fixture aprobado.
7. Usar únicamente claves sintéticas de prueba suministradas mediante la configuración admitida por el proyecto. No guardar claves reales en el repositorio, logs o reporte.
8. Para TA-05 y TA-06, utilizar el mecanismo de reloj o vencimiento disponible en el proyecto; no se sabe si existe.

### Dependencias pendientes

No se recibió `auth/pom.xml`; por tanto, no es posible confirmar JUnit, Surefire, una biblioteca JWT, un plugin de cobertura, ni comandos de pruebas por clase o grupo. No se debe añadir una dependencia suponiendo que ya está instalada.

## 8. Comandos reproducibles y estado

El único comando de verificación especificado en los artefactos es:

```bash
cd auth && mvn test
```

**Estado: NO EJECUTADO.** No se proporcionó salida verificable de este comando.

No se pueden proporcionar comandos reproducibles por grupo ni de cobertura sin conocer las clases de prueba y la configuración efectiva del proyecto. Tampoco se pueden dar comandos HTTP reproducibles para login o verificación sin conocer el body real, la URL base, las credenciales de prueba y la ruta protegida. Estos son requisitos pendientes, no supuestos.

## 9. Código de pruebas

**No se entrega código de prueba ejecutable en esta iteración.** Faltan el código fuente del emisor y del endpoint, las firmas de las clases, `auth/pom.xml`, el framework de pruebas disponible y el verificador de `api/`. Crear archivos Java con clases o dependencias supuestas produciría pruebas que podrían no compilar y que no validarían los contratos reales. Los casos TA-01 a TA-10 son pruebas propuestas, no pruebas implementadas ni ejecutadas.

Para entregar código ejecutable se necesitan esos artefactos; entonces se podrán escribir pruebas dentro del paquete y estructura existentes, usando las dependencias disponibles.

## 10. Limpieza

No se ejecutaron pruebas ni se crearon datos o archivos temporales; no hay limpieza realizada.

Cuando se ejecute la suite, usar exclusivamente fixtures de prueba y retirarlos mediante el mecanismo existente del proyecto. No se proporciona comando de borrado de datos porque no se recibió contrato de persistencia. Si Maven genera `auth/target`, su limpieza estándar sería:

```bash
cd auth && mvn clean
```

**NO EJECUTADO.**

## 11. Limitaciones y resultados reales

- No se recibió salida real de `mvn test`, de cobertura ni de pruebas de API: todos los casos permanecen **NO EJECUTADOS**.
- No se puede confirmar comportamiento implementado, compilación, compatibilidad del verificador ni cobertura.
- Según el entregable de Backend, el cambio no está implementado y la coordinación con H-API-01 sigue pendiente.
- No se recibieron contratos completos de entrada/error de login ni de verificación.
- No se recibió evidencia verificable de persistencia ni de que el flujo de login esté libre de operaciones persistentes.

**Conclusión:** con los artefactos disponibles puede documentarse la trazabilidad y el plan de pruebas, pero no validar los criterios de aceptación ni entregar pruebas ejecutables sin inventar interfaces, dependencias o contratos.