import { describe, expect, it } from 'vitest';
import { formatTaskLabel } from './legacy-format';

describe('formatTaskLabel', () => {
  it('formats priority and owner', () => {
    expect(formatTaskLabel({ priority: 'high', owner: 'student' })).toBe('HIGH · STUDENT');
  });

  it('uses explicit fallbacks for missing task fields', () => {
    expect(formatTaskLabel({ status: 'TODO' })).toBe('NORMAL · SIN-ASIGNAR');
  });

  it('returns a placeholder for missing task data', () => {
    expect(formatTaskLabel(null)).toBe('SIN-DATOS');
  });
});
