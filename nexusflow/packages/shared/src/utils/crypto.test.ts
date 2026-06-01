// Tests for shared crypto utilities
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, generateSecureToken, hashToken } from './crypto.js';

describe('encrypt / decrypt', () => {
  // 64 hex chars = 32 bytes
  const key = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2';

  it('should encrypt and decrypt a plaintext string', () => {
    const plaintext = 'Hello, World!';
    const encrypted = encrypt(plaintext, key);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(':');

    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it('should encrypt and decrypt empty strings', () => {
    const encrypted = encrypt('', key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe('');
  });

  it('should encrypt and decrypt Unicode text', () => {
    const plaintext = '你好世界 🌍 émoji café';
    const encrypted = encrypt(plaintext, key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it('should encrypt and decrypt long text', () => {
    const plaintext = 'x'.repeat(10000);
    const encrypted = encrypt(plaintext, key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertext for same plaintext (random IV)', () => {
    const plaintext = 'same message';
    const enc1 = encrypt(plaintext, key);
    const enc2 = encrypt(plaintext, key);
    expect(enc1).not.toBe(enc2);
    // Both should decrypt correctly
    expect(decrypt(enc1, key)).toBe(plaintext);
    expect(decrypt(enc2, key)).toBe(plaintext);
  });

  it('should throw on malformed encrypted data', () => {
    expect(() => decrypt('not-valid-format', key)).toThrow('Invalid encrypted data format');
    expect(() => decrypt('too:many:parts:here', key)).toThrow('Invalid encrypted data format');
  });

  it('should throw on decryption with wrong key', () => {
    const wrongKey = 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3';
    const encrypted = encrypt('secret', key);
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });
});

describe('generateSecureToken', () => {
  it('should generate a hex token of default length (64 hex chars = 32 bytes)', () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]+$/i.test(token)).toBe(true);
  });

  it('should generate tokens of specified length', () => {
    expect(generateSecureToken(16)).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(generateSecureToken(8)).toHaveLength(16);
    expect(generateSecureToken(1)).toHaveLength(2);
  });

  it('should generate unique tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateSecureToken()));
    expect(tokens.size).toBe(100);
  });
});

describe('hashToken', () => {
  it('should produce a 64-char hex SHA-256 hash', () => {
    const hash = hashToken('my-token');
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/i.test(hash)).toBe(true);
  });

  it('should produce deterministic hashes', () => {
    const token = 'deterministic-token';
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('should produce different hashes for different inputs', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
  });

  it('should hash empty strings', () => {
    const hash = hashToken('');
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/i.test(hash)).toBe(true);
  });
});
