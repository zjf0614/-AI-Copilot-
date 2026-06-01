# NexusFlow 开发与使用文档

> **版本**: 0.1.0 | **最后更新**: 2026-06-01
>
> NexusFlow — AI 原生的企业协作平台，微服务架构，TypeScript 全栈。

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [架构设计](#3-架构设计)
4. [环境搭建](#4-环境搭建)
5. [启动项目](#5-启动项目)
6. [项目结构](#6-项目结构)
7. [API 文档](#7-api-文档)
8. [数据库](#8-数据库)
9. [测试](#9-测试)
10. [开发指南](#10-开发指南)
11. [常见问题](#11-常见问题)

---

## 1. 项目概述

NexusFlow 是一个 **AI 原生** 的企业协作平台，集成了即时通讯、文档协作、项目管理、工作流自动化、AI Copilot 和数据分析等功能。

### 核心功能模块

| 模块 | 说明 |
|---|---|
| **认证系统** | JWT + RS256、MFA 两步验证、SSO 单点登录、Refresh Token 轮转防窃取 |
| **组织管理** | 多租户 Workspace、RBAC 角色权限、ABAC 属性策略、部门/团队/虚拟组 |
| **实时通讯** | 频道消息、私聊、讨论串、Emoji 反应、WebSocket 推送、语音/视频通话 |
| **文档协作** | 块编辑器、版本管理、模板、反向链接、评论 |
| **项目管理** | 项目组合、任务看板、Sprint 冲刺、甘特图、工时追踪、自动化规则 |
| **工作流引擎** | 可视化流程编辑器、CRON/Webhook/表单触发、审批节点 |
| **AI Copilot** | 多轮对话、知识库、语义搜索、上下文绑定 |
| **通知集成** | 站内通知、邮件/推送、免打扰时段、Webhook、第三方集成 |
| **分析 BI** | 仪表盘、OKR 目标管理、事件追踪、Workspace 洞察 |

---

## 2. 技术栈

| 层面 | 技术 | 版本 |
|---|---|---|
| **运行时** | Node.js | ≥ 22.0.0 |
| **语言** | TypeScript | 5.7+ |
| **包管理** | npm workspaces (monorepo) | 10.x |
| **HTTP 框架** | Fastify 5 | 5.x |
| **数据库** | PostgreSQL | 16 |
| **ORM** | Prisma | 6.x |
| **缓存** | Redis | 7 |
| **实时推送** | WebSocket (ws) + Redis Pub/Sub | — |
| **认证** | JWT (RS256) + Argon2id | — |
| **校验** | Zod | 3.x |
| **测试** | Vitest | 3.x |
| **前端** | React + Vite + TypeScript | — |
| **容器化** | Docker Compose | 3.9 |

---

## 3. 架构设计

### 3.1 微服务架构图

```
                          ┌─────────────────┐
                          │   浏览器/客户端    │
                          └────────┬────────┘
                                   │ HTTP / WebSocket
                                   ▼
                          ┌─────────────────┐
                          │  BFF (API 网关)  │  :3000
                          │  Fastify + 代理  │
                          └────────┬────────┘
                                   │
          ┌────────────┬───────────┼───────────┬──────────┐
          ▼            ▼           ▼           ▼          ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Auth    │ │   Org    │ │   Chat   │ │   Doc    │ │  Project │
    │  :3001   │ │  :3002   │ │  :3003   │ │  :3004   │ │  :3005   │
    └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
                                   │
          ┌────────────┬───────────┼───────────┬──────────┐
          ▼            ▼           ▼           ▼          ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ Workflow │ │  Notify  │ │    AI    │ │ Analytics│
    │  :3006   │ │  :3007   │ │  :3008   │ │  :3009   │
    └──────────┘ └──────────┘ └──────────┘ └──────────┘
                                   │
                          ┌────────┴────────┐
                          │   PostgreSQL    │
                          │   + Redis       │
                          └─────────────────┘
```

### 3.2 BFF (Backend For Frontend) 模式

BFF (:3000) 是前端唯一入口，根据 URL 路径将请求转发到对应微服务。前端只需要知道 BFF 地址，无需关心后端服务分布。

### 3.3 认证流程

```
用户密码登录
    │
    ├── MFA 未注册 → 签发 AccessToken + RefreshToken
    │
    └── MFA 已注册 → 返回 MFA Challenge Token
                        │
                        └── 用户输入 TOTP → 签发 AccessToken + RefreshToken

Token 过期
    └── 使用 RefreshToken 刷新 → 旧 Token 撤销 + 新 Token 签发
                                    │
                                    └── 旧 Token 被重用 → 整个 TokenFamily 撤销（防窃取）
```

### 3.4 RBAC + ABAC 权限模型

```
请求 → JWT 认证 → RBAC 角色检查 → ABAC 策略评估 → 最终决策
                     │                    │
                     ▼                    ▼
              用户有什么角色？        当前时间/地点/IP？
              角色有什么权限？        资源敏感度？
              通配符 *:* 展开         DENY 优先于 ALLOW
```

---

## 4. 环境搭建

### 4.1 前置依赖

| 工具 | 最低版本 | 安装方式 |
|---|---|---|
| **Node.js** | 22.0.0 | https://nodejs.org |
| **PostgreSQL** | 16 | `winget install PostgreSQL.PostgreSQL.16` |
| **Redis** | 7 | `winget install Redis.Redis` |
| **Docker** (可选) | — | `winget install Docker.DockerDesktop` |

### 4.2 克隆 & 安装

```bash
# 进入项目目录
cd e:/试验/nexusflow

# 安装所有依赖（根 + 所有 workspaces）
npm install

# 生成 Prisma Client
npm -w packages/database run generate
```

### 4.3 配置环境变量

项目根目录已有 `.env` 文件，主要内容：

```bash
# 数据库（必须修改生产密码）
DATABASE_URL=postgresql://nexusflow:nexusflow@localhost:5432/nexusflow

# Redis
REDIS_URL=redis://localhost:6379

# JWT 密钥（生产必须使用真实 RSA 密钥对）
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# 加密密钥（64 hex 字符 = 32 字节）
ENCRYPTION_KEY=sk-0df1c8f5402741ddb010f6478ff3f0a6

# 服务端口
AUTH_PORT=3001
ORG_PORT=3002
CHAT_PORT=3003
DOC_PORT=3004
PROJECT_PORT=3005
BFF_PORT=3000
```

### 4.4 数据库初始化

```bash
# 方式1：Docker（推荐）
docker-compose up -d

# 方式2：本地安装
# 确保 PostgreSQL 服务已启动，创建 nexusflow 数据库

# 执行数据库迁移（建表）
npm -w packages/database run migrate

# 可选：插入种子数据
npm -w packages/database run seed
```

---

## 5. 启动项目

### 5.1 一键启动所有服务

```bash
npm run dev
```

等价于：

```bash
# 1. 启动 Docker 容器（如果可用）
npm run dev:up

# 2. 并发启动所有微服务
concurrently \
  "npm -w packages/auth-service run dev" \
  "npm -w packages/org-service run dev" \
  "npm -w packages/chat-service run dev" \
  "npm -w packages/doc-service run dev" \
  "npm -w packages/project-service run dev" \
  "npm -w packages/bff run dev"
```

### 5.2 单独启动某个服务

```bash
npm -w packages/auth-service run dev     # 认证服务    :3001
npm -w packages/org-service run dev      # 组织服务    :3002
npm -w packages/chat-service run dev     # 聊天服务    :3003
npm -w packages/doc-service run dev      # 文档服务    :3004
npm -w packages/project-service run dev  # 项目服务    :3005
npm -w packages/bff run dev              # API 网关    :3000
```

### 5.3 启动前端 (React)

```bash
cd packages/frontend
npm install
npm run dev
# → http://localhost:5173
```

### 5.4 验证服务状态

```bash
# 健康检查
curl http://localhost:3000/health
# → { "status": "ok", "service": "nexusflow-bff", "timestamp": "..." }

# Swagger 文档
# 浏览器打开 http://localhost:3000/docs
```

### 5.5 服务端口一览

| 服务 | 端口 | Swagger 文档 |
|---|---|---|
| BFF (API 网关) | 3000 | http://localhost:3000/docs |
| Auth Service | 3001 | http://localhost:3001/docs |
| Org Service | 3002 | http://localhost:3002/docs |
| Chat Service | 3003 | http://localhost:3003/docs |
| Doc Service | 3004 | http://localhost:3004/docs |
| Project Service | 3005 | http://localhost:3005/docs |
| Frontend (Vite) | 5173 | — |

---

## 6. 项目结构

```
nexusflow/
├── package.json                  # 根 package.json (npm workspaces)
├── tsconfig.base.json            # 共享 TypeScript 配置
├── docker-compose.yml            # PostgreSQL + Redis 容器
├── .env                          # 环境变量
├── .env.example                  # 环境变量模板
├── keys/
│   ├── private.pem               # JWT RS256 私钥
│   └── public.pem                # JWT RS256 公钥
│
└── packages/
    ├── shared/                   # 🔧 共享模块（所有服务依赖）
    │   └── src/
    │       ├── index.ts          # Barrel export 入口
    │       ├── types/            # 类型定义（auth, chat, doc, project...）
    │       │   ├── common.ts     # 通用类型（分页、API 响应）
    │       │   ├── auth.ts       # 认证类型（login, register, token, MFA）
    │       │   ├── user.ts       # 用户类型
    │       │   ├── workspace.ts  # Workspace 类型 + 密码策略
    │       │   ├── org.ts        # 组织架构（部门/团队/虚拟组）
    │       │   ├── role.ts       # 角色和权限
    │       │   ├── chat.ts       # 聊天（频道/消息/私聊/反应/通话/归档）
    │       │   ├── doc.ts        # 文档（块编辑器/版本/模板/评论）
    │       │   ├── project.ts    # 项目（任务/Sprint/工时/自动化）
    │       │   ├── workflow.ts   # 工作流（节点/边/审批）
    │       │   ├── ai.ts         # AI Copilot
    │       │   ├── analytics.ts  # 分析（仪表盘/OKR）
    │       │   ├── notification.ts # 通知/集成
    │       │   ├── policy.ts     # ABAC 策略
    │       │   ├── guest.ts      # 访客/分享链接
    │       │   ├── sso.ts        # SSO 配置
    │       │   └── audit.ts      # 审计日志
    │       ├── constants/        # 常量定义
    │       │   ├── error-codes.ts    # 错误码枚举（70+ 种错误）
    │       │   ├── permissions.ts    # 权限常量（40+ 种权限）
    │       │   └── default-roles.ts  # 默认角色（Owner→Guest 5 级）
    │       ├── errors/
    │       │   └── AppError.ts   # 结构化错误类（含工厂方法）
    │       └── utils/
    │           ├── crypto.ts     # AES-256-GCM 加密 + SHA-256 令牌哈希
    │           ├── sanitize.ts   # HTML 转义 + 输入消毒 + UUID 验证
    │           ├── pagination.ts # 分页助手
    │           └── validation.ts # Zod Schema（20+ 校验规则）
    │
    ├── database/                 # 🗄️ 数据库层（Prisma + Repository）
    │   └── src/
    │       ├── client.ts         # PrismaClient 单例
    │       ├── index.ts          # 统一导出所有 repo
    │       ├── seed.ts           # 种子数据
    │       └── repositories/     # 数据访问层（29 个 repo）
    │           ├── workspace.repo.ts
    │           ├── user.repo.ts
    │           ├── role.repo.ts
    │           ├── channel.repo.ts
    │           ├── message.repo.ts
    │           └── ... (更多)
    │
    ├── auth-service/             # 🔐 认证服务 :3001
    │   └── src/
    │       ├── config.ts         # 配置（JWT 密钥/加密密钥/Redis）
    │       ├── app.ts            # Fastify 应用
    │       ├── index.ts          # 启动入口
    │       ├── routes/           # 路由
    │       │   ├── auth.routes.ts    # 登录/注册/密码
    │       │   ├── mfa.routes.ts     # MFA 管理
    │       │   └── sso.routes.ts     # SSO 管理
    │       ├── services/         # 业务逻辑
    │       │   ├── auth.service.ts       # 核心认证
    │       │   ├── password.service.ts   # Argon2id 密码
    │       │   ├── jwt.service.ts        # JWT 签名/验证
    │       │   ├── mfa.service.ts        # TOTP MFA
    │       │   └── token-rotation.ts     # Token 轮转/防窃取
    │       ├── middleware/
    │       │   ├── authenticate.ts       # JWT 认证中间件
    │       │   └── require-mfa.ts        # MFA 检查中间件
    │       └── utils/
    │           ├── crypto.ts     # 加密封装（注入密钥）
    │           └── ip-resolver.ts # IP 解析（X-Forwarded-For）
    │
    ├── org-service/              # 🏢 组织服务 :3002
    │   └── src/
    │       ├── routes/           # workspace/user/role/org/guest/policy/audit
    │       ├── services/         # workspace/user/role/permission
    │       └── middleware/       # authenticate/authorize/workspace-isolation
    │
    ├── chat-service/             # 💬 聊天服务 :3003
    │   └── src/
    │       ├── routes/           # channel/message/dm/thread/reaction/search...
    │       ├── services/         # message/channel/dm/thread/reaction/call...
    │       ├── websocket/
    │       │   ├── gateway.ts    # WebSocket 网关
    │       │   ├── presence.ts   # 在线状态管理
    │       │   └── pubsub.ts     # Redis Pub/Sub 跨实例广播
    │       └── middleware/       # authenticate/authorize/channel-access...
    │
    ├── doc-service/              # 📝 文档服务 :3004
    ├── project-service/          # 📋 项目服务 :3005
    ├── workflow-service/         # ⚙️ 工作流服务 :3006
    ├── notification-service/     # 🔔 通知服务 :3007
    ├── ai-service/               # 🤖 AI 服务 :3008
    ├── analytics-service/        # 📊 分析服务 :3009
    ├── bff/                      # 🚪 API 网关 :3000
    │   └── src/
    │       ├── config.ts         # 下游服务 URL 配置
    │       ├── app.ts            # Fastify 应用 + 路由分发
    │       ├── index.ts          # 启动入口
    │       ├── proxy/
    │       │   └── service-proxy.ts  # HTTP 代理转发
    │       └── middleware/
    │           └── request-logger.ts # 请求日志
    │       └── public/
    │           └── index.html    # 开发控制台
    │
    └── frontend/                 # 🖥️ React 前端
        └── src/
            ├── api/client.ts     # API 客户端
            ├── App.tsx           # 根组件
            ├── main.tsx          # 入口
            └── pages/            # 页面（Login/Dashboard/Channels...）
```

---

## 7. API 文档

### 7.1 Swagger 文档

所有服务启动后，访问 Swagger UI 即可查看完整 API 文档并进行在线调试：

| 服务 | Swagger 地址 |
|---|---|
| **API 网关（推荐）** | http://localhost:3000/docs |
| Auth Service | http://localhost:3001/docs |
| Org Service | http://localhost:3002/docs |
| Chat Service | http://localhost:3003/docs |

### 7.2 主要 API 端点

#### 认证 (Auth Service)

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/auth/register` | 注册（创建 Workspace + 用户） |
| POST | `/api/v1/auth/login` | 登录 |
| POST | `/api/v1/auth/refresh` | 刷新 Token |
| POST | `/api/v1/auth/logout` | 登出 |
| POST | `/api/v1/auth/change-password` | 修改密码 |
| GET | `/api/v1/auth/profile` | 获取个人资料 |
| POST | `/api/v1/auth/mfa/enroll` | 注册 MFA |
| POST | `/api/v1/auth/mfa/verify` | 验证 MFA |
| POST | `/api/v1/auth/sso/login` | SSO 登录 |
| POST | `/api/v1/auth/sso/callback` | SSO 回调 |

#### 组织管理 (Org Service)

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/workspaces` | 列出 Workspace |
| GET | `/api/v1/workspaces/:id` | Workspace 详情 |
| PUT | `/api/v1/workspaces/:id` | 更新 |
| DELETE | `/api/v1/workspaces/:id` | 删除 |
| GET | `/api/v1/workspaces/:id/users` | 用户列表 |
| GET | `/api/v1/workspaces/:id/roles` | 角色列表 |
| POST | `/api/v1/workspaces/:id/roles` | 创建角色 |
| GET | `/api/v1/workspaces/:id/departments` | 部门列表 |
| GET | `/api/v1/workspaces/:id/audit-logs` | 审计日志 |

#### 聊天 (Chat Service)

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/workspaces/:ws/channels` | 创建频道 |
| GET | `/api/v1/workspaces/:ws/channels` | 频道列表 |
| POST | `/api/v1/workspaces/:ws/channels/:ch/messages` | 发送消息 |
| GET | `/api/v1/workspaces/:ws/channels/:ch/messages` | 获取消息 |
| PUT | `/api/v1/workspaces/:ws/channels/:ch/messages/:id` | 编辑消息 |
| DELETE | `/api/v1/workspaces/:ws/channels/:ch/messages/:id` | 删除消息 |
| POST | `/api/v1/workspaces/:ws/channels/:ch/messages/:id/reactions` | 添加反应 |
| GET | `/api/v1/workspaces/:ws/dms` | 私聊列表 |
| POST | `/api/v1/workspaces/:ws/dms/:room/messages` | 发送私聊 |
| WS | `ws://localhost:3003/ws?token=<JWT>` | WebSocket 连接 |

### 7.3 常见 API 使用示例

#### 注册新用户

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.com",
    "password": "Admin123!",
    "displayName": "Admin",
    "workspaceSlug": "demo",
    "workspaceName": "Demo Workspace"
  }'
```

#### 登录

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.com",
    "password": "Admin123!",
    "workspaceSlug": "demo"
  }'
```

响应示例：

```json
{
  "data": {
    "mfaRequired": false,
    "user": { "id": "...", "email": "admin@demo.com", "displayName": "Admin" },
    "workspace": { "id": "...", "name": "Demo Workspace", "slug": "demo" },
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJl...",
    "expiresIn": 900
  }
}
```

#### 使用 Token 访问 API

```bash
curl http://localhost:3000/api/v1/workspaces/demo/users \
  -H "Authorization: Bearer <accessToken>"
```

#### WebSocket 连接

```javascript
const ws = new WebSocket(`ws://localhost:3003/ws?token=${accessToken}`);

ws.onopen = () => {
  // 订阅频道
  ws.send(JSON.stringify({
    type: 'subscribe',
    payload: { channelIds: ['channel-uuid-here'] }
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log('收到消息:', msg);
};
```

---

## 8. 数据库

### 8.1 核心数据模型

```
Workspace (租户)
  ├── User (用户)
  │   ├── UserRole (用户-角色关联)
  │   ├── MfaConfig (MFA 配置)
  │   ├── RefreshToken (刷新令牌)
  │   ├── Session (会话)
  │   └── ApiKey (API 密钥)
  ├── Role (角色)
  ├── Department (部门)
  │   └── Team (团队)
  ├── VirtualGroup (虚拟组)
  ├── SsoConfig (SSO 配置)
  ├── AbacPolicy (ABAC 策略)
  ├── AuditLog (审计日志)
  ├── GuestInvitation (访客邀请)
  ├── ShareLink (分享链接)
  ├── Channel (频道)
  │   └── Message (消息)
  │       ├── Thread (讨论串)
  │       ├── MessageReaction (反应)
  │       └── Attachment (附件)
  ├── DirectMessageRoom (私聊)
  ├── Document (文档)
  │   ├── DocumentVersion (版本)
  │   └── DocumentComment (评论)
  ├── Project (项目)
  │   ├── Task (任务)
  │   └── Sprint (冲刺)
  ├── Workflow (工作流)
  ├── Dashboard (仪表盘)
  ├── OkrObjective (OKR)
  └── Notification (通知)
```

### 8.2 查看数据库

```bash
# Prisma Studio（图形化界面）
npm -w packages/database run studio
# → 浏览器打开 http://localhost:5555

# 命令行
psql -U nexusflow -d nexusflow -h localhost
```

### 8.3 数据库迁移

```bash
# 修改 prisma/schema.prisma 后
npm -w packages/database run migrate

# 生产环境
npm -w packages/database run migrate:prod
```

---

## 9. 测试

### 9.1 运行测试

```bash
# 运行所有包的测试
npm run test

# 运行特定包
npm -w packages/shared run test
npm -w packages/auth-service run test
npm -w packages/chat-service run test
```

### 9.2 测试统计

| 包 | 测试文件 | 测试数 | 覆盖内容 |
|---|---|---|---|
| shared | 5 | 114 | crypto, sanitize, pagination, AppError, validation |
| auth-service | 1 | 19 | password hashing, verify, strength validation |
| chat-service | 1 | 23 | rich text: mentions, links, block conversion |

### 9.3 编写新测试

```ts
// 放在 src/ 目录下，文件名以 .test.ts 结尾
import { describe, it, expect } from 'vitest';

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

---

## 10. 开发指南

### 10.1 开发流程

```bash
# 1. 启动基础设施
docker-compose up -d

# 2. 确保数据库迁移是最新的
npm -w packages/database run migrate

# 3. 启动你正在开发的服务（watch 模式，文件修改自动重启）
npm -w packages/auth-service run dev

# 4. 运行测试（确保修改未破坏现有功能）
npm -w packages/shared run test

# 5. 构建检查
npm run build
```

### 10.2 代码规范

```bash
# 格式化
npm run format

# Lint 检查
npm run lint

# 类型检查（各服务独立运行）
npm -w packages/shared run typecheck
npm -w packages/auth-service run typecheck
```

### 10.3 添加新服务

1. 在 `packages/` 下创建新目录
2. 复制 `tsconfig.json` 从现有服务
3. 创建 `src/index.ts` 入口文件
4. 在根 `package.json` 的 `workspaces` 中添加
5. 在 `bff/src/proxy/service-proxy.ts` 中添加代理路由
6. 在 `bff/public/index.html` 的服务列表中注册

### 10.4 添加新 API 端点

1. 在 `shared/src/types/` 定义 DTO 类型
2. 在 `shared/src/utils/validation.ts` 添加 Zod schema
3. 在服务中添加路由文件 `routes/xxx.routes.ts`
4. 在服务中添加业务逻辑 `services/xxx.service.ts`
5. 在 `database/src/repositories/` 添加数据访问层

### 10.5 数据库 Schema 变更

1. 编辑 `packages/database/prisma/schema.prisma`
2. 运行 `npm -w packages/database run migrate`
3. Prisma 自动生成迁移文件
4. 提交迁移文件到版本控制

### 10.6 安全注意事项

- **绝不**在代码中硬编码密钥/密码，使用环境变量
- 生产环境必须使用真实的 RSA 密钥对（至少 2048 位）
- `ENCRYPTION_KEY` 必须是 64 位 hex 字符（32 字节）的强随机值
- 用户密码使用 Argon2id 哈希，salt 自动内嵌
- API Key / SSO Secret 使用 AES-256-GCM 加密存储
- Token 轮转机制可检测 Refresh Token 窃取
- 所有用户输入通过 Zod schema 校验 + sanitize 消毒

### 10.7 环境变量对照表

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL 连接字符串 |
| `REDIS_URL` | `redis://localhost:6379` | Redis 连接 |
| `JWT_PRIVATE_KEY_PATH` | — | RS256 私钥文件路径 |
| `JWT_PUBLIC_KEY_PATH` | — | RS256 公钥文件路径 |
| `JWT_ACCESS_EXPIRES_SECONDS` | 900 | Access Token 有效期 |
| `JWT_REFRESH_EXPIRES_SECONDS` | 604800 | Refresh Token 有效期 |
| `ENCRYPTION_KEY` | — | AES-256 加密密钥 (64 hex) |
| `AUTH_PORT` - `ANALYTICS_PORT` | 3001-3009 | 各服务端口 |
| `BFF_PORT` | 3000 | API 网关端口 |
| `CORS_ORIGINS` | `http://localhost:5173` | 允许的跨域源 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `NODE_ENV` | `development` | 运行环境 |

---

## 11. 常见问题

### Q: 端口被占用？

```bash
# Windows 查看端口占用
netstat -ano | findstr :3000

# 强制结束进程
taskkill /F /PID <PID>
```

### Q: 数据库连接失败？

1. 确认 PostgreSQL 服务已启动：`sc query postgresql-x64-16`
2. 确认 `.env` 中 `DATABASE_URL` 正确
3. 确认数据库 `nexusflow` 已创建
4. 确认用户名密码正确：`nexusflow / nexusflow`

### Q: npm install 失败？

```bash
# 清除缓存重试
rm -rf node_modules package-lock.json
npm install
```

### Q: Prisma Client 未生成？

```bash
npm -w packages/database run generate
```

### Q: Docker 不可用？

可以不使用 Docker，手动安装 PostgreSQL 16 和 Redis 7，确保服务在默认端口运行即可。

---

## 附录 A：NPM Scripts 速查

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动所有服务（含 Docker） |
| `npm run build` | 编译所有 workspace |
| `npm run test` | 运行所有测试 |
| `npm run lint` | ESLint 检查 |
| `npm run format` | Prettier 格式化 |
| `npm run db:migrate` | 数据库迁移 |
| `npm run db:seed` | 插入种子数据 |
| `npm run db:studio` | 打开 Prisma Studio |

## 附录 B：端口分配

| 端口 | 服务 | 协议 |
|---|---|---|
| 3000 | BFF API 网关 | HTTP |
| 3001 | Auth Service | HTTP |
| 3002 | Org Service | HTTP |
| 3003 | Chat Service | HTTP + WebSocket |
| 3004 | Doc Service | HTTP |
| 3005 | Project Service | HTTP |
| 3006 | Workflow Service | HTTP |
| 3007 | Notification Service | HTTP |
| 3008 | AI Service | HTTP |
| 3009 | Analytics Service | HTTP |
| 5173 | Frontend (Vite) | HTTP |
| 5432 | PostgreSQL | TCP |
| 6379 | Redis | TCP |
| 5555 | Prisma Studio | HTTP |
