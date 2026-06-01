/**
 * 输入消毒（Sanitize）工具
 *
 * ## 安全上下文
 * 所有用户输入在存储或展示前都应经过消毒处理，以防止：
 * - **XSS 攻击**：通过 escapeHtml 转义 HTML 特殊字符
 * - **控制字符注入**：通过 sanitizeText 剥离不可见控制字符
 * - **邮件归一化**：通过 sanitizeEmail 保证邮箱格式一致
 * - **UUID 校验**：通过 isValidUuid 防止注入非法标识符
 *
 * ## 注意
 * 这些是基本的输入消毒函数，不替代参数化查询（防 SQL 注入）
 * 和 Zod schema 校验（业务逻辑校验）。
 */

/**
 * HTML 特殊字符转义映射表
 *
 * 将 HTML 中有特殊含义的字符替换为对应的 HTML 实体，
 * 防止用户输入被浏览器解释为 HTML 标签或脚本。
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',    // 必须最先转义 &，否则会重复转义其他实体
  '<': '&lt;',     // 防止 HTML 标签注入，如 <script>
  '>': '&gt;',     // 防止闭合标签注入
  '"': '&quot;',   // 防止属性值注入，如 <input value="${userInput}">
  "'": '&#x27;',   // 防止单引号闭合属性（使用数字实体兼容性更好）
};

/**
 * 转义 HTML 特殊字符
 *
 * 将字符串中的 `&`, `<`, `>`, `"`, `'` 替换为 HTML 实体。
 * 用于在 HTML 页面中安全展示用户输入。
 *
 * ## 使用场景
 * - 在 Web 页面上渲染用户输入的文本
 * - 展示消息通知、用户名等用户内容
 *
 * @param str - 原始字符串（可能包含 HTML 危险字符）
 * @returns 转义后的安全字符串
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // => '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, char => HTML_ESCAPE_MAP[char] ?? char);
}

/**
 * 消毒文本内容
 *
 * 执行两步清理：
 * 1. 去除首尾空格（trim）
 * 2. 剥离控制字符（ASCII 0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F）
 *
 * 保留的控制字符：
 * - 0x09 (Tab)：合法排版字符
 * - 0x0A (LF, \n)：Unix 换行
 * - 0x0D (CR, \r)：Windows 换行中的回车
 *
 * @param str - 原始字符串
 * @returns 清理后的字符串
 */
export function sanitizeText(str: string): string {
  return str.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/**
 * 邮箱地址标准化
 *
 * 执行：
 * 1. trim：去除首尾空格
 * 2. toLowerCase：邮箱地址大小写不敏感（RFC 5321），统一小写
 *
 * @param email - 原始邮箱地址
 * @returns 标准化后的邮箱地址
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * 验证字符串是否为合法的 UUID 格式
 *
 * UUID v4 格式：`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
 * 其中 x = [0-9a-f]，大小写不敏感。
 *
 * ## 使用场景
 * - 验证 URL 参数中的 ID 是否为有效 UUID
 * - 防止 SQL 注入和路径遍历——格式校验是第一道防线
 *
 * @param str - 待验证的字符串
 * @returns 是否为合法 UUID 格式
 */
export function isValidUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
