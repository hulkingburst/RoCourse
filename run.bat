@echo off
setlocal
title Luau Learn - Server + Resource Monitor
cd /d "%~dp0"

set "MODE=development"
set "SERVER_CMD=npm run dev > server.log 2>&1"

if /i "%~1"=="start" ( set "MODE=production" & set "SERVER_CMD=npm run build > server.log 2>&1 && npm run start >> server.log 2>&1" )
if /i "%~1"=="prod" ( set "MODE=production" & set "SERVER_CMD=npm run build > server.log 2>&1 && npm run start >> server.log 2>&1" )

echo ============================================================
echo   Luau Learn - Server + Resource Monitor
echo ============================================================
echo   Mode    : %MODE%
echo   URL     : http://localhost:3000 (see server output below if busy)
echo   Stop    : press Q and Enter, or just close this window
echo ============================================================
echo.

if not exist "node_modules" (
  echo WARNING: node_modules not found. Run "npm install" first.
  echo Trying anyway...
  echo.
)

del /q "server.log" "monitor.out" >nul 2>&1
start /b "" cmd /c "%SERVER_CMD%"

echo Starting the server...
echo Refreshing every 3 seconds. Press Q and Enter to stop.
echo.
timeout /t 6 /nobreak >nul

:loop
title Luau Learn - Server + Resource Monitor
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='SilentlyContinue'; $f=Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'luau-learn' }; if(-not $f){ 'SERVER_DOWN'; exit }; $ps=Get-Process -Id $f.ProcessId | Sort-Object WorkingSet64 -Descending; '-- '+(Get-Date -Format 'HH:mm:ss')+' --'; $ps | Select-Object -First 6 @{n='PID';e={$_.Id}},@{n='CPU(s)';e={[math]::Round($_.CPU,1)}},@{n='RAM(MB)';e={[math]::Round($_.WorkingSet64/1MB,1)}} | Format-Table -AutoSize; $t=($ps | Measure-Object WorkingSet64 -Sum).Sum/1MB; 'Total node RAM: {0} MB' -f [math]::Round($t,1); '--- recent server output ---'; Get-Content 'server.log' -Tail 4; 'SERVER_ALIVE'" > "monitor.out" 2>&1

findstr /i "SERVER_DOWN" "monitor.out" >nul
if not errorlevel 1 goto down

type "monitor.out"
choice /c QN /n /t 3 /d N >nul
if errorlevel 2 goto loop
goto quit

:quit
echo.
echo Stopping the server...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'luau-learn' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
echo Done. You can close this window.
exit /b 0

:down
echo.
echo The server stopped on its own. Last output:
echo.
type "server.log"
echo.
echo You can close this window.
exit /b 0
