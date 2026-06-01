/**
 * 客户端 IP 解析
 *
 * ## 为什么不能直接用 request.ip？
 * 生产环境中通常存在反向代理（Nginx/Cloudflare/负载均衡器），
 * 直接读取 `request.ip` 会拿到代理的 IP 而非真实客户端 IP。
 *
 * ## X-Forwarded-For 头
 * 格式：`client, proxy1, proxy2, ...`
 * - 第一个 IP (`client`) 是原始客户端 IP
 * - 后续 IP 是经过的代理链
 *
 * ## 安全注意
 * - X-Forwarded-For 可以被客户端伪造
 * - 在生产环境中应配置 `trust proxy`，只信任已知代理的头信息
 * - Fastify 的 trustProxy 设置影响 `request.ip` 的行为
 *
 * @param request - Fastify 请求对象
 * @returns 解析后的客户端 IP 地址
 */
import type { FastifyRequest } from 'fastify';

export function getClientIp(request: FastifyRequest): string {
  // 优先从反向代理的 X-Forwarded-For 头获取真实 IP
  const forwarded = request.headers['x-forwarded-for'];

  if (typeof forwarded === 'string') {
    // 取第一个 IP（原始客户端），去除首尾空格
    // 示例: "192.168.1.100, 10.0.0.1, 10.0.0.2" → "192.168.1.100"
    return forwarded.split(',')[0]!.trim();
  }

  // 回退到 Fastify 内置的 IP 解析（受 trustProxy 影响）
  return request.ip;
}
