# Hallazgos

## Contrato observado en web

`docs/ENDPOINTS.md` no existe en este workspace, por lo que lo siguiente es
observado en el cliente y no un contrato acordado con los servicios:

- Login: `POST http://localhost:8080/auth/login`, con `username`, `password` y
  `client: "angular-workshop"`. Si la respuesta contiene `data.token`, el
  cliente guarda el token y `data.user` en `sessionStorage` y navega a
  `/dashboard`. El token sigue siendo accesible a JavaScript del mismo origen.
- Tareas: `GET http://localhost:8000/api/tasks?owner=<user.username>`, con
  `Authorization: Bearer <token>`. El dashboard espera una lista en
  `response.data`, oculta tareas con estado `ARCHIVED` y presenta un mensaje de
  error a partir de `detail`, `message` o el mensaje de la excepción.
- Sesión: el dashboard redirige a `/login` si no encuentra token. Cerrar sesión
  elimina `workshop_token` y `workshop_user` de `sessionStorage` y las claves
  heredadas de `localStorage`, y navega a `/login`; no se observa una llamada
  HTTP de logout. `workshop_preferences` permanece guardado.

## Matriz de seguimiento

| id | componente | hallazgo | tipo | explicacion | evidencia (archivo:linea) | severidad | estado |
|---|---|---|---|---|---|---|---|
| H-WEB-01 | web | Token bearer guardado en `localStorage` | Vulnerabilidad | Pendiente: `sessionStorage` reduce persistencia, pero el token bearer continúa accesible a JavaScript del mismo origen y, por tanto, expuesto ante XSS. La limitación está documentada en PLAN.md; no se considera corregido hasta que el almacenamiento deje de exponer el token al código del frontend. | `web/src/app/services/session.service.ts:12`; `web/src/app/dashboard/dashboard.component.ts:43` | Alta | Pendiente |
| H-WEB-02 | web | Mensaje dinámico mostrado con `[innerHTML]` | Vulnerabilidad | El mensaje podía contener datos ingresados y del error del backend. Resolución: la plantilla usa interpolación de texto y los errores muestran mensajes genéricos, sin interpretar HTML dinámico. | `web/src/app/login/login.component.ts:53`; `web/src/app/login/login.component.html:39` | Media | Resuelto |
| H-WEB-03 | web | Dependencias Axios y Lodash fijadas en versiones candidatas a revisión | Sugerencia | `npm run audit:workshop` identificó advisories de alta severidad aplicables a ambas dependencias. Resolución: se retiraron Axios y Lodash del manifiesto/lockfile y se reemplazaron sus usos por `HttpClient` y combinación tipada de preferencias. La auditoría sigue reportando vulnerabilidades en otras dependencias, fuera de este hallazgo y del alcance aprobado; ver PLAN.md. | `web/package.json:12`; `web/src/app/services/auth.service.ts:1`; `web/src/app/services/tasks.service.ts:1` | Media | Resuelto |
| H-WEB-04 | web | Los componentes mezclan HTTP, sesión, configuración y navegación | Refactor | Resolución: `AuthService` y `TasksService` concentran HTTP; `SessionService` y `PreferencesService` centralizan persistencia; `environment.ts` centraliza URLs. Los componentes conservan presentación y navegación. | `web/src/app/services/auth.service.ts:9`; `web/src/app/services/tasks.service.ts:9`; `web/src/environments/environment.ts:2` | Media | Resuelto |
| H-WEB-05 | web | Uso de `any` y validación anidada | Refactor | Pendiente de cierre completo: se eliminaron los usos de `any` y se simplificó la validación, pero el tipado estático no valida el payload HTTP en runtime. `statusLabel` invoca `toUpperCase()` directamente; un estado vacío o nulo puede interrumpir la representación del dashboard. | `web/src/app/models/task.model.ts:1`; `web/src/app/dashboard/dashboard.component.ts:39`; `web/src/app/dashboard/dashboard.component.html:25` | Media | Pendiente |
| H-WEB-06 | web | Prueba automatizada observada limitada a una utilidad | Sugerencia | Resolución: se añadieron caracterizaciones y pruebas de componentes, servicios, bootstrap y utilidades. La ejecución final obtuvo 37 pruebas aprobadas y 91.34% de cobertura global de sentencias/líneas; detalle por ejecución en PLAN.md. | `web/src/app/login/login.component.spec.ts:23`; `web/src/app/dashboard/dashboard.component.spec.ts:9`; `web/src/app/services/session.service.spec.ts:20`; `web/src/app/utils/task-utils.spec.ts:5` | Baja | Resuelto |
