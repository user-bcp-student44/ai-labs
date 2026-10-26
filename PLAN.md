# Plan de corrección

## web

### aprobacion humana
- Elva
- 2026/10/26
- H-WEB-01, H-WEB-02, H-WEB-03, H-WEB-04, H-WEB-05, H-WEB-06


### Alcance y selección

Se planifican todos los hallazgos web que estaban marcados «Pendiente» en
`HALLAZGOS.md`: H-WEB-01 a H-WEB-06. La selección completa permite atender
conjuntamente el riesgo alto de persistencia del token, los riesgos de
renderizado y dependencias, la separación de responsabilidades y las brechas
de tipos y pruebas. Las prioridades conservan la severidad de la matriz; para
H-WEB-03 no se presupone que exista una vulnerabilidad confirmada.

`docs/ENDPOINTS.md` no existe. Por tanto, se toma como comportamiento observado
el flujo descrito en `HALLAZGOS.md` y el código: login `POST
http://localhost:8080/auth/login` con `username`, `password` y
`client: "angular-workshop"`; tareas `GET
http://localhost:8000/api/tasks?owner=<user.username>` con bearer token;
respuesta de tareas como lista en `response.data`; exclusión de tareas
`ARCHIVED`, orden descendente de prioridad, navegación a `/dashboard` tras
login y a `/login` al faltar sesión o cerrar sesión. No se cambiarán las rutas,
los formatos HTTP ni los parámetros observados.

Las pruebas de caracterización indicadas en cada apartado se escribirán y
ejecutarán antes de modificar los componentes o la configuración que prueban.
Se usarán Vitest y las dependencias ya instaladas; no se añade infraestructura
de pruebas ni dependencias.

### H-WEB-01 — Token bearer guardado en `localStorage` (Alta, pendiente)

- **Hallazgo:** `HALLAZGOS.md`, matriz H-WEB-01. El login guarda el token en
  `localStorage` y el dashboard lo lee para llamar a la API
  (`web/src/app/login/login.component.ts:47`,
  `web/src/app/dashboard/dashboard.component.ts:36`,
  `web/src/app/dashboard/dashboard.component.ts:44`).
- **Problema:** cualquier JavaScript ejecutado en el mismo origen puede leer
  el token, y su persistencia excede la sesión de la pestaña.
- **Cambio propuesto:** centralizar la sesión en un `SessionService` y guardar
  token y usuario en `sessionStorage`, conservando `workshop_preferences` en
  `localStorage`. Al iniciar una sesión nueva y al cerrar sesión, limpiar
  también las antiguas claves de sesión de `localStorage`. El token seguirá
  siendo accesible a JavaScript del mismo origen: `sessionStorage` limita la
  persistencia al contexto de pestaña, pero no es una defensa contra XSS. No se
  cambia el bearer header ni se requiere cambiar los servicios backend.
- **Archivos a tocar:** crear
  `web/src/app/services/session.service.ts` y
  `web/src/app/services/session.service.spec.ts`; modificar
  `web/src/app/login/login.component.ts`,
  `web/src/app/dashboard/dashboard.component.ts` y sus pruebas
  `web/src/app/login/login.component.spec.ts` y
  `web/src/app/dashboard/dashboard.component.spec.ts`.
- **Caracterización antes de tocar los componentes:** probar que un login
  válido hace disponible la sesión para el dashboard, que el dashboard envía
  `Authorization: Bearer <token>` en la consulta de tareas y que logout limpia
  token y usuario, mantiene las preferencias y navega a `/login`. Después de
  introducir el servicio, adaptar las aserciones de almacenamiento a
  `sessionStorage` y comprobar que recargar la misma pestaña mantiene la
  sesión.
- **Comportamiento preservado y cambio acotado:** se mantienen login, consulta
  autenticada, navegación, preferencias y logout sin llamada HTTP de logout.
  La sesión deja de persistir en `localStorage` entre sesiones del navegador;
  esa reducción de persistencia es el cambio de seguridad propuesto.

### H-WEB-02 — Mensaje dinámico mostrado con `[innerHTML]` (Media, Pendiente)

- **Hallazgo:** `HALLAZGOS.md`, matriz H-WEB-02. El mensaje se concatena en
  `web/src/app/login/login.component.ts:56` y se representa con
  `[innerHTML]` en `web/src/app/login/login.component.html:39`.
