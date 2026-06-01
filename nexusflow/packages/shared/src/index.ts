/**
 * 共享模块统一导出入口（Barrel Export）
 *
 * ## 设计说明
 * 所有微服务通过 `import { ... } from '@nexusflow/shared'` 引用共享模块。
 * 此文件集中管理所有导出，包括：
 * - **类型定义**：DTO 接口、枚举、联合类型（所有 API 契约）
 * - **常量**：权限表、默认角色、错误码
 * - **工具函数**：校验 schema、加密、分页、消毒
 * - **错误类**：AppError
 *
 * ## 如何使用
 * ```ts
 * // 在 auth-service 中：
 * import { loginSchema, AppError, ErrorCode, hashPassword } from '@nexusflow/shared';
 * ```
 *
 * ## 注意
 * - 使用 `.js` 扩展名（ESM 要求显式扩展名）
 * - 所有导出应保持树摇友好（tree-shakeable）
 */

// ─── 类型定义 ───
export * from './types/common.js';      // PaginatedResponse, ApiResponse 等通用类型
export * from './types/auth.js';        // 认证相关 DTO
export * from './types/user.js';        // 用户相关 DTO
export * from './types/workspace.js';   // Workspace 设置类型
export * from './types/org.js';         // 组织架构类型（部门、团队、虚拟组）
export * from './types/role.js';        // 角色和权限类型
export * from './types/sso.js';         // SSO 配置类型
export * from './types/guest.js';       // 访客和邀请类型
export * from './types/audit.js';       // 审计日志类型
export * from './types/policy.js';      // ABAC 策略类型
export * from './types/chat.js';        // 频道、消息、富文本类型
export * from './types/doc.js';         // 文档协作类型
export * from './types/project.js';     // 项目管理类型
export * from './types/workflow.js';    // 工作流类型
export * from './types/ai.js';          // AI 服务类型
export * from './types/notification.js';// 通知服务类型
export * from './types/analytics.js';   // 分析服务类型

// ─── 常量 ───
export * from './constants/permissions.js';     // 权限枚举 PERMISSIONS 和 ALL_PERMISSIONS
export * from './constants/default-roles.js';   // 默认角色定义 DEFAULT_ROLES
export * from './constants/error-codes.js';     // 错误码枚举 ErrorCode

// ─── 错误类 ───
export { AppError } from './errors/AppError.js';

// ─── 工具函数 ───
export * from './utils/validation.js';   // Zod 校验 Schema（login, register, workspace, ...）
export * from './utils/pagination.js';   // 分页助手 buildPagination, getSkipTake
export * from './utils/sanitize.js';     // 输入消毒 escapeHtml, sanitizeText, isValidUuid
export * from './utils/crypto.js';       // AES-256-GCM 加密, SHA-256 令牌哈希
