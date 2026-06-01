/**
 * ABAC（基于属性的访问控制）策略类型定义
 *
 * ## ABAC vs RBAC
 * - **RBAC**（角色）：用户→角色→权限，静态分配
 * - **ABAC**（属性）：用户属性 + 资源属性 + 环境属性 → 动态决策
 *
 * ABAC 在 RBAC 之上提供更细粒度的控制，例如：
 * - "仅在工作时间(9:00-17:00)允许访问"
 * - "仅在公司 IP 范围内允许下载"
 * - "敏感文档需要 MFA 验证"
 *
 * ## 策略评估流程
 * 1. RBAC 检查 → 通过则继续
 * 2. ABAC 策略按 priority 降序评估
 * 3. 第一个匹配的 DENY → 立即拒绝
 * 4. 所有 ALLOW 不冲突 → 允许
 * 5. 无匹配策略 → RBAC 结果为准
 *
 * ## PolicyCondition 递归结构
 * 支持 AND/OR/NOT 嵌套，可构建复杂的逻辑表达式。
 * 叶子节点是 AttributeCondition（单个属性比较）。
 */

export type PolicyEffect = 'ALLOW' | 'DENY';

export interface AbacPolicy {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  /** 优先级 — 数值越高越先评估 */
  priority: number;
  effect: PolicyEffect;
  /** 策略条件（递归逻辑表达式） */
  conditions: PolicyCondition;
  /** 策略适用的操作 */
  actions: string[];
  /** 策略适用的资源（空数组 = 所有资源） */
  resources: string[];
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 策略条件 — 递归逻辑表达式 */
export interface PolicyCondition {
  /** 逻辑运算符 */
  operator: 'AND' | 'OR' | 'NOT';
  /** 子条件 — 可以是属性条件或嵌套策略条件 */
  conditions: (PolicyCondition | AttributeCondition)[];
}

/** 属性条件 — 对单个属性进行比较 */
export interface AttributeCondition {
  /** 属性名（来自 AttributeSource） */
  attribute: string;
  /** 比较运算符（cidr 用于 IP 范围匹配） */
  operator: 'eq' | 'neq' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'gt' | 'lt' | 'gte' | 'lte' | 'regex' | 'cidr';
  value: string | number | boolean | string[];
}

/** 可用属性源 — 用户、资源、环境三类属性 */
export type AttributeSource =
  // 用户属性
  | 'user.id' | 'user.email' | 'user.job_title' | 'user.location'
  | 'user.department_id' | 'user.is_guest' | 'user.mfa_verified'
  // 资源属性
  | 'resource.type' | 'resource.id' | 'resource.sensitivity'
  // 环境属性
  | 'env.time' | 'env.day_of_week' | 'env.ip_address' | 'env.ip_range';

/** 策略评估上下文 — 包含当前请求的所有相关属性 */
export interface PolicyEvaluationContext {
  user: {
    id: string;
    email: string;
    jobTitle: string | null;
    location: string | null;
    departmentId: string | null;
    isGuest: boolean;
    mfaVerified: boolean;
  };
  resource: {
    type: string;
    id: string;
    sensitivity?: string;
    metadata: Record<string, unknown>;
  };
  environment: {
    time: Date;
    dayOfWeek: string;
    ipAddress: string;
  };
}

/** 策略评估结果 */
export interface PolicyEvaluationResult {
  /** 是否允许 */
  allowed: boolean;
  /** 匹配的策略 ID（用于审计日志） */
  matchedPolicyId?: string;
  matchedPolicyName?: string;
  /** 决策原因 */
  reason: 'RBAC_GRANTED' | 'ABAC_ALLOW' | 'ABAC_DENY' | 'RBAC_DENIED';
}

export interface CreatePolicyInput {
  name: string;
  description?: string;
  priority?: number;
  effect: PolicyEffect;
  conditions: PolicyCondition;
  actions: string[];
  resources?: string[];
}

export interface UpdatePolicyInput {
  name?: string;
  description?: string;
  priority?: number;
  effect?: PolicyEffect;
  conditions?: PolicyCondition;
  actions?: string[];
  resources?: string[];
  isEnabled?: boolean;
}
