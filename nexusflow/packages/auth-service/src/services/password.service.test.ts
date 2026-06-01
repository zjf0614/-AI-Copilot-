// Tests for password service utilities
import { describe, it, expect } from 'vitest';
import { validatePasswordStrength, hashPassword, verifyPassword } from './password.service.js';

describe('validatePasswordStrength', () => {
  it('should accept a strong password with default policy', () => {
    const result = validatePasswordStrength('StrongPass1!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject password shorter than default min length (8)', () => {
    const result = validatePasswordStrength('Short1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });

  it('should use custom minLength', () => {
    const policy = { minLength: 12 };
    const result = validatePasswordStrength('Short1!', policy);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 12 characters');
  });

  it('should require uppercase when policy specifies', () => {
    const policy = { requireUppercase: true };
    const result = validatePasswordStrength('nouppercase1!', policy);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('should accept password with uppercase when required', () => {
    const policy = { requireUppercase: true };
    const result = validatePasswordStrength('HasUppercase1!', policy);
    expect(result.valid).toBe(true);
  });

  it('should require lowercase when policy specifies', () => {
    const policy = { requireLowercase: true };
    const result = validatePasswordStrength('NOLOWERCASE1!', policy);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('should require numbers when policy specifies', () => {
    const policy = { requireNumbers: true };
    const result = validatePasswordStrength('NoNumbers!@#', policy);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  it('should require special chars when policy specifies', () => {
    const policy = { requireSpecialChars: true };
    const result = validatePasswordStrength('NoSpecialChars123', policy);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one special character');
  });

  it('should return multiple errors for a weak password', () => {
    const policy = {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    };
    const result = validatePasswordStrength('abc', policy);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.errors).toContain('Password must be at least 12 characters');
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
    expect(result.errors).toContain('Password must contain at least one number');
    expect(result.errors).toContain('Password must contain at least one special character');
  });

  it('should pass all policy checks for a fully compliant password', () => {
    const policy = {
      minLength: 10,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    };
    const result = validatePasswordStrength('Abcdef123!@', policy);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should work with custom minLength only policy', () => {
    const policy = { minLength: 10 };
    const valid = validatePasswordStrength('1234567890', policy);
    expect(valid.valid).toBe(true);
    const invalid = validatePasswordStrength('123456789', policy);
    expect(invalid.valid).toBe(false);
  });

  it('should work with empty/undefined policy', () => {
    const result = validatePasswordStrength('StrongPass1!');
    expect(result.valid).toBe(true);
    const result2 = validatePasswordStrength('StrongPass1!', undefined);
    expect(result2.valid).toBe(true);
  });

  it('should treat absent policy fields as not required', () => {
    const policy = { minLength: 8 };
    // No uppercase, lowercase, numbers, or special chars required
    const result = validatePasswordStrength('abcdefgh', policy);
    expect(result.valid).toBe(true);
  });
});

describe('hashPassword / verifyPassword', () => {
  it('should hash and verify a password', async () => {
    const password = 'mySecretPass123!';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash).toContain('$argon2id$');

    const isValid = await verifyPassword(hash, password);
    expect(isValid).toBe(true);
  });

  it('should reject wrong password', async () => {
    const hash = await hashPassword('correctPassword1');
    const isValid = await verifyPassword(hash, 'wrongPassword1');
    expect(isValid).toBe(false);
  });

  it('should produce different hashes for the same password', async () => {
    const password = 'samePassword1';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
    // Both should verify correctly
    expect(await verifyPassword(hash1, password)).toBe(true);
    expect(await verifyPassword(hash2, password)).toBe(true);
  });

  it('should handle Unicode passwords', async () => {
    const password = '密码Password123!';
    const hash = await hashPassword(password);
    expect(await verifyPassword(hash, password)).toBe(true);
  });

  it('should handle empty passwords', async () => {
    const hash = await hashPassword('');
    expect(await verifyPassword(hash, '')).toBe(true);
    expect(await verifyPassword(hash, 'not-empty')).toBe(false);
  });

  it('should return false on invalid hash format', async () => {
    const isValid = await verifyPassword('not-a-valid-argon2-hash', 'password');
    expect(isValid).toBe(false);
  });
});
