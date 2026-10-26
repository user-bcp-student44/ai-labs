# Pruebas del componente web

## Alcance

Estas pruebas cubren los flujos de login y consulta de tareas descritos en
`docs/ENDPOINTS.md`. Son pruebas unitarias con dobles locales; no llaman a los
backends reales. Los errores HTTP se simulan con `HttpErrorResponse`.

| Flujo | Caso | Tipo | Resultado esperado |
|---|---|---|---|
| Login | Credenciales válidas y respuesta con `token` y `user` (`web/src/app/login/login.component.spec.ts:78`) | Camino feliz | Inicia sesión, conserva preferencias y navega a `/dashboard`. |
| Login | Request construido con `username`, `password`, `client` y timeout configurado (`web/src/app/services/auth.service.spec.ts:24`) | Camino feliz | `AuthService` envía el body y aplica el timeout de 5000 ms. |
| Login | Usuario vacío o compuesto solo por espacios (`web/src/app/login/login.component.spec.ts:59`) | Borde | Muestra `Ingrese un usuario.` y no llama al servicio de autenticación. |
| Login | Contraseña vacía o compuesta solo por espacios (`web/src/app/login/login.component.spec.ts:68`) | Borde | Muestra `Ingrese una contraseña.` y no llama al servicio de autenticación. |
| Login | Respuesta sin token truthy (`web/src/app/login/login.component.spec.ts:95`, `web/src/app/services/auth.service.spec.ts:42`) | Borde | Muestra `El backend respondió sin token.` y no navega. |
| Login | Respuesta `null`, primitiva o arreglo (`web/src/app/services/auth.service.spec.ts:54`, `web/src/app/login/login.component.spec.ts:131`) | Error de respuesta | `AuthService` rechaza la forma; la UI maneja el rechazo con mensaje genérico. |
| Login | Servicio de autenticación no disponible (`status: 0`; `web/src/app/login/login.component.spec.ts:108`) | Error de red | Muestra el mensaje genérico, no expone detalles y libera el botón. |
| Login | Rechazo por timeout de la petición (`web/src/app/login/login.component.spec.ts:148`) | Error de timeout | Muestra el mismo mensaje genérico y libera el botón. El test simula el error; la configuración de 5000 ms se verifica separadamente en `AuthService`. |
| Tareas | Sesión válida y respuesta con arreglo (`web/src/app/dashboard/dashboard.component.spec.ts:52`, `web/src/app/services/tasks.service.spec.ts:29`) | Camino feliz | Solicita tareas para el usuario de sesión, oculta `ARCHIVED` y presenta las restantes. |
| Tareas | Sesión ausente (`web/src/app/dashboard/dashboard.component.spec.ts:41`) | Borde | Navega a `/login` y no llama al servicio de tareas. |
| Tareas | Token rechazado con HTTP 401 (`web/src/app/dashboard/dashboard.component.spec.ts:103`) | Error de autenticación | Muestra el mensaje genérico; no borra sesión ni navega automáticamente. |
| Tareas | Error HTTP 500 (`web/src/app/dashboard/dashboard.component.spec.ts:84`) | Error del servicio | Muestra el mensaje genérico sin exponer el detalle recibido. |
| Tareas | Servicio de tareas no disponible (`status: 0`; `web/src/app/dashboard/dashboard.component.spec.ts:133`) | Error de red | Muestra el mensaje genérico y termina el estado de carga. |
| Tareas | Rechazo informado como timeout (`web/src/app/dashboard/dashboard.component.spec.ts:119`) | Error de timeout | Muestra el mensaje genérico. No se simula el paso de tiempo: el endpoint no tiene timeout propio configurado. |
| Tareas | Body exitoso que no es un arreglo (`web/src/app/dashboard/dashboard.component.spec.ts:151`) | Error de respuesta | El fallo al procesar el body se captura y se muestra el mensaje genérico. |
| Tareas | Arreglo vacío (`web/src/app/dashboard/dashboard.component.spec.ts:52`, `web/src/app/dashboard/dashboard.component.html:27`) | Borde | `visibleTasks` queda vacío y el template presenta `No hay tareas para mostrar todavía.` |

Los tests están en `web/src/app/login/login.component.spec.ts`,
`web/src/app/services/auth.service.spec.ts`,
`web/src/app/dashboard/dashboard.component.spec.ts` y
`web/src/app/services/tasks.service.spec.ts`. Las pruebas del servicio comprueban
la forma de los requests y las de componentes comprueban la reacción visible.

## Código de los casos añadidos

Los fragmentos siguientes corresponden a los tests ejecutables en los specs
indicados; no sustituyen esos archivos.

### Servicio de autenticación no disponible y timeout

`web/src/app/login/login.component.spec.ts:108` y
`web/src/app/login/login.component.spec.ts:131`:

```ts
it('shows a generic message when the authentication service is unavailable', async () => {
  const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  authService.login.mockRejectedValue(
    new HttpErrorResponse({
      status: 0,
      statusText: 'Unknown Error',
      error: new Error('Connection refused')
    })
  );
  const component = createComponent();
  component.username = 'student';
  component.password = 'wrong';

  await component.login();

  expect(component.message).toBe(
    'No se pudo autenticar. Verifica tus credenciales e inténtalo de nuevo.'
  );
  expect(component.message).not.toContain('Connection refused');
  expect(component.busy).toBe(false);
  expect(logError).toHaveBeenCalled();
});

it('shows a generic message when the login request times out', async () => {
  const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  authService.login.mockRejectedValue(
    new HttpErrorResponse({
      status: 0,
      statusText: 'Timeout',
      error: new Error('Login request timed out')
    })
  );
  const component = createComponent();
  component.username = 'student';
  component.password = 'Workshop123!';

  await component.login();

  expect(component.message).toBe(
    'No se pudo autenticar. Verifica tus credenciales e inténtalo de nuevo.'
  );
  expect(component.busy).toBe(false);
  expect(logError).toHaveBeenCalled();
});
```

