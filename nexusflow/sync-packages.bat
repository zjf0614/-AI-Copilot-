@echo off
echo Syncing packages...
robocopy E:\nexusflow\packages E:\试验\nexusflow\packages /E /NFL /NDL /NJH /NJS /NP
echo Copy root files...
copy /Y E:\nexusflow\.env E:\试验\nexusflow\.env >nul 2>&1
copy /Y E:\nexusflow\.env.example E:\试验\nexusflow\.env.example >nul 2>&1
copy /Y E:\nexusflow\dev.mjs E:\试验\nexusflow\dev.mjs >nul 2>&1
copy /Y E:\nexusflow\package.json E:\试验\nexusflow\package.json >nul 2>&1
copy /Y E:\nexusflow\tsconfig.base.json E:\試驗\nexusflow\tsconfig.base.json >nul 2>&1
copy /Y E:\nexusflow\README.md E:\試驗\nexusflow\README.md >nul 2>&1
copy /Y E:\nexusflow\docker-compose.yml E:\試驗\nexusflow\docker-compose.yml >nul 2>&1
robocopy E:\nexusflow\keys E:\試驗\nexusflow\keys /E /NFL /NDL /NJH /NJS /NP
echo Done.