- **Problema:** datos de entrada y mensajes de error se interpretan como
  marcado HTML, aunque no se haya confirmado un bypass de sanitización ni
  ejecución de script.
- **Cambio propuesto:** mantener el mensaje como texto y usar interpolación
  Angular (`{{ message }}`); reemplazar el marcado en los textos de validación
  por texto plano y conservar la separación visual con CSS o elementos
  estáticos. No introducir `DomSanitizer` ni marcar contenido dinámico como
  confiable.
- **Archivos a tocar:** `web/src/app/login/login.component.ts`,
  `web/src/app/login/login.component.html`,
  `web/src/app/login/login.component.css` si hace falta conservar los saltos
  visuales, y `web/src/app/login/login.component.spec.ts`.
- **Caracterización antes de tocar el componente y la plantilla:** probar que
  las validaciones de usuario/contraseña y los errores de autenticación
  producen un mensaje visible con el usuario y el detalle actualmente
  presentado. Comprobar mediante la compilación Angular existente y una prueba
  de plantilla que el mensaje dinámico se enlaza como texto, no como HTML; no
  se añadirá un entorno DOM nuevo solo para esta aserción.
- **Comportamiento preservado:** se conserva el contenido informativo y el
  estado de error; el texto proporcionado por el usuario o backend deja de
  interpretarse como formato HTML.

### H-WEB-03 — Axios y Lodash requieren verificación de dependencias (Media, Pendiente)

- **Hallazgo:** `HALLAZGOS.md`, matriz H-WEB-03. `axios@0.31.0` y
  `lodash@4.17.21` están declaradas en `web/package.json:19` y
  `web/package.json:20`; la matriz no confirma CVE ni advisory.
- **Problema:** mantener versiones candidatas sin comprobar su exposición ni
  justificar si siguen siendo necesarias.
- **Cambio propuesto:** ejecutar `npm run audit:workshop` y verificar
  advisories aplicables antes de decidir una actualización o eliminación. No
  afirmar que existe un CVE sin evidencia. Caracterizar el contrato de login y
  tareas antes de cualquier actualización de Axios; caracterizar la
  combinación de preferencias antes de reemplazar Lodash. Si las versiones no
  tienen advisory aplicable, no cambiarlas solo por el hallazgo. Considerar
  eliminar Lodash únicamente si una implementación tipada conserva la
  combinación de preferencias observada. Mantener Axios si se necesita para
  los servicios y no hay una remediación justificada; cualquier reemplazo
  deberá preservar exactamente URL, método, payload, timeout, headers y forma
  de lectura de respuestas.
- **Decisión de implementación basada en auditoría:** la caracterización quedó
  aprobada y ejecutada antes de tocar producción. `npm run audit:workshop`
  reportó advisories de alta severidad aplicables a Axios y Lodash. Se
  eliminarán ambas dependencias: sus usos se reemplazarán por `HttpClient` de
  Angular en servicios y una combinación explícita de preferencias tipadas.
  No se usará la versión sugerida por `npm audit fix --force` ni se aplicará
  una actualización forzada.
- **Archivos a tocar:** `web/package.json` y `web/package-lock.json` solo si la
  evidencia justifica el cambio; `web/src/app/login/login.component.ts` y la
  futura prueba del comportamiento de preferencias solo si se retira Lodash.
  Los servicios y pruebas de login/tareas se cubren también en H-WEB-04.
- **Caracterización antes de tocar dependencias:** comprobar con Vitest que
  las preferencias guardadas se combinan con los valores predeterminados
  actuales y verificar en pruebas de login y tareas sus solicitudes y
  respuestas observadas. Ejecutar además `npm run audit:workshop` y registrar
  su resultado antes de alterar el manifiesto o el lockfile.
- **Comportamiento preservado:** sin cambio de endpoints, payloads, timeout,
  encabezados, respuestas ni preferencias. Una modificación de dependencia
  queda condicionada a evidencia reproducible de auditoría y compatibilidad.

### H-WEB-04 — HTTP, sesión, configuración y navegación mezclados en componentes (Media, Pendiente)

