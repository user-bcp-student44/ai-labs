import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/auth.models';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly http: HttpClient, private readonly sessionService: SessionService) {}

  async login(username: string, password: string): Promise<LoginResponse> {
    const request: LoginRequest = {
      username,
      password,
      client: environment.loginClient
    };
    const response: unknown = await firstValueFrom(
      this.http.post<LoginResponse>(environment.authApiUrl, request, {
        timeout: environment.loginTimeoutMs
      })
    );

    if (typeof response !== 'object' || response === null || Array.isArray(response)) {
      throw new Error('Login response has an invalid shape');
    }

    const loginResponse = response as LoginResponse;
    if (loginResponse.token) {
      this.sessionService.startSession(loginResponse.token, loginResponse.user ?? {});
    }
    return loginResponse;
  }
}
