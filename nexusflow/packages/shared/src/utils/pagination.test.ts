// Tests for pagination utilities
import { describe, it, expect } from 'vitest';
import { buildPagination, getSkipTake } from './pagination.js';

describe('buildPagination', () => {
  it('should build pagination meta for first page', () => {
    const meta = buildPagination({ page: 1, limit: 20 }, 100);
    expect(meta).toEqual({
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasNext: true,
      hasPrev: false,
    });
  });

  it('should build pagination meta for middle page', () => {
    const meta = buildPagination({ page: 3, limit: 20 }, 100);
    expect(meta.page).toBe(3);
    expect(meta.totalPages).toBe(5);
    expect(meta.hasNext).toBe(true);
    expect(meta.hasPrev).toBe(true);
  });

  it('should build pagination meta for last page', () => {
    const meta = buildPagination({ page: 5, limit: 20 }, 100);
    expect(meta.page).toBe(5);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(true);
  });

  it('should use defaults when no query params provided', () => {
    const meta = buildPagination({}, 10);
    expect(meta.page).toBe(1);
    expect(meta.limit).toBe(20);
    expect(meta.totalPages).toBe(1);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
  });

  it('should handle undefined page and limit', () => {
    const meta = buildPagination({}, 100);
    expect(meta.page).toBe(1);
    expect(meta.limit).toBe(20);
  });

  it('should clamp page to minimum 1', () => {
    const meta = buildPagination({ page: 0, limit: 20 }, 100);
    expect(meta.page).toBe(1);
  });

  it('should clamp page to minimum 1 for negative values', () => {
    const meta = buildPagination({ page: -5, limit: 20 }, 100);
    expect(meta.page).toBe(1);
  });

  it('should clamp limit to maximum 100', () => {
    const meta = buildPagination({ page: 1, limit: 500 }, 100);
    expect(meta.limit).toBe(100);
  });

  it('should clamp limit to minimum 1', () => {
    const meta = buildPagination({ page: 1, limit: 0 }, 100);
    expect(meta.limit).toBe(1);
  });

  it('should handle zero total', () => {
    const meta = buildPagination({ page: 1, limit: 20 }, 0);
    expect(meta.total).toBe(0);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
  });

  it('should calculate totalPages correctly with uneven division', () => {
    const meta = buildPagination({ page: 1, limit: 20 }, 45);
    expect(meta.totalPages).toBe(3); // ceil(45/20) = 3
  });
});

describe('getSkipTake', () => {
  it('should calculate skip and take for first page', () => {
    expect(getSkipTake({ page: 1, limit: 20 })).toEqual({ skip: 0, take: 20 });
  });

  it('should calculate skip and take for later pages', () => {
    expect(getSkipTake({ page: 2, limit: 20 })).toEqual({ skip: 20, take: 20 });
    expect(getSkipTake({ page: 3, limit: 10 })).toEqual({ skip: 20, take: 10 });
  });

  it('should use defaults', () => {
    expect(getSkipTake({})).toEqual({ skip: 0, take: 20 });
  });

  it('should handle undefined values', () => {
    expect(getSkipTake({})).toEqual({ skip: 0, take: 20 });
  });
});