- **Hallazgo:** `HALLAZGOS.md`, matriz H-WEB-04. Login y dashboard mezclan HTTP,
  URLs, almacenamiento y navegación
  (`web/src/app/login/login.component.ts:41`,
  `web/src/app/login/login.component.ts:47`,
  `web/src/app/dashboard/dashboard.component.ts:36`,
  `web/src/app/dashboard/dashboard.component.ts:43`,
  `web/src/app/dashboard/dashboard.component.ts:74`).
- **Problema:** los componentes coordinan responsabilidades de transporte,
  sesión, configuración, estado de vista y navegación; las URLs y claves de
  almacenamiento quedan duplicadas o dispersas.
- **Cambio propuesto:** mover las solicitudes a `AuthService` y
  `TasksService`; centralizar almacenamiento y claves en `SessionService`;
  centralizar las URLs actuales de localhost en `web/src/environments/environment.ts`.
  Los componentes conservarán presentación, validación de vista y navegación.
  Reutilizar los servicios introducidos para H-WEB-01 en vez de duplicar
  manejo de sesión. Como Angular `HttpClient` requiere estar registrado en el
  bootstrap actual, agregar `provideHttpClient()` a `web/src/main.ts`. Como
  las preferencias no son sesión, separarlas en `PreferencesService` para que
  los componentes no accedan directamente a almacenamiento. No añadir
  interceptor ni cambiar el formato HTTP si no es necesario para el contrato
  actual.
- **Archivos a tocar:** crear
  `web/src/app/services/auth.service.ts`,
  `web/src/app/services/tasks.service.ts`,
  `web/src/app/services/preferences.service.ts`,
  `web/src/environments/environment.ts` y sus pruebas de servicio;
  modificar `web/src/app/login/login.component.ts`,
  `web/src/app/dashboard/dashboard.component.ts`, `web/src/main.ts` y sus
  pruebas. El servicio de sesión y su prueba se comparten con H-WEB-01.
  Cambiar `web/angular.json` solo si la configuración de compilación requiere
  declarar reemplazos de ambiente; no se inventarán URLs de otros entornos.
- **Caracterización antes de tocar los componentes:** probar solicitud de
  login (método, URL, body y timeout), solicitud de tareas (método, URL con
  `owner`, bearer header), respuesta de tareas, filtrado de `ARCHIVED`,
  orden de prioridad, navegación cuando falta token, mensajes de error y
  logout sin petición de red. Estas pruebas se añadirán a los specs de
  componentes existentes antes de extraer las llamadas.
- **Comportamiento preservado:** se conservan endpoints, parámetros, payloads,
  timeout de login, cabecera bearer, reglas de presentación, errores visibles
  y rutas. Las URLs por defecto seguirán siendo las localhost observadas.

### H-WEB-05 — `any` y validación anidada (Media, Pendiente)

- **Hallazgo:** `HALLAZGOS.md`, matriz H-WEB-05. Hay propiedades y respuestas
  `any` y validación anidada en
  `web/src/app/login/login.component.ts:16`,
  `web/src/app/login/login.component.ts:33`,
  `web/src/app/login/login.component.ts:36`,
  `web/src/app/dashboard/dashboard.component.ts:23`,
  `web/src/app/utils/legacy-format.ts:1`.
- **Problema:** las respuestas, tareas y estado de vista no tienen contratos
  estáticos; validaciones y ramas anidadas dificultan verificar casos límite.
- **Cambio propuesto:** definir tipos explícitos para request/response de
  login, usuario, tarea y preferencias; usar `unknown` y estrechamiento para
  errores; reemplazar `any` en componentes y `formatTaskLabel`. Extraer la
  preparación de tareas a una función pequeña reutilizable si hace falta,
  usar retornos anticipados y evitar lógica duplicada. Activar el modo estricto
  solo en los archivos/configuración cuya compatibilidad pueda verificarse,
  sin debilitar las opciones existentes.
- **Archivos a tocar:** tipos y lógica en
  `web/src/app/login/login.component.ts`,
  `web/src/app/dashboard/dashboard.component.ts`,
  `web/src/app/utils/legacy-format.ts`; crear tipos o utilidades en
  `web/src/app/models/` o `web/src/app/utils/` solo si la separación los
  justifica; actualizar `web/src/app/utils/legacy-format.spec.ts` y las
  pruebas de login/dashboard. Revisar `web/tsconfig.json` únicamente si el
  tipado requiere habilitar comprobaciones gradualmente.
