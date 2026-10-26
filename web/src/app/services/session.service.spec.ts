import '@angular/compiler';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from './session.service';

function createStorage(initialValues: Record<string, string> = {}): Storage {
  const entries = new Map(Object.entries(initialValues));

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

describe('SessionService', () => {
  let localStorageMock: Storage;
  let sessionStorageMock: Storage;
  let service: SessionService;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorageMock = createStorage({
      workshop_token: 'legacy-token',
      workshop_user: JSON.stringify({ username: 'legacy-user' }),
      workshop_preferences: JSON.stringify({ compact: true })
    });
    sessionStorageMock = createStorage();
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('sessionStorage', sessionStorageMock);
    service = new SessionService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores the token and user in session storage and removes legacy local entries', () => {
    service.startSession('test-token', { username: 'student' });

    expect(sessionStorageMock.getItem('workshop_token')).toBe('test-token');
    expect(sessionStorageMock.getItem('workshop_user')).toBe(JSON.stringify({ username: 'student' }));
    expect(localStorageMock.getItem('workshop_token')).toBeNull();
    expect(localStorageMock.getItem('workshop_user')).toBeNull();
    expect(localStorageMock.getItem('workshop_preferences')).not.toBeNull();
  });

  it('restores the current tab session', () => {
    service.startSession('test-token', { username: 'student', displayName: 'Student' });

    expect(service.readSession()).toEqual({
      token: 'test-token',
      user: { username: 'student', displayName: 'Student' }
    });
  });

  it('returns no session and clears stale local session values without a session token', () => {
    const sessionWithoutToken = service.readSession();

    expect(sessionWithoutToken).toBeNull();
    expect(localStorageMock.getItem('workshop_token')).toBeNull();
    expect(localStorageMock.getItem('workshop_user')).toBeNull();
  });

  it('clears invalid stored session data and reports the parsing error', () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    sessionStorageMock.setItem('workshop_token', 'test-token');
    sessionStorageMock.setItem('workshop_user', '{invalid');

    expect(service.readSession()).toBeNull();
    expect(sessionStorageMock.getItem('workshop_token')).toBeNull();
    expect(logError).toHaveBeenCalled();
  });

  it('rejects a stored user with an invalid shape', () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    sessionStorageMock.setItem('workshop_token', 'test-token');
    sessionStorageMock.setItem('workshop_user', JSON.stringify({ username: 42 }));

    expect(service.readSession()).toBeNull();
    expect(logError).toHaveBeenCalled();
  });

  it('clears both session stores without deleting preferences', () => {
    service.startSession('test-token', { username: 'student' });

    service.clearSession();

    expect(sessionStorageMock.getItem('workshop_token')).toBeNull();
    expect(sessionStorageMock.getItem('workshop_user')).toBeNull();
    expect(localStorageMock.getItem('workshop_token')).toBeNull();
    expect(localStorageMock.getItem('workshop_user')).toBeNull();
    expect(localStorageMock.getItem('workshop_preferences')).not.toBeNull();
  });
});
