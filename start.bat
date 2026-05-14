@echo off
echo Starting Poker for Wizards...
start "PFW Server" cmd /k "cd /d %~dp0 && npm run dev --workspace=server"
timeout /t 2 /nobreak > nul
start "PFW Client" cmd /k "cd /d %~dp0 && npm run dev --workspace=client"
echo.
echo Server: http://localhost:3001
echo Client: http://localhost:5173
echo.
echo Press any key to close this window (servers continue running)
pause > nul
