/**
 * 通用共享类型：分页、API 响应、排序
 *
 * ## 设计原则
 * 所有 API 返回都使用统一的 ApiResponse<T> 格式包装，
 * 分页列表使用 PaginatedResponse<T>，保证前端可复用处理逻辑。
 */

/**
 * 分页请求参数
 * 所有列表 API 都接受这两个可选查询参数
 */
export interface PaginationParams {
  /** 页码，从 1 开始，默认 1 */
  page?: number;
  /** 每页条数，默认 20，上限 100 */
  limit?: number;
}

/**
 * 分页响应 — 列表 API 的标准返回格式
 *
 * @example
 * ```json
 * {
 *   "data": [...],
 *   "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5, "hasNext": true, "hasPrev": false }
 * }
 * ```
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    /** 符合条件的总记录数 */
    total: number;
    /** 总页数 = ceil(total / limit) */
    totalPages: number;
    /** 是否有下一页 */
    hasNext: boolean;
    /** 是否有上一页 */
    hasPrev: boolean;
  };
}

/**
 * 标准 API 响应包装
 *
 * 所有非分页 API 返回此格式。
 * success=true 时 data 有值，success=false 时 error 有值。
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    /** 机器可读错误码，如 'NOT_FOUND' */
    code: string;
    /** 人类可读错误描述 */
    message: string;
    /** 结构化错误详情（验证失败字段等） */
    details?: unknown;
    /** 分布式追踪 ID */
    correlationId?: string;
  };
}

/** 排序方向 */
export type SortOrder = 'asc' | 'desc';

/** 排序参数 */
export interface SortParams {
  /** 排序字段名 */
  sort?: string;
  /** 排序方向 */
  order?: SortOrder;
}
