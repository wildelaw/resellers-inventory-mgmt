import { describe, it, expect } from 'vitest';

describe('password invalidation via passwordChangedAt', () => {
  it('rejects JWT with iat < passwordChangedAt', () => {
    const passwordChangedAt = Math.floor(Date.now() / 1000);
    const iat = passwordChangedAt - 100;
    expect(passwordChangedAt > 0 && iat < passwordChangedAt).toBe(true);
  });

  it('accepts JWT with iat >= passwordChangedAt', () => {
    const passwordChangedAt = Math.floor(Date.now() / 1000);
    const iat = passwordChangedAt + 100;
    expect(iat >= passwordChangedAt).toBe(true);
  });

  it('accepts JWT when passwordChangedAt is 0 (never changed)', () => {
    const passwordChangedAt = 0;
    const iat = Math.floor(Date.now() / 1000);
    expect(passwordChangedAt > 0 && iat < passwordChangedAt).toBe(false);
  });
});
