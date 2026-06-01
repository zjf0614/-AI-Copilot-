# NexusFlow — AI-Native Enterprise Collaboration Platform

Full-stack monorepo with 10 microservices, React frontend, PostgreSQL + Redis.

## Quick Start

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Setup database
cd packages/database
npx prisma migrate dev
npx prisma db seed
cd ../..

# 3. Start all services
npm run dev
# or: scripts/dev.bat (Windows)

# 4. Open browser
# Frontend:    http://localhost:5173
# Dev Console: http://localhost:3000
# API Docs:    http://localhost:3000/docs
```

## Architecture

```
React Frontend (:5173)
        │
BFF Gateway (:3000) ──── Dev Console + Swagger
   ├── Auth (:3001)      Module A: Users, MFA, SSO
   ├── Org (:3002)       Module A: Roles, Departments, Audit
   ├── Chat (:3003)      Module B: Channels, DMs, WebSocket
   ├── Doc (:3004)       Module C: Documents, Versions, Templates
   ├── Project (:3005)   Module D: Projects, Tasks, Sprints, Kanban
   ├── Workflow (:3006)  Module E: Workflow Engine, Approvals
   ├── Notify (:3007)    Module G: Notifications, Integrations, Webhooks
   ├── AI (:3008)        Module F: AI Conversations, Knowledge Bases
   └── Analytics (:3009) Module H: Dashboards, OKRs, Events
```

## Packages

| Package | Purpose |
|---------|---------|
| `shared` | TypeScript types, Zod schemas, constants |
| `database` | Prisma schema (60+ tables), repositories |
| `auth-service` | JWT auth, MFA (TOTP), SSO (OIDC/SAML) |
| `org-service` | Workspace, RBAC+ABAC, departments, audit |
| `chat-service` | Channels, DMs, messages, threads, reactions, WebSocket |
| `doc-service` | Documents, versions, templates, comments, backlinks |
| `project-service` | Projects, tasks, sprints, dependencies, time tracking |
| `workflow-service` | Workflow engine, executions, approvals |
| `notification-service` | Notifications, preferences, integrations, webhooks |
| `ai-service` | AI conversations, context queries, knowledge bases |
| `analytics-service` | Dashboards, OKRs, event tracking, insights |
| `bff` | API Gateway, proxy, static files, Swagger |
| `frontend` | React + Vite + TypeScript UI |

## Tech Stack

- **Backend**: Fastify v5, Prisma 6, PostgreSQL 16, Redis 7
- **Frontend**: React 19, Vite 7, TypeScript 5.7
- **Auth**: JWT RS256, argon2, TOTP (otplib), OIDC/SAML
- **Real-time**: @fastify/websocket, Redis pub/sub
- **Search**: PostgreSQL full-text search (tsvector)
- **Validation**: Zod
- **Testing**: Vitest

## Stats

- 164 source files (TypeScript + TSX)
- 10,131 lines of code
- 60+ database tables
- ~250 REST API endpoints
- 20 WebSocket event types
- 11 packages, zero compilation errors

## Default Credentials

- Email: `admin@demo.com`
- Password: `Admin123!`
- Workspace: `demo`
