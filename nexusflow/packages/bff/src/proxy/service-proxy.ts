/**
 * API 网关 — 通用 HTTP 代理
 *
 * ## BFF (Backend For Frontend) 模式
 * BFF 作为前端唯一入口，负责：
 * - **路由分发**：根据 URL 路径将请求转发到对应微服务
 * - **CORS 处理**：统一处理跨域，前端只需知道 BFF 地址
 * - **速率限制**：统一限流，保护后端服务
 * - **请求日志**：在入口记录所有请求
 * - **Swagger 文档**：聚合各服务的 API 文档
 *
 * ## 代理路由表
 * ```
 * /api/v1/auth/*    → auth-service   (认证、MFA)
 * /api/v1/channels/* → chat-service   (频道、消息、私聊)
 * /api/v1/workspaces/* → org-service  (Workspace 管理)
 * /api/v1/guests/*   → org-service   (访客管理)
 * /api/v1/dashboards/* → analytics-service (分析)
 * /api/v1/ai/*       → ai-service     (AI 对话)
 * ... 以此类推
 * ```
 *
 * ## 代理流程
 * ```
 * 前端 → BFF (port 3000) → fetch() → 下游微服务 → JSON 响应
 *              └── 转发 headers + body
 *              └── 处理流式响应 (CSV 导出等)
 *              └── 错误包装 (502 Bad Gateway)
 * ```
 *
 * ## 特殊处理
 * - **流式响应**：对 CSV 和二进制流（octet-stream）不尝试 JSON 解析，
 *   直接以 Buffer 转发
 * - **Host 头重写**：将 host 改为目标服务地址，避免下游服务识别错误
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

/** 可代理的服务目标 */
type ProxyTarget = 'auth' | 'org' | 'chat' | 'doc' | 'project' | 'workflow' | 'notify' | 'ai' | 'analytics';

/**
 * 根据服务名获取下游 URL
 *
 * URL 配置从环境变量加载（通过 config），
 * 默认使用 localhost 地址用于本地开发。
 */
function getServiceUrl(target: ProxyTarget): string {
  switch (target) {
    case 'auth':      return config.AUTH_SERVICE_URL;
    case 'org':       return config.ORG_SERVICE_URL;
    case 'chat':      return config.CHAT_SERVICE_URL;
    case 'doc':       return config.DOC_SERVICE_URL;
    case 'project':   return config.PROJECT_SERVICE_URL;
    case 'workflow':  return config.WORKFLOW_SERVICE_URL;
    case 'notify':    return config.NOTIFY_SERVICE_URL;
    case 'ai':        return config.AI_SERVICE_URL;
    case 'analytics': return config.ANALYTICS_SERVICE_URL;
  }
}

/**
 * 代理请求到下游微服务
 *
 * 转发逻辑：
 * 1. 获取目标服务的基 URL
 * 2. 拼接完整目标 URL（baseUrl + 原始请求路径）
 * 3. 转发请求头（仅转发 string 类型的值）
 * 4. 重写 Host 头为目标服务的 host（避免下游反向 DNS 解析问题）
 * 5. 非 GET/HEAD 请求转发 JSON body
 * 6. 应对流式响应（CSV/二进制）vs JSON 响应的处理
 * 7. 连接失败时返回 502 Bad Gateway
 *
 * @param target - 目标服务标识
 * @param request - Fastify 原始请求对象
 * @param reply - Fastify 响应对象
 */
export async function proxyTo(target: ProxyTarget, request: FastifyRequest, reply: FastifyReply) {
  // 1. 获取目标服务 URL
  const baseUrl = getServiceUrl(target);
  const url = `${baseUrl}${request.url}`; // 拼接原始路径（包含 query string）

  // 2. 转发请求头（过滤非 string 值，如数组/对象）
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(request.headers)) {
    if (key && typeof value === 'string') {
      headers[key] = value;
    }
  }
  // 3. 重写 Host 头 → 目标服务的主机名
  headers['host'] = new URL(baseUrl).host;

  try {
    // 4. 发起 HTTP 请求到下游服务
    const fetchResponse = await fetch(url, {
      method: request.method as string,
      headers,
      // GET/HEAD 不应有 body，其他方法转发 JSON body
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? JSON.stringify(request.body)
        : undefined,
    });

    const contentType = fetchResponse.headers.get('content-type') ?? '';

    // 5. 流式响应处理（CSV 导出、文件下载等）
    if (contentType.includes('text/csv') || contentType.includes('application/octet-stream')) {
      const buffer = await fetchResponse.arrayBuffer();
      reply.header('Content-Type', contentType);
      reply.header('Content-Disposition', fetchResponse.headers.get('content-disposition') ?? '');
      return reply.send(Buffer.from(buffer));
    }

    // 6. 标准 JSON 响应
    const body = await fetchResponse.json().catch(() => null);
    return reply.status(fetchResponse.status).send(body);
  } catch (err: any) {
    // 7. 下游服务不可达 → 502 Bad Gateway
    request.log.error(`Proxy error to ${target}: ${err.message}`);
    return reply.status(502).send({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: `Service ${target} is unavailable`,
      },
    });
  }
}
