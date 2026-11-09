# TRUSTPAY AI — Development Server Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       STARTING TRUSTPAY AI FULL-STACK SERVICES           " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start FastAPI Backend
Write-Host "[1/2] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
$backend = Start-Process -FilePath ".\venv\Scripts\python.exe" -ArgumentList "-m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload" -PassThru -NoNewWindow

Start-Sleep -Seconds 2

# 2. Start Vite Frontend
Write-Host "[2/2] Starting React Vite Frontend on http://localhost:5173..." -ForegroundColor Yellow
Set-Location -Path ".\frontend"
$frontend = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev -- --host" -PassThru -NoNewWindow
Set-Location -Path ".."

Write-Host ""
Write-Host ">> TRUSTPAY AI IS RUNNING!" -ForegroundColor Green
Write-Host ">> Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ">> Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host ">> API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to terminate both servers."

try {
    Wait-Process -Id $backend.Id, $frontend.Id
} finally {
    Stop-Process -Id $backend.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontend.Id -ErrorAction SilentlyContinue
}
