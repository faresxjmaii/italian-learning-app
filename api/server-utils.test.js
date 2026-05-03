import { describe, expect, it } from 'vitest';
import { isConfiguredSecret } from './server-utils.js';

describe('server utilities', () => {
  it('accepts real configured secrets only', () => {
    expect(isConfiguredSecret('', 'placeholder')).toBe(false);
    expect(isConfiguredSecret(undefined, 'placeholder')).toBe(false);
    expect(isConfiguredSecret('placeholder', 'placeholder')).toBe(false);
    expect(isConfiguredSecret('real-secret', 'placeholder')).toBe(true);
  });
});
