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