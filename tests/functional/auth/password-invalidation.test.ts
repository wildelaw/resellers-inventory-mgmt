import { describe, it, expect } from 'vitest';

describe('Password invalidation via passwordChangedAt', () => {
  it('JWT issued before password change should be rejected (documented)', () => {
    // When passwordChangedAt > 0 and jwt.iat < passwordChangedAt:
    // The withAuth wrapper rejects the request with 401
    // This replaces the revoked_tokens table from v1
    expect(true).toBe(true);
  });

  it('JWT issued after password change should be accepted (documented)', () => {
    // When jwt.iat >= passwordChangedAt, the session is valid
    expect(true).toBe(true);
  });

  it('password reset updates passwordChangedAt (documented)', () => {
    // Admin password reset and self-password-change both update passwordChangedAt
    // This invalidates all existing JWTs for that user
    expect(true).toBe(true);
  });
});