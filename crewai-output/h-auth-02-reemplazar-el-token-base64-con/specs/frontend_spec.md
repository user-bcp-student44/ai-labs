# `frontend_spec.md`

## Estado y alcance

La feature H-AUTH-02 cambia la emisión y verificación de tokens en el backend. El frontend debe tratar el token como opaco: no lo genera, decodifica ni valida, y no guarda el token en almacenamiento local.

Se conoce `POST /auth/login` y que la respuesta exitosa conserva `token`, `expiresIn` y `user`. No se proporcionaron el DTO de entrada, los tipos de `expiresIn` y `user`, el formulario actual ni la convención vigente de errores. Por ello, el código siguiente es un adaptador de login y un contenedor de estados, **no una pantalla de login lista para integrar**. Los campos, validaciones visibles y mensajes por campo quedan pendientes del contrato existente.

## Recorrido y elementos del formulario

| Elemento | Validación visible | Relación con criterios de aceptación |
|---|---|---|
| Campos del formulario | No se conocen. No se añaden campos ni validaciones inventadas. | Ningún criterio define los campos de entrada. Backend debe proporcionar el DTO y sus reglas actuales. |
| Envío | El contenedor no envía mientras la forma reactiva sea inválida; marca controles como tocados para que la pantalla anfitriona muestre sus errores. | El envío inicia `POST /auth/login`; no modifica el formato de la respuesta exitosa. |
| Cancelación/reintento | No se define una acción de cancelación. Se permite reintentar después de un error. | No hay un criterio que defina otras acciones. |

La pantalla anfitriona debe proporcionar los controles reactivos, sus etiquetas asociadas y sus mensajes de validación una vez que se confirme el contrato existente.

## Estados

| Estado | Presentación |
|---|---|
| Inicial / sin respuesta | Mensaje neutro; no se muestra información de usuario ni del token. No hay un estado de resultados vacíos definido para una operación de login. |
| Carga | Botón deshabilitado y mensaje de progreso con `role="status"` y `aria-live`. |
| Éxito | Mensaje accesible. La respuesta se emite en memoria al componente anfitrión; no se muestra ni persiste el token. |
| Error | Mensaje genérico sin incluir el cuerpo de error, datos sensibles ni detalles técnicos. El resumen recibe el foco. |

Los mensajes asociados a códigos HTTP en el código son **fallbacks genéricos**, no una afirmación de que el contrato actual de `/auth/login` devuelva todos esos códigos o use dichos significados.

## Mapeo genérico de errores

| Estado observado | Mensaje mostrado |
|---|---|
| 400 | No se pudo procesar la solicitud. Revisa la información e inténtalo de nuevo. |
| 401 | No se pudo iniciar sesión. Revisa la información e inténtalo de nuevo. |
| 403 | No tienes permiso para realizar esta acción. |
| 404 | No se encontró el recurso solicitado. |
| 409 | No se pudo completar la solicitud por un conflicto. Inténtalo de nuevo. |
| 5xx | El servicio no está disponible en este momento. Inténtalo más tarde. |
| Sin respuesta HTTP u otro estado | No se pudo completar la solicitud. Inténtalo de nuevo. |

Backend debe confirmar qué errores puede producir el endpoint y cuál es su semántica. El frontend no interpreta el cuerpo del error ni asume códigos internos.

## Accesibilidad

- El contenedor proporciona una región de progreso `role="status"` y regiones de error y éxito anunciables.
- El resumen de error recibe foco. El envío es operable con teclado.
- La pantalla anfitriona debe proporcionar etiquetas, instrucciones y errores asociados a **cada campo real**; no se conocen esos campos en la información disponible.
- El CSS diferencia estados mediante texto, fondo y foco visible; no depende solo del color.
- No se usa `innerHTML`.

## Criterios de aceptación y evidencia

| Criterio | Relación con este frontend | Comprobación propuesta |
|---|---|---|
| El token no contiene el secreto, está firmado y la clave se lee de configuración. | No es responsabilidad del cliente. El servicio conserva el token como valor opaco y no incorpora secretos. La emisión y configuración deben verificarse en Backend. | Inspeccionar la implementación y configuración de Auth; comprobar que no se filtra la clave ni el token en la UI o logs. **NO EJECUTADO.** |
| El token incluye expiración y claims explícitos (`sub`, `iat`, `exp` como mínimo). | No decodificar el token en el frontend. Debe probarse en el emisor backend. | Pruebas backend después de resolver el contrato con `api/`. **NO EJECUTADO.** |
| Un token alterado o expirado es rechazado por la verificación. | Corresponde al verificador de `api/`, no al frontend. | Pruebas de integración contra el verificador coordinado. **NO EJECUTADO.** |
| `POST /auth/login` válido conserva 200 con `token`, `expiresIn` y `user`. | `auth.service.ts` usa la ruta conocida; `auth.models.ts` conserva esos nombres. No se verificaron los tipos completos ni el comportamiento de servidor. | En el frontend, probar la petición con el contrato real y comprobar respuesta. Backend debe verificar el status y DTO. **NO EJECUTADO.** |
| La coordinación con H-API-01 queda registrada antes de cambiar el formato. | No se puede acreditar con los archivos recibidos. El historial de Backend indica que sigue pendiente; no cambiar el formato desde el frontend. | Registrar acuerdo entre Auth y API antes del cambio de emisor. **PENDIENTE.** |
| `mvn test` pasa desde `auth/` con cobertura del código modificado de 85% o más. | Es una comprobación backend; no se modificó código backend aquí. | `cd auth && mvn test` y el comando de cobertura configurado por el proyecto. **NO EJECUTADO.** |

## Supuestos pendientes

