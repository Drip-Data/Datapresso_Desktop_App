# Datapresso 应用健康检查脚本
# 检查前后端服务状态和端口占用情况

Write-Host "========== Datapresso 应用健康检查 ==========" -ForegroundColor Blue

# 检查端口占用情况
Write-Host "`n1. 端口状态检查:" -ForegroundColor Yellow

# 检查 8000 端口（Python 后端）
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($port8000) {
    Write-Host "  端口 8000: " -NoNewline -ForegroundColor Cyan
    Write-Host "占用中" -ForegroundColor Red
    $port8000 | ForEach-Object {
        $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "    进程: $($process.ProcessName) (ID: $($process.Id))" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  端口 8000: " -NoNewline -ForegroundColor Cyan
    Write-Host "空闲" -ForegroundColor Green
}

# 检查 5173 端口（前端开发服务器）
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($port5173) {
    Write-Host "  端口 5173: " -NoNewline -ForegroundColor Cyan
    Write-Host "占用中" -ForegroundColor Red
    $port5173 | ForEach-Object {
        $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "    进程: $($process.ProcessName) (ID: $($process.Id))" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  端口 5173: " -NoNewline -ForegroundColor Cyan
    Write-Host "空闲" -ForegroundColor Green
}

# 检查 Electron 进程
Write-Host "`n2. Electron 进程检查:" -ForegroundColor Yellow
$electronProcesses = Get-Process | Where-Object {$_.ProcessName -like "*electron*"}
if ($electronProcesses) {
    Write-Host "  发现 $($electronProcesses.Count) 个 Electron 进程:" -ForegroundColor Cyan
    $electronProcesses | ForEach-Object {
        Write-Host "    进程 ID: $($_.Id) | 内存: $([math]::Round($_.WorkingSet/1MB, 2)) MB" -ForegroundColor Gray
    }
} else {
    Write-Host "  未发现 Electron 进程" -ForegroundColor Green
}

# 检查 Python 进程数量
Write-Host "`n3. Python 进程检查:" -ForegroundColor Yellow
$pythonProcesses = Get-Process python* -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    $totalPython = $pythonProcesses.Count
    Write-Host "  总计 $totalPython 个 Python 进程运行中" -ForegroundColor Cyan
    if ($totalPython -gt 10) {
        Write-Host "  ⚠ 警告: Python 进程数量较多，可能存在资源泄漏" -ForegroundColor Red
    }
} else {
    Write-Host "  未发现 Python 进程" -ForegroundColor Green
}

# 后端服务连通性测试
Write-Host "`n4. 后端服务连通性测试:" -ForegroundColor Yellow
if ($port8000) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        Write-Host "  后端服务: " -NoNewline -ForegroundColor Cyan
        Write-Host "响应正常 (状态码: $($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "  后端服务: " -NoNewline -ForegroundColor Cyan
        Write-Host "无响应 (可能需要重启)" -ForegroundColor Red
    }
} else {
    Write-Host "  后端服务: " -NoNewline -ForegroundColor Cyan
    Write-Host "未运行" -ForegroundColor Yellow
}

Write-Host "`n========== 检查完成 ==========" -ForegroundColor Blue