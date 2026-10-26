import '@angular/compiler';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PreferencesService } from './preferences.service';

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

describe('PreferencesService', () => {
  let storage: Storage;
  let service: PreferencesService;

  beforeEach(() => {
    vi.restoreAllMocks();
    storage = createStorage();
    vi.stubGlobal('localStorage', storage);
    service = new PreferencesService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns defaults when no preferences are stored', () => {
    expect(service.load()).toEqual({ theme: 'light', showTips: true, compact: false });
  });

  it('combines saved values with defaults and preserves additional preference values', () => {
    storage.setItem(
      'workshop_preferences',
      JSON.stringify({ compact: true, unsupported: 'ignored', showTips: false })
    );

    expect(service.load()).toEqual({
      theme: 'light',
      showTips: false,
      compact: true,
      unsupported: 'ignored'
    });
  });

  it('uses defaults and reports malformed preference JSON', () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    storage.setItem('workshop_preferences', '{invalid');

    expect(service.load()).toEqual({ theme: 'light', showTips: true, compact: false });
    expect(logError).toHaveBeenCalled();
  });

  it('uses defaults and reports a non-object preference value', () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    storage.setItem('workshop_preferences', '[]');

    expect(service.load()).toEqual({ theme: 'light', showTips: true, compact: false });
    expect(logError).toHaveBeenCalled();
  });

  it('persists the typed preference values', () => {
    const preferences = { theme: 'dark', showTips: false, compact: true };

    service.save(preferences);

    expect(storage.getItem('workshop_preferences')).toBe(JSON.stringify(preferences));
  });
});
