/**
 * SSO（单点登录）配置类型
 *
 * ## 支持的 SSO 提供商
 * - **OKTA / AZURE_AD / GOOGLE_WORKSPACE**：预置集成
 * - **GENERIC_OIDC**：任意支持 OpenID Connect 的身份提供商
 * - **GENERIC_SAML**：任意支持 SAML 2.0 的身份提供商
 *
 * ## SSO 登录流程
 * 1. 用户访问登录页，输入 Workspace slug
 * 2. 系统检查该 Workspace 是否配置了 SSO
 * 3. 如果有 SSO 且 domain 匹配 → 重定向到 IdP 登录页
 * 4. IdP 回调 → 验证 SAML/OIDC 断言 → 创建或匹配用户 → 签发 JWT
 *
 * ## 配置安全
 * OIDC clientSecret 和 SAML cert 在数据库中 AES-256-GCM 加密存储，
 * 只有 auth-service 持有解密密钥。
 */

/** SSO 提供商类型 */
export type SsoProviderType = 'OKTA' | 'AZURE_AD' | 'GOOGLE_WORKSPACE' | 'GENERIC_OIDC' | 'GENERIC_SAML';

/** SSO Provider 摘要（列表展示用） */
export interface SsoProvider {
  id: string;
  workspaceId: string;
  provider: SsoProviderType;
  isEnabled: boolean;
  /** SSO 自动匹配的邮箱域名（如 'company.com'） */
  domain: string | null;
  /** IdP Metadata URL（SAML 使用） */
  metadataUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** SSO 完整配置（创建/编辑用） */
export interface SsoConfig {
  provider: SsoProviderType;
  isEnabled: boolean;
  domain?: string;
  metadataUrl?: string;
  config: OidcConfig | SamlConfig;
}

/** OpenID Connect 配置 — 适用于 OIDC 提供商 */
export interface OidcConfig {
  clientId: string;
  /** ⚠️ 敏感字段，存储时 AES-256-GCM 加密 */
  clientSecret: string;
  issuerUrl: string;
  scopes: string[];
  /** 自定义属性映射 */
  claimsMapping?: {
    email?: string;
    displayName?: string;
    externalId?: string;
  };
}

/** SAML 2.0 配置 — 适用于 SAML 提供商 */
export interface SamlConfig {
  entryPoint: string;
  /** ⚠️ SAML 签名证书，存储时 AES-256-GCM 加密 */
  cert: string;
  issuer: string;
  audience: string;
  nameIdFormat?: string;
  attributeMapping?: {
    email?: string;
    displayName?: string;
    externalId?: string;
  };
}

/** SSO 域名 — 用于自动发现 SSO 配置 */
export interface SsoDomain {
  domain: string;
  provider: SsoProviderType;
  providerName: string;
}

/** SSO 认证 URL — 前端重定向到此 URL 开始 SSO 流程 */
export interface SsoAuthUrl {
  redirectUrl: string;
  /** 防 CSRF 的 state 参数 */
  state: string;
}

/** SSO 回调结果 — IdP 回调后返回 */
export interface SsoCallbackResult {
  email: string;
  externalId: string;
  displayName: string;
  providerType: SsoProviderType;
  accessToken: string;
  refreshToken: string;
  /** 是否为新用户（首次 SSO 登录需创建用户） */
  isNewUser: boolean;
}

export interface CreateSsoConfigInput {
  provider: SsoProviderType;
  isEnabled: boolean;
  domain?: string;
  metadataUrl?: string;
  config: OidcConfig | SamlConfig;
}

export interface UpdateSsoConfigInput {
  isEnabled?: boolean;
  domain?: string;
  metadataUrl?: string;
  config?: OidcConfig | SamlConfig;
}
