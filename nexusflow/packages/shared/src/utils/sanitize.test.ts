// Tests for sanitize utilities
import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeText, sanitizeEmail, isValidUuid } from './sanitize.js';

describe('escapeHtml', () => {
  it('should escape & to &amp;', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('should escape < to &lt;', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b');
  });

  it('should escape > to &gt;', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('should escape " to &quot;', () => {
    expect(escapeHtml('a "b" c')).toBe('a &quot;b&quot; c');
  });

  it("should escape ' to &#x27;", () => {
    expect(escapeHtml("a 'b' c")).toBe('a &#x27;b&#x27; c');
  });

  it('should escape all special chars in one string', () => {
    const input = '<script>alert("XSS & \'attack\'")</script>';
    const escaped = escapeHtml(input);
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
    expect(escaped).toContain('&lt;');
    expect(escaped).toContain('&gt;');
    expect(escaped).toContain('&amp;');
    expect(escaped).toContain('&quot;');
    expect(escaped).toContain('&#x27;');
  });

  it('should not modify strings without special chars', () => {
    const input = 'Hello, World!';
    expect(escapeHtml(input)).toBe(input);
  });

  it('should handle empty strings', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('sanitizeText', () => {
  it('should trim whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('should strip control characters', () => {
    const input = 'hello\x00world\x1F!';
    const result = sanitizeText(input);
    expect(result).toBe('helloworld!');
  });

  it('should keep normal text unchanged', () => {
    expect(sanitizeText('Hello, World!')).toBe('Hello, World!');
  });

  it('should handle empty string', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('should handle strings with only control chars', () => {
    expect(sanitizeText('\x00\x01\x02')).toBe('');
  });

  it('should keep newlines (0x0A) and carriage returns (0x0D)', () => {
    const text = 'line1\nline2\r\nline3';
    expect(sanitizeText(text)).toBe(text);
  });

  it('should keep tabs (0x09)', () => {
    expect(sanitizeText('\thello\t')).toBe('hello');
  });
});

describe('sanitizeEmail', () => {
  it('should trim and lowercase', () => {
    expect(sanitizeEmail('  User@Example.COM  ')).toBe('user@example.com');
  });

  it('should handle already sanitized email', () => {
    expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
  });

  it('should handle empty string', () => {
    expect(sanitizeEmail('')).toBe('');
  });
});

describe('isValidUuid', () => {
  it('should accept valid UUID v4', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should accept uppercase UUID', () => {
    expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('should reject invalid UUID', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isValidUuid('gggggggg-gggg-gggg-gggg-gggggggggggg')).toBe(false);
    expect(isValidUuid('550e8400-e29b-41d4-a716-4466554400000')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidUuid('')).toBe(false);
  });
});
