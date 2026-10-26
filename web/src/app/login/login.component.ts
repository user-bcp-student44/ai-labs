import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PreferencesService } from '../services/preferences.service';
import { Preferences } from '../models/preferences.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  busy = false;
  message = '';
  preferences: Preferences;

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly preferencesService: PreferencesService
  ) {
    this.preferences = this.preferencesService.load();
  }

  async login(): Promise<void> {
    this.message = '';
    if (!this.username.trim()) {
      this.message = 'Ingrese un usuario.';
      return;
    }
    if (!this.password.trim()) {
      this.message = 'Ingrese una contraseña.';
      return;
    }

    this.busy = true;
    try {
      const response = await this.authService.login(this.username, this.password);
      if (!response.token) {
        this.message = 'El backend respondió sin token.';
        return;
      }
      this.preferencesService.save(this.preferences);
      await this.router.navigate(['/dashboard']);
    } catch (error: unknown) {
      console.error('Authentication request failed', error);
      this.message = 'No se pudo autenticar. Verifica tus credenciales e inténtalo de nuevo.';
    } finally {
      this.busy = false;
    }
  }
}
