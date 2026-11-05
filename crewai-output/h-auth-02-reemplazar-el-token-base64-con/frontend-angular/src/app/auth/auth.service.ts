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