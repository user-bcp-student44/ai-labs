import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginComponent } from './login.component';
import { AuthService } from '../services/auth.service';
import { PreferencesService } from '../services/preferences.service';

function createStorage(): Storage {
  const entries = new Map<string, string>();

  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => Array.from(entries.keys())[index] ?? null,
    removeItem: (key) => entries.delete(key),
    setItem: (key, value) => entries.set(key, String(value))
  };
}

describe('LoginComponent', () => {
  let storage: Storage;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let authService: { login: ReturnType<typeof vi.fn> };
  let preferencesService: PreferencesService;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('localStorage', createStorage());
    storage = localStorage;
    router = { navigate: vi.fn().mockResolvedValue(true) };
    authService = { login: vi.fn() };
    preferencesService = new PreferencesService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createComponent(): LoginComponent {
    return new LoginComponent(router as never, authService as never, preferencesService);
  }

  it('loads saved preferences over the defaults', () => {
    storage.setItem('workshop_preferences', JSON.stringify({ compact: true }));

    const component = createComponent();

    expect(component.preferences).toEqual({
      theme: 'light',
      showTips: true,
      compact: true
    });
  });

  it('rejects a blank username without calling the authentication service', async () => {
    const component = createComponent();

    await component.login();

    expect(component.message).toBe('Ingrese un usuario.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('rejects a blank password without calling the authentication service', async () => {
    const component = createComponent();
    component.username = 'student';

    await component.login();

    expect(component.message).toBe('Ingrese una contraseña.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('authenticates, saves preferences, and navigates to dashboard', async () => {
    storage.setItem('workshop_preferences', JSON.stringify({ compact: true }));
    authService.login.mockResolvedValue({ token: 'test-token', user: { username: 'student' } });
    const component = createComponent();
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(authService.login).toHaveBeenCalledWith('student', 'Workshop123!');
    expect(storage.getItem('workshop_preferences')).toBe(
      JSON.stringify({ theme: 'light', showTips: true, compact: true })
    );
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.busy).toBe(false);
  });

  it('reports a response without a token and does not navigate', async () => {
    authService.login.mockResolvedValue({ user: { username: 'student' } });
    const component = createComponent();
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(component.message).toBe('El backend respondió sin token.');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.busy).toBe(false);
  });

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

  it('shows a generic message when the login response has an invalid shape', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    authService.login.mockRejectedValue(new Error('Login response has an invalid shape'));
    const component = createComponent();
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(component.message).toBe(
      'No se pudo autenticar. Verifica tus credenciales e inténtalo de nuevo.'
    );
    expect(component.message).not.toContain('invalid shape');
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

  it('renders the dynamic message using text interpolation only', () => {
    const template = readFileSync('src/app/login/login.component.html', 'utf8');

    expect(template).toContain('{{ message }}');
    expect(template).not.toContain('[innerHTML]');
  });
});