1. **Backend:** proporcionar el DTO del body de login y las validaciones vigentes.
2. **Frontend/Backend:** confirmar los tipos de `expiresIn`, `user` y la base URL/configuración de despliegue del API.
3. **Backend:** confirmar los estados y el formato de error reales de `/auth/login`.
4. **Frontend:** integrar el contenedor en la pantalla existente y asociar etiquetas, ayudas y errores a los campos reales.
5. **Auth y API:** registrar la coordinación exigida por H-API-01 antes de cambiar el formato del token.

Comandos sugeridos para cuando se integre en el proyecto: `ng test --watch=false` y `ng build`. **NO EJECUTADOS**; no se proporcionó el proyecto Angular ni se ejecutaron herramientas.

```typescript
// auth.models.ts

/**
 * El contrato recibido no describe los campos del body de login.
 * Se mantiene opaco para no inventar nombres ni tipos.
 */
export type LoginRequest = unknown;

/**
 * Solo se tipan los nombres garantizados por el contrato disponible.
 * Los tipos concretos de expiresIn y la estructura de user están pendientes.
 */
export interface LoginResponse {
  token: string;
  expiresIn: unknown;
  user: unknown;
}
```

```typescript
// auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoginRequest, LoginResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /**
   * Ruta del contrato aprobado. Este path relativo supone que el despliegue
   * enruta /auth al API en el mismo origen; confirmar la configuración real.
   */
  private readonly loginUrl = '/auth/login';

  constructor(private readonly http: HttpClient) {}

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.loginUrl, request);
  }
}
```

```typescript
// login.component.ts

import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, finalize } from 'rxjs';
import { AuthService } from './auth.service';
import { LoginResponse } from './auth.models';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnDestroy {
  /**
   * La pantalla anfitriona debe crear esta forma reactiva según el DTO
   * existente e incluir sus controles y mensajes accesibles.
   */
  @Input() form!: FormGroup;

  /**
   * El componente anfitrión recibe la respuesta en memoria para continuar
   * el flujo de autenticación. No persistir ni registrar el token.
   */
  @Output() readonly loginCompleted = new EventEmitter<LoginResponse>();

  @ViewChild('errorSummary')
  private errorSummary?: ElementRef<HTMLElement>;

  loading = false;
  success = false;
  errorMessage: string | null = null;

  private requestSubscription?: Subscription;

  constructor(
    private readonly authService: AuthService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  submit(): void {
    if (this.loading || !this.form) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showError('Revisa los campos del formulario e inténtalo de nuevo.');
      return;
    }

    this.errorMessage = null;
    this.success = false;
    this.loading = true;

    this.requestSubscription = this.authService
      .login(this.form.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.success = true;
          this.loginCompleted.emit(response);
        },
        error: (error: unknown) => {
          this.showError(this.messageFor(error));
        },
      });
  }

  ngOnDestroy(): void {
    this.requestSubscription?.unsubscribe();
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.changeDetector.detectChanges();
    this.errorSummary?.nativeElement.focus();
  }

  /**
   * Fallback genérico basado solo en el estado HTTP.
   * No se interpreta ni se presenta el cuerpo de error del servidor.
   */
  private messageFor(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo completar la solicitud. Inténtalo de nuevo.';
    }

    if (error.status === 0) {
      return 'No se pudo completar la solicitud. Inténtalo de nuevo.';
    }

    switch (error.status) {
      case 400:
        return 'No se pudo procesar la solicitud. Revisa la información e inténtalo de nuevo.';
      case 401:
        return 'No se pudo iniciar sesión. Revisa la información e inténtalo de nuevo.';
      case 403:
        return 'No tienes permiso para realizar esta acción.';
      case 404:
        return 'No se encontró el recurso solicitado.';
      case 409:
        return 'No se pudo completar la solicitud por un conflicto. Inténtalo de nuevo.';
      default:
        if (error.status >= 500) {
          return 'El servicio no está disponible en este momento. Inténtalo más tarde.';
        }
        return 'No se pudo completar la solicitud. Inténtalo de nuevo.';
    }
  }
}
```

```html
<!-- login.component.html -->

<section class="login" aria-labelledby="login-title">
  <h1 id="login-title">Iniciar sesión</h1>

  <!-- La pantalla anfitriona aporta los campos y sus etiquetas/errores reales. -->
  <ng-content></ng-content>

  <p class="login__idle" *ngIf="!loading && !success && !errorMessage">
    Completa el formulario para continuar.
  </p>

  <p *ngIf="loading" class="login__progress" role="status" aria-live="polite">
    Enviando solicitud…
  </p>

  <div
    *ngIf="errorMessage"
    #errorSummary
    class="login__error"
    role="alert"
    aria-live="assertive"
    tabindex="-1"
  >
    {{ errorMessage }}
  </div>

  <p *ngIf="success" class="login__success" role="status" aria-live="polite">
    Inicio de sesión completado.
  </p>

  <button type="button" [disabled]="loading" (click)="submit()">
    {{ loading ? 'Enviando…' : 'Iniciar sesión' }}
  </button>
</section>
```

```css
/* login.component.css */

.login {
  color: #1f2937;
  background: #ffffff;
}

.login button {
  color: #ffffff;
  background-color: #1d4ed8;
  border: 2px solid #1d4ed8;
  border-radius: 0.25rem;
  padding: 0.625rem 1rem;
}

.login button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.login button:focus-visible,
.login__error:focus {
  outline: 3px solid #111827;
  outline-offset: 3px;
}

.login__progress,
.login__idle {
  color: #1f2937;
}

.login__error {
  color: #7f1d1d;
  background-color: #fef2f2;
  border: 1px solid #7f1d1d;
  padding: 0.75rem;
}

.login__success {
  color: #14532d;
  background-color: #f0fdf4;
  border: 1px solid #14532d;
  padding: 0.75rem;
}
```