- **Caracterización antes de tocar los tipos y componentes:** probar valores
  vacíos y nulos de usuario/contraseña, respuesta sin token, errores con y sin
  `response.data`, tareas sin prioridad/owner, estados conocidos y
  desconocidos, y conservación de las reglas de filtrado y orden. Mantener los
  resultados actuales salvo el reemplazo explícito de mensajes internos por
  mensajes genéricos seguros si la revisión confirma que exponen detalles.
- **Comportamiento preservado:** misma aceptación/rechazo de entradas, flujo
  HTTP y reglas de tareas. Cualquier normalización del texto de error debe
  mantener el indicador y contexto del fallo, sin exponer detalles internos.

### H-WEB-06 — Pruebas observadas limitadas a una utilidad (Baja, Pendiente)

- **Hallazgo:** `HALLAZGOS.md`, matriz H-WEB-06. La única prueba observada es
  `web/src/app/utils/legacy-format.spec.ts:4`.
- **Problema:** no hay caracterización automatizada del flujo login, sesión,
  consulta y transformación de tareas, errores ni logout.
- **Cambio propuesto:** ampliar la suite Vitest con pruebas unitarias de
  servicios y utilidades, y pruebas del comportamiento observable de los
  componentes con `Router` y cliente HTTP simulados. Cubrir casos válidos,
  inválidos y fallidos, sin llamadas reales a backends. Mantener el alcance
  dentro de `web/` y perseguir al menos 85% de cobertura del código modificado,
  sin cambiar umbrales para aprobar.
- **Archivos a tocar:** crear
  `web/src/app/login/login.component.spec.ts`,
  `web/src/app/dashboard/dashboard.component.spec.ts` y pruebas para los
  servicios/utilidades que se incorporen en H-WEB-01, H-WEB-04 y H-WEB-05;
  actualizar `web/src/app/utils/legacy-format.spec.ts` cuando cambie su
  contrato tipado.
- **Caracterización antes de tocar el código de producción:** primero añadir
  pruebas de login exitoso y fallido, persistencia y cierre de sesión, tareas
  vacías y con elementos archivados, errores de red, estados de carga y
  redirección sin sesión. Confirmar el resultado con `npm test` desde
  `web/`; usar `npm run test:coverage` para comprobar el objetivo de cobertura
  después de que exista la implementación. Registrar resultados reales en
  `docs/TESTING.md` en el paso de evidencias, relacionándolos con H-WEB-06 y
  los otros IDs cubiertos.
- **Comportamiento preservado:** pruebas sin servicios externos y sin
  modificar los contratos HTTP ni los estados de interfaz observados.

### Orden y dependencias propuestas

1. Escribir y ejecutar primero las pruebas de caracterización de H-WEB-01,
   H-WEB-02, H-WEB-04, H-WEB-05 y H-WEB-06; registrar por separado cualquier
   prueba bloqueada por la configuración actual de Vitest.
2. Verificar advisories y el comportamiento de preferencias para H-WEB-03
   antes de tocar manifiesto o lockfile; no condicionar la refactorización a
   una actualización de dependencia no justificada.
3. Implementar la sesión centralizada de H-WEB-01 y después extraer servicios
   de H-WEB-04, reutilizando los mismos tipos y pruebas de caracterización.
4. Completar tipado y manejo de errores de H-WEB-05; mantener las pruebas de
   H-WEB-06 como regresión y verificar la cobertura del código modificado.
5. Revalidar que endpoints, payloads, encabezados, navegación, estados de
   tareas y preferencias conservan el comportamiento documentado aquí antes
   de solicitar revisión humana.

### Ejecuciones registradas

