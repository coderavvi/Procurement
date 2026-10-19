@echo off
title Blockchain E-Tendering System Startup
echo ============================================================
echo   Starting Blockchain-Enabled E-Tendering MVP System...
echo ============================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Startup failed with exit code %ERRORLEVEL%.
    pause
)
