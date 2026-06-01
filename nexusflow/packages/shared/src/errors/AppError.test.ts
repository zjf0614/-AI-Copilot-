// Tests for AppError
import { describe, it, expect } from 'vitest';
import { AppError } from './AppError.js';
import { ErrorCode } from '../constants/error-codes.js';

describe('AppError', () => {
  it('should create an AppError with correct properties', () => {
    const err = new AppError(ErrorCode.NOT_FOUND, 'Resource not found', 404);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe('AppError');
    expect(err.code).toBe(ErrorCode.NOT_FOUND);
    expect(err.message).toBe('Resource not found');
    expect(err.statusCode).toBe(404);
  });

  it('should serialize to JSON correctly', () => {
    const err = new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid input', 400, { field: 'email' }, 'corr-123');
    const json = err.toJSON();
    expect(json).toEqual({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid input',
        details: { field: 'email' },
        correlationId: 'corr-123',
      },
    });
  });

  it('should omit optional fields in JSON when not provided', () => {
    const err = new AppError(ErrorCode.INTERNAL_ERROR, 'Server error', 500);
    const json = err.toJSON();
    expect(json.error.details).toBeUndefined();
    expect(json.error.correlationId).toBeUndefined();
  });
});

describe('AppError static factories', () => {
  describe('notFound', () => {
    it('should create a not found error with id', () => {
      const err = AppError.notFound('User', 'user-123');
      expect(err.code).toBe(ErrorCode.NOT_FOUND);
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe("User with id 'user-123' not found");
      expect(err.details).toEqual({ resource: 'User', id: 'user-123' });
    });

    it('should create a not found error without id', () => {
      const err = AppError.notFound('Users');
      expect(err.message).toBe('Users not found');
      expect(err.details).toEqual({ resource: 'Users', id: undefined });
    });
  });

  describe('forbidden', () => {
    it('should create a forbidden error with default message', () => {
      const err = AppError.forbidden();
      expect(err.code).toBe(ErrorCode.FORBIDDEN);
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe('Insufficient permissions');
    });

    it('should create a forbidden error with custom message', () => {
      const err = AppError.forbidden('Access denied for this resource');
      expect(err.message).toBe('Access denied for this resource');
      expect(err.statusCode).toBe(403);
    });
  });

  describe('unauthorized', () => {
    it('should create an unauthorized error with default message', () => {
      const err = AppError.unauthorized();
      expect(err.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe('Authentication required');
    });

    it('should create an unauthorized error with custom message', () => {
      const err = AppError.unauthorized('Token expired');
      expect(err.message).toBe('Token expired');
      expect(err.statusCode).toBe(401);
    });
  });

  describe('conflict', () => {
    it('should create a conflict error', () => {
      const err = AppError.conflict('Email already exists', { email: 'test@test.com' });
      expect(err.code).toBe(ErrorCode.CONFLICT);
      expect(err.statusCode).toBe(409);
      expect(err.message).toBe('Email already exists');
      expect(err.details).toEqual({ email: 'test@test.com' });
    });
  });

  describe('validation', () => {
    it('should create a validation error', () => {
      const err = AppError.validation('Invalid data', { field: 'email', issue: 'invalid format' });
      expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe('Invalid data');
    });

    it('should create a validation error without details', () => {
      const err = AppError.validation('Invalid data');
      expect(err.statusCode).toBe(400);
      expect(err.details).toBeUndefined();
    });
  });

  describe('internal', () => {
    it('should create an internal error with default message', () => {
      const err = AppError.internal();
      expect(err.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(err.statusCode).toBe(500);
      expect(err.message).toBe('Internal server error');
    });

    it('should create an internal error with custom message', () => {
      const err = AppError.internal('Database connection failed');
      expect(err.statusCode).toBe(500);
      expect(err.message).toBe('Database connection failed');
    });
  });
});
