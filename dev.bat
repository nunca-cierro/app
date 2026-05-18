@echo off
title NuncaCierro — Dev Mode
cd /d "%~dp0"

echo ========================================
echo      NuncaCierro - Dev Mode
echo ========================================
echo.
echo  Iniciando API y Dashboard...
echo.

start "NuncaCierro API"    cmd /k "cd /d "%~dp0nc-api" && .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
start "NuncaCierro Dash"   cmd /k "cd /d "%~dp0nc-dashboard" && npm run dev"

echo.
echo  API:        http://localhost:8000
echo  API Docs:   http://localhost:8000/docs
echo  Dashboard:  http://localhost:3000
echo.
echo  Las ventanas se abrieron en segundo plano.
echo  Cierra cada ventana manualmente para detener.
echo.
pause
