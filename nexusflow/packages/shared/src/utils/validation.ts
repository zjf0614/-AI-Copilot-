/**
 * Zod 校验 Schema — 所有 API 请求的输入校验
 *
 * ## 为什么用 Zod？
 * - **类型安全**：Schema 自动推导 TypeScript 类型，无需手动维护类型和校验代码
 * - **声明式**：链式 API 清晰表达校验规则（.email().min().max().regex()）
 * - **错误扁平化**：`.flatten()` 输出友好格式 `{ fieldErrors: { email: ['Invalid email'] } }`
 * - **数据转换**：`.toLowerCase()` / `.coerce.number()` 在解析时自动转换
 *
 * ## Schema 分类
 * - **Auth**：login, register, changePassword, forgot/reset password
 * - **MFA**：verify, challenge
 * - **Workspace**：create, update
 * - **User**：update profile
 * - **Role**：create, update, assign
 * - **Organization**：department, team, virtual group
 * - **Guest**：invitation, accept
 * - **Share Link**：create
 * - **SSO**：config (OIDC + SAML)
 * - **Policy**：ABAC 策略
 * - **Audit**：查询过滤
 * - **Pagination**：通用分页
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// Auth Schemas
// ═══════════════════════════════════════════════════════════════

/** 登录 — 邮箱 + 密码 + Workspace slug */
export const loginSchema = z.object({
  email: z.string().email().max(320).toLowerCase(),
  password: z.string().min(1).max(128),
  workspaceSlug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

/** 注册 — 同时创建 Workspace + 管理员用户 */
export const registerSchema = z.object({
  email: z.string().email().max(320).toLowerCase(),
  password: z.string().min(8).max(128),      // 最少 8 位
  displayName: z.string().min(1).max(255),
  workspaceSlug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  workspaceName: z.string().min(1).max(255),
});

/** 修改密码 — 需要当前密码 + 新密码 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

/** 忘记密码 — 发送重置邮件 */
export const forgotPasswordSchema = z.object({
  email: z.string().email().max(320).toLowerCase(),
  workspaceSlug: z.string().min(1).max(64),
});

/** 重置密码 — 使用邮件中的 token */
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

// ═══════════════════════════════════════════════════════════════
// MFA Schemas
// ═══════════════════════════════════════════════════════════════

/** MFA 注册 — 用户输入 6 位 TOTP 验证码完成注册 */
export const mfaVerifySchema = z.object({
  totpCode: z.string().length(6).regex(/^\d+$/),  // 必须是 6 位纯数字
});

/** MFA 挑战 — 密码登录后验证 MFA */
export const mfaChallengeSchema = z.object({
  mfaToken: z.string().min(1),       // 密码登录成功后返回的中间 token
  totpCode: z.string().length(6).regex(/^\d+$/),
});

// ═══════════════════════════════════════════════════════════════
// Workspace Schemas
// ═══════════════════════════════════════════════════════════════

/** 创建 Workspace */
export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  planTier: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional(),
});

/** 更新 Workspace 设置 */
export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  planTier: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional(),
  settings: z.object({
    mfaRequired: z.boolean().optional(),
    sessionTimeoutMinutes: z.number().int().min(5).optional(),
    idleTimeoutMinutes: z.number().int().min(1).optional(),
  }).optional(),
});

// ═══════════════════════════════════════════════════════════════
// User Schemas
// ═══════════════════════════════════════════════════════════════

/** 更新用户信息 */
export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
  jobTitle: z.string().max(255).nullable().optional(),
  location: z.string().max(255).nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

// ═══════════════════════════════════════════════════════════════
// Role Schemas
// ═══════════════════════════════════════════════════════════════

/** 创建自定义角色 */
export const createRoleSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(1000).optional(),
  permissions: z.array(z.string()).min(1),         // 至少一个权限
  inheritsFrom: z.string().uuid().optional(),      // 继承的角色 ID
  priority: z.number().int().min(0).max(100).optional(),
});

/** 更新角色 */
export const updateRoleSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(1000).nullable().optional(),
  permissions: z.array(z.string()).min(1).optional(),
  inheritsFrom: z.string().uuid().nullable().optional(),
  priority: z.number().int().min(0).max(100).optional(),
});

/** 为用户分配角色 */
export const assignRoleSchema = z.object({
  roleId: z.string().uuid(),
  scopeType: z.enum(['WORKSPACE', 'DEPARTMENT', 'TEAM']).optional(),
  scopeId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),     // 临时权限过期时间
});

// ═══════════════════════════════════════════════════════════════
// Department Schemas
// ═══════════════════════════════════════════════════════════════

/** 创建部门 */
export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  parentId: z.string().uuid().optional(),
  headUserId: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  headUserId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const addDepartmentMemberSchema = z.object({
  userId: z.string().uuid(),
  isPrimary: z.boolean().optional(),               // 是否主部门
});

// ═══════════════════════════════════════════════════════════════
// Team Schemas
// ═══════════════════════════════════════════════════════════════

export const createTeamSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  departmentId: z.string().uuid().optional(),
  leadUserId: z.string().uuid().optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  leadUserId: z.string().uuid().nullable().optional(),
});

