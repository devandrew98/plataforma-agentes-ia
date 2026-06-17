@echo off
chcp 65001 >nul
title Plataforma de Agentes IA - Inicializador
setlocal

rem Pasta onde este script esta (raiz do projeto)
set "ROOT=%~dp0"
set "BACKEND=%ROOT%BACKEND"
set "FRONTEND=%ROOT%frontend"

echo ============================================================
echo   Plataforma de Agentes IA - iniciando backend e frontend
echo ============================================================
echo.

rem ---------- BACKEND ----------
if exist "%BACKEND%\venv\Scripts\python.exe" (
    set "PY=%BACKEND%\venv\Scripts\python.exe"
) else (
    set "PY=python"
    echo [aviso] venv nao encontrado em BACKEND\venv. Usando o Python do sistema.
)

echo [1/3] Iniciando o BACKEND (http://127.0.0.1:8000) ...
start "Backend - Agentes IA" cmd /k "cd /d "%BACKEND%" && "%PY%" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

rem ---------- FRONTEND ----------
echo [2/3] Iniciando o FRONTEND (http://localhost:3000) ...
if not exist "%FRONTEND%\node_modules" (
    echo      Instalando dependencias do frontend pela primeira vez...
    start "Frontend - Agentes IA" cmd /k "cd /d "%FRONTEND%" && npm install && npm run dev"
) else (
    start "Frontend - Agentes IA" cmd /k "cd /d "%FRONTEND%" && npm run dev"
)

rem ---------- NAVEGADOR ----------
echo [3/3] Abrindo o navegador em alguns segundos...
timeout /t 12 /nobreak >nul
start "" http://localhost:3000

echo.
echo Pronto! Duas janelas foram abertas (backend e frontend).
echo Para encerrar, feche essas janelas.
echo.
pause
endlocal
