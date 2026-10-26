import { Injectable } from '@angular/core';
import { Preferences } from '../models/preferences.model';

const PREFERENCES_KEY = 'workshop_preferences';
const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  showTips: true,
  compact: false
};

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  load(): Preferences {
    const storedPreferences = localStorage.getItem(PREFERENCES_KEY);
    if (!storedPreferences) {
      return { ...DEFAULT_PREFERENCES };
    }

    try {
      const preferences: unknown = JSON.parse(storedPreferences);
      if (typeof preferences !== 'object' || preferences === null || Array.isArray(preferences)) {
        throw new Error('Stored preferences have an invalid shape');
      }

      const values = preferences as Record<string, unknown>;
      return {
        ...DEFAULT_PREFERENCES,
        ...values,
        theme: typeof values.theme === 'string' ? values.theme : DEFAULT_PREFERENCES.theme,
        showTips: typeof values.showTips === 'boolean' ? values.showTips : DEFAULT_PREFERENCES.showTips,
        compact: typeof values.compact === 'boolean' ? values.compact : DEFAULT_PREFERENCES.compact
      };
    } catch (error: unknown) {
      console.error('Preferences could not be loaded', error);
      return { ...DEFAULT_PREFERENCES };
    }
  }

  save(preferences: Preferences): void {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }
}
