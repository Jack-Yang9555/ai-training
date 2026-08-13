$ErrorActionPreference = 'Stop'

$projectDirectory = $PSScriptRoot
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$nodeExecutable = if ($nodeCommand) { $nodeCommand.Source } else { $null }

if (-not $nodeExecutable) {
    $workbuddyVersions = Join-Path $env:USERPROFILE '.workbuddy\binaries\node\versions'
    if (Test-Path -LiteralPath $workbuddyVersions) {
        $nodeExecutable = Get-ChildItem -LiteralPath $workbuddyVersions -Directory |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName 'node.exe' } |
            Where-Object { Test-Path -LiteralPath $_ } |
            Select-Object -First 1
    }
}

if (-not $nodeExecutable) {
    throw '没有找到 Node.js。请先安装 Node.js 20 或更高版本。'
}

$nodeDirectory = Split-Path -Parent $nodeExecutable
$env:PATH = "$nodeDirectory;$env:PATH"
$viteCli = Join-Path $projectDirectory 'node_modules\vite\bin\vite.js'

Push-Location $projectDirectory
try {
    if (-not (Test-Path -LiteralPath $viteCli)) {
        Write-Host '首次运行，正在安装依赖……' -ForegroundColor Cyan
        & (Join-Path $nodeDirectory 'npm.cmd') install
        if ($LASTEXITCODE -ne 0) { throw '依赖安装失败。' }
    }

    Write-Host '正在启动 AI 通识实训平台 Demo：http://127.0.0.1:4178' -ForegroundColor Green
    Write-Host '停止服务请按 Ctrl+C。' -ForegroundColor DarkGray
    & $nodeExecutable $viteCli --host 127.0.0.1 --port 4178
}
finally {
    Pop-Location
}
