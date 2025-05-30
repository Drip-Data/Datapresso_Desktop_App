# Datapresso 应用完全清理脚本
# 用于关闭所有相关进程并释放资源

Write-Host "正在清理 Datapresso 应用进程..." -ForegroundColor Yellow

# 关闭所有 Electron 进程
Write-Host "关闭 Electron 进程..." -ForegroundColor Cyan
Get-Process | Where-Object {$_.ProcessName -like "*electron*"} | ForEach-Object {
    Write-Host "  关闭 Electron 进程 ID: $($_.Id)"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

# 关闭监听 8000 端口的 Python 进程（后端）
Write-Host "关闭后端 Python 进程 (端口 8000)..." -ForegroundColor Cyan
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object {
    $processId = $_.OwningProcess
    if ($processId) {
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process -and $process.ProcessName -eq "python") {
            Write-Host "  关闭后端进程 ID: $processId"
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}

# 关闭监听 5173 端口的前端开发服务器
Write-Host "关闭前端开发服务器 (端口 5173)..." -ForegroundColor Cyan
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object {
    $processId = $_.OwningProcess
    if ($processId) {
        Write-Host "  关闭前端服务器进程 ID: $processId"
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
}

# 验证端口释放状态
Write-Host "验证端口状态..." -ForegroundColor Cyan
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue

if (-not $port8000) {
    Write-Host "  ✓ 端口 8000 已释放" -ForegroundColor Green
} else {
    Write-Host "  ⚠ 端口 8000 仍被占用" -ForegroundColor Red
}

if (-not $port5173) {
    Write-Host "  ✓ 端口 5173 已释放" -ForegroundColor Green
} else {
    Write-Host "  ⚠ 端口 5173 仍被占用" -ForegroundColor Red
}

Write-Host "清理完成!" -ForegroundColor Green