| componente / IDs | comando (cwd `web/`) | resultado |
|---|---|---|
| web / H-WEB-01, H-WEB-02, H-WEB-04, H-WEB-05, H-WEB-06 | `npm test` (caracterización, primera ejecución) | Falló: 2 suites no pudieron cargar Angular porque Vitest en Node no había cargado el compilador JIT. Se añadió `import '@angular/compiler'` en los specs; no se tocó producción. |
| web / H-WEB-01, H-WEB-02, H-WEB-04, H-WEB-05, H-WEB-06 | `npm test` (caracterización, reejecución) | Aprobado: 3 suites, 14 pruebas. |
| web / H-WEB-03 | `npm run audit:workshop` (antes de retirar dependencias) | Falló con exit code 1: 25 vulnerabilidades (10 moderadas, 9 altas, 6 críticas), incluidas advisories de alta severidad aplicables a Axios y Lodash. El informe también listó dependencias Angular, Vitest y transitivas fuera del alcance aprobado; quedan como riesgo pendiente, no se silencian ni actualizan en esta implementación. |
| web / H-WEB-03 | `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` | Falló con TypeError de npm Arborist (`Cannot read properties of null (reading 'children')`); no modificó el lockfile. |
| web / H-WEB-03 | `npm install --package-lock-only --ignore-scripts --no-audit --no-fund --legacy-peer-deps` | Aprobado; sincronizó el lockfile con el manifiesto sin añadir dependencias. |
| web / H-WEB-03 | `npm prune --legacy-peer-deps --ignore-scripts --no-audit --no-fund` | Aprobado; npm retiró 17 paquetes extraneous del árbol instalado tras la eliminación de Axios/Lodash. |
| web / H-WEB-03 | `npm ls axios lodash --depth=0` | El árbol mostró `(empty)` y código 1 porque ya no hay paquetes que listar; `npm ls --depth=0` terminó correctamente y enumeró las dependencias directas restantes. |
| web / H-WEB-01, H-WEB-02, H-WEB-04, H-WEB-05, H-WEB-06 | `npm test` (primera regresión tras cambios) | Falló 1 de 34 pruebas: el doble de prueba del dashboard no definía `clearSession`. Se corrigió el doble, sin modificar código de producción. |
| web / H-WEB-01, H-WEB-02, H-WEB-04, H-WEB-05, H-WEB-06 | `npm test` (reejecución) | Aprobado: 8 suites, 34 pruebas. |
| web / H-WEB-01, H-WEB-02, H-WEB-04, H-WEB-05, H-WEB-06 | `npm run test:coverage` (primera cobertura) | Aprobado: 8 suites, 34 pruebas; 87.8% de sentencias/líneas globales. Se añadieron casos de prioridades iguales y del bootstrap para elevar cobertura de archivos modificados. |
| web / H-WEB-01, H-WEB-02, H-WEB-03, H-WEB-04, H-WEB-05, H-WEB-06 | `npm run test:coverage` (validación tras refactor y poda) | Aprobado: 9 suites, 37 pruebas; 91.28% sentencias/líneas, 89.28% ramas y 95.65% funciones. Componentes, servicios ejecutables, utilidades y bootstrap modificados alcanzan al menos 91.83% de líneas; los modelos son declaraciones de tipos sin código ejecutable. |
| web / H-WEB-01, H-WEB-02, H-WEB-03, H-WEB-04, H-WEB-05, H-WEB-06 | `npm run build` (cuatro ejecuciones tras implementación) | Las cuatro ejecuciones terminaron correctamente; la última se ejecutó tras mantener la compatibilidad de preferencias adicionales. |
| web / H-WEB-01, H-WEB-02, H-WEB-03, H-WEB-04, H-WEB-05, H-WEB-06 | `npm run test:coverage` (validación final después de ajustes de preferencias) | Aprobado: 9 suites, 37 pruebas; 91.34% sentencias/líneas, 89.28% ramas y 95.65% funciones. Componentes, servicios ejecutables, utilidades y bootstrap modificados alcanzan al menos 91.83% de líneas; los modelos son declaraciones de tipos sin código ejecutable. |
| web / H-WEB-03 | `npm run audit:workshop` (después de retirar dependencias) | Falló con exit code 1: 23 vulnerabilidades (10 moderadas, 7 altas, 6 críticas). Axios y Lodash ya no aparecen en el informe; los hallazgos restantes afectan dependencias fuera del alcance aprobado y quedan pendientes de selección/revisión. |

El cambio de Axios a `HttpClient`, el wiring en `main.ts` y
`PreferencesService` son ajustes de implementación necesarios para retirar las
dependencias vulnerables sin alterar contratos ni añadir dependencias. No
introducen configuración con secretos ni endpoints distintos.

## Revisión técnica local del diff

La revisión de `git diff main -- web/` en `day1/prompting` verificó los seis
hallazgos marcados Resuelto y el estado del worktree. HALLAZGOS.md y PLAN.md
están sin seguimiento, por lo que no aparecen en el diff de Git; se leyeron
directamente y se conserva el contenido existente.

