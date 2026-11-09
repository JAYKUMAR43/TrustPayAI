# TRUSTPAY AI — Test Runner
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       RUNNING TRUSTPAY AI TEST SUITE                    " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

.\venv\Scripts\pytest -v backend\tests
