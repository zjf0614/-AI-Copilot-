/**
 * 分页工具
 *
 * ## 使用模式
 * 所有列表类 API 都应使用统一的分页参数 `{ page, limit }`，
 * 并返回标准的分页元信息 `PaginationMeta`。
 *
 * ## 为什么需要分页
 * - **性能**：避免一次查询/返回海量数据，控制单次请求的负载
 * - **一致性**：所有列表接口使用相同的分页契约，前端可复用分页组件
 * - **安全性**：limit 上限防止恶意请求耗尽数据库资源
 *
 * ## 使用示例
 * ```ts
 * const { skip, take } = getSkipTake({ page: 2, limit: 20 });
 * const [items, total] = await Promise.all([
 *   prisma.user.findMany({ skip, take }),
 *   prisma.user.count(),
 * ]);
 * const meta = buildPagination({ page: 2, limit: 20 }, total);
 * return { items, meta };
 * ```
 */

/**
 * 分页元信息
 *
 * 返回给前端的标准分页结构，方便渲染分页组件
 */
export interface PaginationMeta {
  /** 当前页码（从 1 开始） */
  page: number;
  /** 每页条数 */
  limit: number;
  /** 符合条件的总记录数 */
  total: number;
  /** 总页数 = Math.ceil(total / limit) */
  totalPages: number;
  /** 是否有下一页（page < totalPages） */
  hasNext: boolean;
  /** 是否有上一页（page > 1） */
  hasPrev: boolean;
}

/**
 * 根据查询参数和总数构建分页元信息
 *
 * 安全设计：
 * - page 最小为 1（防止负数/零值导致错误）
 * - limit 限制在 [1, 100] 区间（防止单次查询过多数据）
 * - totalPages = ceil(total / limit)（向上取整，覆盖不足一页的情况）
 *
 * @param query - 原始分页请求参数（可能含不合法值，内部做 clamp）
 * @param total - 总记录条数
 * @returns 标准化的分页元信息
 */
export function buildPagination(query: { page?: number; limit?: number }, total: number): PaginationMeta {
  // 页码至少为 1，默认为 1
  const page = Math.max(1, query.page ?? 1);
  // 每页条数在 [1, 100] 之间，默认为 20
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  // 总页数 = 向上取整（覆盖不足一页的情况）
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,  // 当前页不是最后一页
    hasPrev: page > 1,            // 当前页不是第一页
  };
}

/**
 * 根据分页参数计算数据库查询的 skip/take
 *
 * skip 公式：(page - 1) * limit
 * - 第 1 页 → skip=0
 * - 第 2 页 → skip=limit
 * - 第 3 页 → skip=2*limit
 *
 * @param query - 分页请求参数
 * @returns Prisma 查询所需的 skip 和 take 参数
 */
export function getSkipTake(query: { page?: number; limit?: number }): { skip: number; take: number } {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  return {
    skip: (page - 1) * limit, // 跳过的记录数：第 N 页跳过前 (N-1)*limit 条
    take: limit,                // 查询的记录数
  };
}