- **H-WEB-01 — vuelve a Pendiente:** `web/src/app/services/session.service.ts:12`
  guarda el bearer token en `sessionStorage`. Eso limita su persistencia, pero
  no su accesibilidad para JavaScript del mismo origen; sigue expuesto ante
  XSS. No se aprueba mover secretos al frontend ni se cambia el mecanismo en
  esta revisión.
- **H-WEB-05 — vuelve a Pendiente:** el tipado estático de `Task.status` no
  valida respuestas HTTP en runtime. `statusLabel` ejecuta
  `status.toUpperCase()` sin guardia en
  `web/src/app/dashboard/dashboard.component.ts:38-39`, aunque el template
  protege el estado al construir la clase en
  `web/src/app/dashboard/dashboard.component.html:25`. Un estado vacío o nulo
  puede causar un fallo de representación.
- **H-WEB-02, H-WEB-03, H-WEB-04 y H-WEB-06:** verificados como corregidos en
  el diff inspeccionado. No se encontró `[innerHTML]` de producción ni `any`
  en el código fuente de `web/src`; las apariciones de `innerHTML` están en
  una aserción del spec que confirma su ausencia.
- **Pruebas de revisión:** `web / H-WEB-01, H-WEB-02, H-WEB-03, H-WEB-04,
  H-WEB-05, H-WEB-06` — `npm test` — aprobado: 9 suites, 37 pruebas.
- **Dependencias:** `web / H-WEB-03` — `npm run audit:workshop` — falló con
  23 vulnerabilidades (10 moderadas, 7 altas, 6 críticas), las mismas cifras
  registradas tras retirar Axios y Lodash. No se redujeron quality gates.
- **Accesibilidad:** los mensajes condicionales de login y dashboard no
  declaran `role="alert"` ni una región `aria-live`; se registra como
  sugerencia, sin alterar código durante esta revisión.

## Alcance complementario: hallazgos web pendientes

Selección: H-WEB-01 y H-WEB-05, que son los hallazgos del componente web que
siguen Pendiente en la matriz de `HALLAZGOS.md`. Los demás hallazgos web están
marcados Resuelto y no se incluyen en esta propuesta. Este complemento conserva
el plan y el historial de ejecuciones anterior; no se modificó código ni se
ejecutaron pruebas en esta etapa. La aprobación previa registrada se refiere
a la implementación anterior y no se interpreta como aprobación de estos
cambios adicionales.

La sección de contrato web al inicio de `HALLAZGOS.md` mantiene referencias
históricas a `data.token` y `response.data` y dice que `docs/ENDPOINTS.md` no
existe. Para esta propuesta se toma el contrato observado en
`docs/ENDPOINTS.md` y el código actual: login espera `token` en la raíz y
tareas consume un arreglo directo. No se propone cambiar esos contratos.

## Item: H-WEB-01 — token bearer accesible a JavaScript

- **Hallazgo de `HALLAZGOS.md`:** H-WEB-01, vulnerabilidad de severidad alta,
  estado Pendiente.
- **Problema:** `SessionService` escribe el token en `sessionStorage`
  (`web/src/app/services/session.service.ts:12`) y `TasksService` lo adjunta
  al request de tareas (`web/src/app/services/tasks.service.ts:21`). Como
  `sessionStorage` es legible por JavaScript del mismo origen, el cambio
  anterior desde `localStorage` redujo persistencia, pero no resolvió la
  exposición ante XSS.
- **Cambio propuesto:** no sustituir `sessionStorage` por otra forma de
  almacenamiento legible por JavaScript ni marcar el hallazgo Resuelto por una
  reducción de persistencia. La corrección completa requiere que el servicio
  de autenticación emita una cookie `HttpOnly`, `Secure` y con `SameSite`
  apropiado, y que tareas autentique esa cookie en vez del bearer enviado por
  Angular. Esta opción cambia el contrato HTTP observado. El trabajo de
  implementación queda bloqueado hasta que se acuerde explícitamente ese
  cambio con los responsables de los servicios; también deben definirse
  `withCredentials`, CORS con credenciales, alcance de cookie y uso de HTTPS.
  Hasta entonces se conserva el contrato actual y H-WEB-01 permanece
  Pendiente.