export const addTeamMemberSchema = z.object({
  userId: z.string().uuid(),
  roleInTeam: z.enum(['LEAD', 'MEMBER']).optional(),
});

// ═══════════════════════════════════════════════════════════════
// Virtual Group Schemas — 基于属性规则的动态用户分组
// ═══════════════════════════════════════════════════════════════

/** 属性条件 — 对单个用户属性进行比较 */
const attributeRuleSchema: z.ZodType<any> = z.object({
  attribute: z.string(),
  operator: z.enum(['eq', 'neq', 'contains', 'not_contains', 'in', 'not_in', 'gt', 'lt', 'gte', 'lte', 'regex']),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});

/** 虚拟组规则 — 递归类型，使用 z.lazy 避免循环引用 */
const virtualGroupRuleSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    operator: z.enum(['AND', 'OR', 'NOT']),
    conditions: z.array(z.union([attributeRuleSchema, virtualGroupRuleSchema])),
  })
);

export const createVirtualGroupSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  rule: virtualGroupRuleSchema,                    // 递归逻辑表达式
});

export const updateVirtualGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  rule: virtualGroupRuleSchema.optional(),
});

export const addVGroupMemberSchema = z.object({
  userId: z.string().uuid(),
});

// ═══════════════════════════════════════════════════════════════
// Guest Schemas
// ═══════════════════════════════════════════════════════════════

/** 创建访客邀请 */
export const createGuestInvitationSchema = z.object({
  email: z.string().email().max(320).toLowerCase(),
  roleId: z.string().uuid(),
  message: z.string().max(2000).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(), // 默认 7 天
});

/** 接受邀请 — 访客注册 */
export const acceptInvitationSchema = z.object({
  invitationToken: z.string().uuid(),
  displayName: z.string().min(1).max(255),
  password: z.string().min(8).max(128),
});

// ═══════════════════════════════════════════════════════════════
// Share Link Schemas
// ═══════════════════════════════════════════════════════════════

/** 创建分享链接 — 将资源安全分享给外部 */
export const createShareLinkSchema = z.object({
  resourceType: z.string().min(1).max(64),
  resourceId: z.string().uuid(),
  permissions: z.array(z.string()).optional(),
  password: z.string().min(4).max(128).optional(),
  maxAccesses: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
});

// ═══════════════════════════════════════════════════════════════
// SSO Schemas — 单点登录配置
// ═══════════════════════════════════════════════════════════════

export const createSsoConfigSchema = z.object({
  provider: z.enum(['OKTA', 'AZURE_AD', 'GOOGLE_WORKSPACE', 'GENERIC_OIDC', 'GENERIC_SAML']),
  isEnabled: z.boolean().optional(),
  domain: z.string().max(255).optional(),
  metadataUrl: z.string().url().max(2048).optional(),
  /** 根据 provider 类型选择 OIDC 或 SAML 配置 */
  config: z.union([
    z.object({
      clientId: z.string().min(1),
      clientSecret: z.string().min(1),             // ⚠️ 敏感字段，加密存储
      issuerUrl: z.string().url(),
      scopes: z.array(z.string()).optional(),
    }),
    z.object({
      entryPoint: z.string().url(),
      cert: z.string().min(1),                     // ⚠️ SAML 证书，加密存储
      issuer: z.string().min(1),
      audience: z.string().min(1),
      nameIdFormat: z.string().optional(),
    }),
  ]),
});

// ═══════════════════════════════════════════════════════════════
// ABAC Policy Schemas — 基于属性的访问控制
// ═══════════════════════════════════════════════════════════════

/** 策略条件 — 递归类型，支持 AND/OR/NOT 嵌套 */
const policyConditionSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    operator: z.enum(['AND', 'OR', 'NOT']),
    conditions: z.array(
      z.union([
        z.object({
          attribute: z.string(),
          operator: z.enum(['eq', 'neq', 'contains', 'not_contains', 'in', 'not_in', 'gt', 'lt', 'gte', 'lte', 'regex', 'cidr']),
          value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
        }),
        policyConditionSchema,                      // 递归：子条件可以是另一个策略条件
      ])
    ),
  })
);

export const createPolicySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  priority: z.number().int().min(0).optional(),
  effect: z.enum(['ALLOW', 'DENY']),               // 策略效果
  conditions: policyConditionSchema,                // 递归逻辑表达式
  actions: z.array(z.string()).min(1),              // 策略适用的操作
  resources: z.array(z.string()).optional(),         // 策略适用的资源
});

export const updatePolicySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  priority: z.number().int().min(0).optional(),
  effect: z.enum(['ALLOW', 'DENY']).optional(),
  conditions: policyConditionSchema.optional(),
  actions: z.array(z.string()).min(1).optional(),
  resources: z.array(z.string()).optional(),
  isEnabled: z.boolean().optional(),
});

// ═══════════════════════════════════════════════════════════════
// Audit & Pagination Schemas
// ═══════════════════════════════════════════════════════════════

/** 审计日志查询过滤 */
export const auditQuerySchema = z.object({
  actorId: z.string().uuid().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  complianceTags: z.array(z.string()).optional(),
  search: z.string().max(500).optional(),            // 全文搜索
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  sort: z.enum(['asc', 'desc']).optional().default('desc'),
});

/** 通用分页参数 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
