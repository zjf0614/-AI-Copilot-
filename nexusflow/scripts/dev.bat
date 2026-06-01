@echo off
echo ========================================
echo   NexusFlow Development Server
echo ========================================
echo.
set DATABASE_URL=postgresql://nexusflow:nexusflow@localhost:5432/nexusflow
set REDIS_URL=redis://localhost:6379
set JWT_PRIVATE_KEY_PATH=../../keys/private.pem
set JWT_PUBLIC_KEY_PATH=../../keys/public.pem
set ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
set NODE_ENV=development
set LOG_LEVEL=info
set CORS_ORIGINS=http://localhost:5173

echo Starting services...
echo.
echo   BFF Gateway:      http://localhost:3000
echo   Dev Console:      http://localhost:3000/
echo   API Docs:         http://localhost:3000/docs
echo   React Frontend:   http://localhost:5173
echo.

start "NexusFlow-BFF" cmd /c "cd /d %~dp0.. && npx tsx packages/bff/src/index.ts"
timeout /t 2 /nobreak >nul
start "NexusFlow-Auth" cmd /c "cd /d %~dp0.. && npx tsx packages/auth-service/src/index.ts"
start "NexusFlow-Org" cmd /c "cd /d %~dp0.. && npx tsx packages/org-service/src/index.ts"
start "NexusFlow-Chat" cmd /c "cd /d %~dp0.. && npx tsx packages/chat-service/src/index.ts"
start "NexusFlow-Doc" cmd /c "cd /d %~dp0.. && npx tsx packages/doc-service/src/index.ts"
start "NexusFlow-Project" cmd /c "cd /d %~dp0.. && npx tsx packages/project-service/src/index.ts"
start "NexusFlow-Workflow" cmd /c "cd /d %~dp0.. && npx tsx packages/workflow-service/src/index.ts"
start "NexusFlow-Notify" cmd /c "cd /d %~dp0.. && npx tsx packages/notification-service/src/index.ts"
start "NexusFlow-AI" cmd /c "cd /d %~dp0.. && npx tsx packages/ai-service/src/index.ts"
start "NexusFlow-Analytics" cmd /c "cd /d %~dp0.. && npx tsx packages/analytics-service/src/index.ts"
start "NexusFlow-Frontend" cmd /c "cd /d %~dp0..\packages\frontend && npx vite --host"

echo All services started! Press any key to stop all...
pause >nul
taskkill /FI "WINDOWTITLE eq NexusFlow-*" /F >nul 2>&1
echo Done.
