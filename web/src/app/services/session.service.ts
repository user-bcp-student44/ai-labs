import { Injectable } from '@angular/core';
import { AuthenticatedUser, UserSession } from '../models/auth.models';

const TOKEN_KEY = 'workshop_token';
const USER_KEY = 'workshop_user';

@Injectable({ providedIn: 'root' })
export class SessionService {
  startSession(token: string, user: AuthenticatedUser): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  readSession(): UserSession | null {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      this.clearSession();
      return null;
    }

    const storedUser = sessionStorage.getItem(USER_KEY);
    if (!storedUser) {
      return { token, user: {} };
    }

    try {
      const user: unknown = JSON.parse(storedUser);
      if (!isAuthenticatedUser(user)) {
        throw new Error('Stored session user has an invalid shape');
      }
      return { token, user };
    } catch (error: unknown) {
      console.error('Session could not be restored', error);
      this.clearSession();
      return null;
    }
  }

  clearSession(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const user = value as Record<string, unknown>;
  return (
    (user.username === undefined || typeof user.username === 'string') &&
    (user.displayName === undefined || typeof user.displayName === 'string')
  );
}
