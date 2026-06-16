@echo off
title SAS — Sentinel Aerospace System
color 0B

echo.
echo  ================================================
echo   SAS — Sentinel Aerospace System
echo   Starting all servers...
echo  ================================================
echo.

cd /d E:\aircraft_damage_detection_3d

echo  [1/3] Starting Frontend on port 3000...
start "SAS Frontend :3000" cmd /k "cd /d E:\aircraft_damage_detection_3d\frontend && python -m http.server 3000"

echo  [2/3] Starting Damage Detection API on port 5000...
start "SAS Backend :5000" cmd /k "cd /d E:\aircraft_damage_detection_3d && call venv\Scripts\activate.bat && python backend/app.py"

echo  [3/3] Starting Aircraft Type API on port 5050...
start "SAS Aircraft Type :5050" cmd /k "cd /d E:\aircraft_damage_detection_3d && call venv\Scripts\activate.bat && python backend/aircraft_type_backend.py"

echo.
echo  Waiting for servers to start...
timeout /t 5 /nobreak >nul

echo.
echo  ================================================
echo   All servers started!
echo   Frontend  : http://localhost:3000
echo   Backend   : http://localhost:5000
echo   Type API  : http://localhost:5050
echo  ================================================
echo.

echo  Opening browser...
start "" "http://localhost:3000"

echo  Done. Press any key to close this window.
pause >nul
