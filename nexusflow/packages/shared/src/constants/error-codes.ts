/**
 * 错误码枚举
 *
 * ## 设计目的
 * 为所有微服务提供统一的、机器可读的错误标识。
 * 前端和微服务之间根据 `code` 做业务逻辑判断（而非解析 message 字符串）。
 *
 * ## 错误码分类
 * - **认证/授权** (UNAUTHORIZED → ACCOUNT_LOCKED)：安全相关
 * - **资源错误** (NOT_FOUND → ALREADY_EXISTS)：CRUD 操作的结果
 * - **校验错误** (VALIDATION_ERROR, INVALID_INPUT)：输入参数问题
 * - **Workspace 错误**：多租户隔离相关
 * - **角色错误**：RBAC 相关
 * - **组织错误**：部门/团队结构相关
 * - **SSO 错误**：单点登录集成相关
 * - **访客错误**：外部协作相关
 * - **Chat 错误**：即时通讯相关
 * - **系统错误** (RATE_LIMITED → NOT_IMPLEMENTED)：基础设施相关
 *
 * ## 命名规范
 * - 使用大写蛇形命名（SCREAMING_SNAKE_CASE）
 * - 资源名 + 动词/状态：如 CHANNEL_NOT_FOUND, CHANNEL_ARCHIVED
 * - 不与 HTTP 状态码混用：应用级 code 更语义化
 */
export enum ErrorCode {
  // ─── 认证错误 ───
  /** 未提供认证凭据或凭据无效 */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** 已认证但权限不足 */
  FORBIDDEN = 'FORBIDDEN',
  /** 邮箱/密码不匹配 */
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  /** Access Token 已过期，需 Refresh Token 更新 */
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  /** Refresh Token 被重复使用（token theft 检测） */
  TOKEN_REUSED = 'TOKEN_REUSED',
  /** 需要 MFA 两步验证 */
  MFA_REQUIRED = 'MFA_REQUIRED',
  /** MFA 验证码错误 */
  MFA_INVALID = 'MFA_INVALID',
  /** 用户已注册 MFA，再次尝试注册 */
  MFA_ALREADY_ENROLLED = 'MFA_ALREADY_ENROLLED',
  /** 账户因多次登录失败被锁定（暴力破解防御） */
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',

  // ─── 资源错误 ───
  /** 请求的资源不存在 */
  NOT_FOUND = 'NOT_FOUND',
  /** 资源冲突（如唯一键重复） */
  CONFLICT = 'CONFLICT',
  /** 资源已存在且不允许重复 */
  ALREADY_EXISTS = 'ALREADY_EXISTS',

  // ─── 校验错误 ───
  /** 请求参数校验失败 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 通用非法输入 */
  INVALID_INPUT = 'INVALID_INPUT',

  // ─── Workspace 错误 ───
  /** Workspace 未找到 */
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  /** Workspace 已被停用（欠费或违规） */
  WORKSPACE_SUSPENDED = 'WORKSPACE_SUSPENDED',

  // ─── 角色错误 ───
  /** 角色未找到 */
  ROLE_NOT_FOUND = 'ROLE_NOT_FOUND',
  /** 尝试修改系统保护角色（Owner, Admin 等） */
  ROLE_PROTECTED = 'ROLE_PROTECTED',
  /** 角色继承链中存在循环引用 */
  ROLE_CIRCULAR_INHERITANCE = 'ROLE_CIRCULAR_INHERITANCE',

  // ─── 组织错误 ───
  /** 部门不为空，无法删除 */
  DEPARTMENT_NOT_EMPTY = 'DEPARTMENT_NOT_EMPTY',
  /** 部门父级引用导致循环 */
  CIRCULAR_PARENT = 'CIRCULAR_PARENT',

  // ─── SSO 错误 ───
  /** SSO 配置不存在 */
  SSO_CONFIG_NOT_FOUND = 'SSO_CONFIG_NOT_FOUND',
  /** 第三方 SSO Provider 返回错误 */
  SSO_PROVIDER_ERROR = 'SSO_PROVIDER_ERROR',
  /** 同一域名已绑定其他 SSO 配置 */
  SSO_DOMAIN_CONFLICT = 'SSO_DOMAIN_CONFLICT',

  // ─── 访客错误 ───
  /** 访客邀请已过期 */
  INVITATION_EXPIRED = 'INVITATION_EXPIRED',
  /** 邀请已被接受 */
  INVITATION_ALREADY_ACCEPTED = 'INVITATION_ALREADY_ACCEPTED',
  /** 分享链接已被撤销 */
  SHARE_LINK_REVOKED = 'SHARE_LINK_REVOKED',

  // ─── 策略错误 ───
  /** ABAC 策略评估失败 */
  POLICY_EVALUATION_ERROR = 'POLICY_EVALUATION_ERROR',

  // ─── API Key 错误 ───
  /** 用户创建的 API Key 数量超过上限 */
  API_KEY_LIMIT_EXCEEDED = 'API_KEY_LIMIT_EXCEEDED',

  // ─── Chat 错误 ───
  /** 频道不存在 */
  CHANNEL_NOT_FOUND = 'CHANNEL_NOT_FOUND',
  /** 频道已被归档（只读，不可发消息） */
  CHANNEL_ARCHIVED = 'CHANNEL_ARCHIVED',
  /** 消息不存在 */
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  /** 讨论串已锁定（只读） */
  THREAD_LOCKED = 'THREAD_LOCKED',
  /** 私聊房间不存在 */
  DM_ROOM_NOT_FOUND = 'DM_ROOM_NOT_FOUND',
  /** 重复反应（同一用户对同一消息多次添加相同 emoji） */
  REACTION_CONFLICT = 'REACTION_CONFLICT',
  /** 频道中已有进行中的通话 */
  CALL_IN_PROGRESS = 'CALL_IN_PROGRESS',
  /** 归档策略冲突（如同时设置多个互相矛盾的归档规则） */
  ARCHIVE_POLICY_CONFLICT = 'ARCHIVE_POLICY_CONFLICT',

  // ─── 系统错误 ───
  /** 请求频率超过速率限制 */
  RATE_LIMITED = 'RATE_LIMITED',
  /** 内部服务器错误（未预期异常） */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  /** 服务不可用（维护中或过载） */
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  /** 功能尚未实现 */
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}
