# TRUSTPAY AI — One-Click Full Stack Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "          STARTING TRUSTPAY AI FINANCIAL CONTROL LAYER    " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Backend FastAPI Server
Write-Host "[1/2] Launching FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
$backendProcess = Start-Process -FilePath ".\venv\Scripts\python.exe" -ArgumentList "-m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload" -PassThru -NoNewWindow

Start-Sleep -Seconds 2

# 2. Start Frontend Vite Server
Write-Host "[2/2] Launching React Vite Frontend on http://localhost:5173..." -ForegroundColor Yellow
Set-Location -Path ".\frontend"
$frontendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev -- --host" -PassThru -NoNewWindow
Set-Location -Path ".."

Write-Host ""
Write-Host ">> TRUSTPAY AI IS RUNNING!" -ForegroundColor Green
Write-Host ">> Frontend Dashboard: http://localhost:5173" -ForegroundColor Cyan
Write-Host ">> Backend REST API:   http://localhost:8000" -ForegroundColor Cyan
Write-Host ">> API Documentation: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to terminate both servers."

try {
    Wait-Process -Id $backendProcess.Id, $frontendProcess.Id
} finally {
    Stop-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue
}