- **Archivos web a tocar si se aprueba el cambio de contrato:**
  `web/src/app/services/auth.service.ts`,
  `web/src/app/services/session.service.ts`,
  `web/src/app/services/tasks.service.ts`,
  `web/src/app/services/auth.service.spec.ts`,
  `web/src/app/services/session.service.spec.ts`,
  `web/src/app/services/tasks.service.spec.ts`,
  y, si el flujo visual lo requiere,
  `web/src/app/login/login.component.spec.ts` y
  `web/src/app/dashboard/dashboard.component.spec.ts`. Actualizar solo la
  sección web de `docs/ENDPOINTS.md` después de que el nuevo contrato haya sido
  acordado; no tocar backend ni otras secciones en este alcance.
- **Prueba de caracterización antes de tocar producción:** mantener y ejecutar
  conjuntamente las pruebas actuales que fijan el login con `token` en la
  raíz (`web/src/app/services/auth.service.spec.ts:24`), el almacenamiento y
  limpieza de sesión (`web/src/app/services/session.service.spec.ts:42`) y el
  envío de `owner` más bearer en tareas
  (`web/src/app/services/tasks.service.spec.ts:29`). Si se aprueba el contrato
  de cookie, escribir primero pruebas objetivo que comprueben que el body ya
  no expone el bearer, que no se escribe token en `localStorage` ni
  `sessionStorage`, y que la petición de tareas usa credenciales de cookie sin
  el header bearer. La bandera `HttpOnly` no puede probarse desde JavaScript:
  también se requiere evidencia HTTP del servicio real; no se añade una
  dependencia de browser test en esta propuesta.
- **Contrato y riesgo pendientes:** no se cambia `docs/ENDPOINTS.md` ni se
  implementa una mitigación parcial como si resolviera XSS. Faltan la decisión
  humana sobre el cambio de contrato y la confirmación de soporte en los
  servicios; sin ambas, no hay una corrección completa dentro del código web.

## Item: H-WEB-05 — estado de tarea sin validación runtime

- **Hallazgo de `HALLAZGOS.md`:** H-WEB-05, refactor de severidad media,
  estado Pendiente.
- **Problema:** `Task.status` se declara `string`
  (`web/src/app/models/task.model.ts:5`), pero ese tipo no valida el JSON en
  runtime. El template pasa el valor a `statusLabel`
  (`web/src/app/dashboard/dashboard.component.html:25`) y el método invoca
  `toUpperCase()` sin guardia (`web/src/app/dashboard/dashboard.component.ts:39`).
  Un `status` nulo puede interrumpir el renderizado. La clase CSS ya usa una
  cadena vacía como guardia y no requiere cambio para este caso.
- **Cambio propuesto:** añadir una guardia de tipo en `statusLabel` para
  `null`, `undefined` y texto vacío, devolver una constante nombrada para el
  estado no disponible y conservar las traducciones existentes y el
  comportamiento para estados string desconocidos. No cambiar el tipo o la
  forma HTTP de la tarea; el cambio protege el límite de runtime del cliente.
- **Archivos a tocar:** `web/src/app/dashboard/dashboard.component.ts` y
  `web/src/app/dashboard/dashboard.component.spec.ts`. Actualizar la nota de
  riesgo de la sección web de `docs/ENDPOINTS.md` para describir el fallback
  después de verificarlo. No se prevé modificar el template ni
  `web/src/app/models/task.model.ts`.
- **Prueba de regresión antes de tocar producción:** agregar primero un test de
  `statusLabel` que espere el texto seguro acordado para `null`, `undefined` y
  `''`, junto con aserciones de que `TODO` conserva su etiqueta y un string
  desconocido se conserva. Ejecutar el test antes de modificar
  `dashboard.component.ts`; el caso inválido debe reproducir el fallo actual.
  El test puede usar una conversión de tipo explícita para representar un
  payload JSON que incumple la interfaz estática, sin usar `any`. Después de la
  guardia, ejecutar el test focalizado y la suite con cobertura.
- **Contrato preservado:** no se cambia la respuesta acordada/observada de
  `GET /api/tasks`; `status` continúa siendo string requerido para respuestas
  válidas. El fallback solo define el comportamiento defensivo del cliente
  ante datos incompletos.
