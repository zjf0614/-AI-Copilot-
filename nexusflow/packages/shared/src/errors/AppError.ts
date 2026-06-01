/**
 * 结构化应用异常
 *
 * ## 设计动机
 * 在微服务架构中，错误响应需要统一格式，方便前端统一处理。
 * 每个错误包含：
 * - code：机器可读的错误码（如 UNAUTHORIZED），前端/其他服务根据 code 做逻辑判断
 * - statusCode：HTTP 状态码
 * - message：人类可读的错误描述
 * - details：结构化错误详情（如验证失败的具体字段）
 * - correlationId：请求追踪 ID，串联分布式日志
 *
 * ## 与普通 Error 的区别
 * - Error 只提供 message，不包含 code/statusCode/details
 * - AppError.toJSON() 提供统一的 JSON 序列化格式
 * - 静态工厂方法强制正确的 http 状态码，避免手误（如 303 vs 403）
 *
 * ## 使用示例
 * ```ts
 * // 资源未找到 → 404
 * throw AppError.notFound('User', userId);
 *
 * // 权限不足 → 403
 * throw AppError.forbidden('Only admins can delete workspaces');
 *
 * // 参数校验失败 → 400
 * throw AppError.validation('Invalid email format', { field: 'email' });
 * ```
 */

import { ErrorCode } from '../constants/error-codes.js';

export class AppError extends Error {
  /** 应用级错误码，机器可读 */
  public readonly code: ErrorCode;
  /** HTTP 状态码 */
  public readonly statusCode: number;
  /** 结构化错误详情（验证失败字段、冲突资源等） */
  public readonly details?: unknown;
  /** 分布式追踪 ID，用于在日志系统中串联整个请求链路 */
  public readonly correlationId?: string;

  /**
   * @param code - 应用错误码枚举值
   * @param message - 人类可读的错误描述
   * @param statusCode - HTTP 状态码
   * @param details - 可选的错误详情
   * @param correlationId - 可选的请求追踪 ID
   */
  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    details?: unknown,
    correlationId?: string,
  ) {
    super(message);
    this.name = 'AppError'; // 确保 instanceof 检查时名称正确
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.correlationId = correlationId;
  }

  /**
   * 序列化为标准 JSON 响应格式
   *
   * 所有 API 返回的错误响应都使用此格式：
   * ```json
   * {
   *   "error": {
   *     "code": "NOT_FOUND",
   *     "message": "User with id 'xxx' not found",
   *     "details": { "resource": "User", "id": "xxx" },
   *     "correlationId": "abc-123"
   *   }
   * }
   * ```
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        correlationId: this.correlationId,
      },
    };
  }

  // ==================== 静态工厂方法 ====================
  // 每个工厂方法封装了特定的 HTTP 状态码和错误码，
  // 调用者无需记忆 HTTP 语义，只需调用对应方法。

  /**
   * 资源未找到 (404)
   * @param resource - 资源类型名（如 'User', 'Channel'）
   * @param id - 可选的资源 ID
   */
  static notFound(resource: string, id?: string): AppError {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    return new AppError(ErrorCode.NOT_FOUND, message, 404, { resource, id });
  }

  /**
   * 权限不足 (403)
   * @param message - 可自定义说明（默认 'Insufficient permissions'）
   */
  static forbidden(message = 'Insufficient permissions'): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message, 403);
  }

  /**
   * 未认证 (401)
   * @param message - 可自定义说明（默认 'Authentication required'）
   */
  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message, 401);
  }

  /**
   * 资源冲突 (409)
   * 典型场景：唯一索引冲突——邮箱已占用、slug 已存在等
   * @param message - 冲突描述
   * @param details - 冲突详情
   */
  static conflict(message: string, details?: unknown): AppError {
    return new AppError(ErrorCode.CONFLICT, message, 409, details);
  }

  /**
   * 参数校验失败 (400)
   * @param message - 校验失败的总体描述
   * @param details - 失败的字段和原因（如 Zod 输出的 fieldErrors）
   */
  static validation(message: string, details?: unknown): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }

  /**
   * 服务器内部错误 (500)
   * 用于意外异常——被全局错误处理器捕获后包装为此格式
   * @param message - 可自定义（默认 'Internal server error'）
   */
  static internal(message = 'Internal server error'): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message, 500);
  }
}
