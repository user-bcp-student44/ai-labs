import '@angular/compiler';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

describe('AuthService', () => {
  let http: { post: ReturnType<typeof vi.fn> };
  let sessionService: { startSession: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    vi.restoreAllMocks();
    http = { post: vi.fn() };
    sessionService = { startSession: vi.fn() };
    service = new AuthService(http as never, sessionService as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the characterized login request with its timeout and starts a session', async () => {
    http.post.mockReturnValue(
      of({ token: 'test-token', user: { username: 'student' } })
    );

    const response = await service.login('student', 'Workshop123!');

    expect(http.post).toHaveBeenCalledWith(
      environment.authApiUrl,
      { username: 'student', password: 'Workshop123!', client: 'angular-workshop' },
      { timeout: 5000 }
    );
    expect(sessionService.startSession).toHaveBeenCalledWith('test-token', {
      username: 'student'
    });
    expect(response.token).toBe('test-token');
  });

  it('does not start a session when the response has no token', async () => {
    http.post.mockReturnValue(of({ user: { username: 'student' } }));

    await service.login('student', 'Workshop123!');

    expect(sessionService.startSession).not.toHaveBeenCalled();
  });

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
});
