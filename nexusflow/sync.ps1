# Sync script
$src = "E:\nexusflow"
$dest = "E:\试验\nexusflow"
Write-Output "Syncing from $src to $dest"
Copy-Item -Path "$src\packages\*" -Destination "$dest\packages\" -Recurse -Force
Copy-Item -Path "$src\.env" -Destination "$dest\" -Force
Copy-Item -Path "$src\.env.example" -Destination "$dest\" -Force
Copy-Item -Path "$src\dev.mjs" -Destination "$dest\" -Force
Copy-Item -Path "$src\package.json" -Destination "$dest\" -Force
Copy-Item -Path "$src\tsconfig.base.json" -Destination "$dest\" -Force
Copy-Item -Path "$src\README.md" -Destination "$dest\" -Force
Copy-Item -Path "$src\docker-compose.yml" -Destination "$dest\" -Force
Copy-Item -Path "$src\keys\*" -Destination "$dest\keys\" -Recurse -Force -ErrorAction SilentlyContinue
Write-Output "Sync complete"