### Formas inesperadas de respuesta de login

`web/src/app/services/auth.service.spec.ts:54`:

```ts
it.each([
  { shape: 'null', response: null },
  { shape: 'primitive', response: 'invalid-response' },
  { shape: 'array', response: [] }
])('rejects a $shape login response', async ({ response }) => {
  http.post.mockReturnValue(of(response));

  await expect(service.login('student', 'Workshop123!')).rejects.toThrow(
    'Login response has an invalid shape'
  );
});
```

### Token de tareas inválido y body inesperado

`web/src/app/dashboard/dashboard.component.spec.ts:103` y
`web/src/app/dashboard/dashboard.component.spec.ts:151`:

```ts
it('shows a generic message for an invalid task token without clearing the session', async () => {
  const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  tasksService.getTasks.mockRejectedValue(
    new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
  );
  const component = createComponent();

  await component.ngOnInit();

  expect(component.error).toBe('No se pudo cargar el dashboard. Inténtalo de nuevo.');
  expect(sessionService.clearSession).not.toHaveBeenCalled();
  expect(router.navigate).not.toHaveBeenCalled();
  expect(component.loading).toBe(false);
  expect(logError).toHaveBeenCalled();
});

it('shows a generic message when the successful task body is not an array', async () => {
  const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  tasksService.getTasks.mockResolvedValue({ data: [] });
  const component = createComponent();

  await component.ngOnInit();

  expect(component.error).toBe('No se pudo cargar el dashboard. Inténtalo de nuevo.');
  expect(component.loading).toBe(false);
  expect(logError).toHaveBeenCalled();
});
```

## Ejecución y resultado

| Componente / IDs | Directorio de ejecución | Comando | Código de salida | Resultado |
|---|---|---|---:|---|
| web / H-WEB-01, H-WEB-02, H-WEB-04, H-WEB-05, H-WEB-06 | `web/` | `npm run test:coverage` | 0 | Aprobado el 2026-10-26: 9 archivos de prueba, 45 tests. Generó reporte de texto, HTML y `web/coverage/coverage-summary.json`. |

## Cobertura

Medición con Vitest y proveedor V8. Se calcula como `líneas cubiertas /
líneas instrumentadas` (y el equivalente para sentencias, ramas y funciones);
los conteos provienen de `web/coverage/coverage-summary.json`.

| Alcance | Líneas / sentencias | Ramas | Funciones |
|---|---:|---:|---:|
| Código de producción de los cuatro módulos del flujo (login, `AuthService`, dashboard y `TasksService`) | 149 / 149 = **100%** | 32 / 34 = **94.12%** | 10 / 10 = **100%** |
| Global de `web/` | 264 / 289 = **91.34%** | 77 / 86 = **89.53%** | 22 / 23 = **95.65%** |

En este paso solo se modificaron tests, no código de producción. La primera
fila informa la cobertura de los módulos de producción que ejercita el flujo
modificado; la segunda es la cobertura global independiente e incluye módulos
sin cobertura de flujo, como `app.component.ts` y `app.routes.ts`.

## Fallos, pendientes y pruebas propuestas

### Fallos

- Ninguna prueba automatizada falló en la ejecución registrada.

### Pendientes

- No se realizaron llamadas a los backends reales; el contrato y sus códigos
  HTTP siguen siendo los observados en el cliente y en dobles de prueba.
- El apartado web de `HALLAZGOS.md` conserva una observación histórica
  desactualizada: dice que `docs/ENDPOINTS.md` no existe y describe
  `data.token`/`response.data`. Las pruebas de esta ejecución siguen el código
  actual y `docs/ENDPOINTS.md`, que describen `token` en la raíz y un arreglo
  directo de tareas; reconciliar esa sección queda pendiente.
- El timeout de login se verifica en dos partes: el servicio configura 5000 ms
  (`web/src/app/services/auth.service.spec.ts:24`) y el componente maneja un
  rechazo simulado como timeout. No se esperaron cinco segundos ni se probó un
  timeout de red real.
- El timeout de tareas también se simula como rechazo. `TasksService` no
  configura un plazo propio.
- **H-WEB-05:** el contrato documenta que un `status` ausente o nulo puede
  provocar una excepción al renderizar. No se añadió una prueba que acepte ese
  fallo como resultado correcto ni se ocultó con un test esperado-fallido. El
  hallazgo permanece pendiente; hace falta corregir la validación runtime y
  luego agregar una prueba que verifique el comportamiento seguro acordado.
- La respuesta de login con un `token` truthy de tipo distinto a `string` no
  tiene validación runtime; requiere acordar y caracterizar ese caso antes de
  fijar su resultado esperado.

### Pruebas propuestas

- Tras resolver H-WEB-05, probar una tarea con `status` ausente/nulo y exigir
  que el dashboard presente un estado seguro, sin excepción.
- Añadir una prueba de integración HTTP contra servicios de prueba cuando estén
  disponibles, para confirmar statuses, payloads y errores reales sin usar
  credenciales de producción.
