@echo off
echo =========================================
echo       Starting GymPro Application
echo =========================================

echo.
echo Starting Backend API...
start "GymPro Backend" /min cmd /k "cd backend && call venv\Scripts\activate && uvicorn main:app --reload"

echo Starting React Frontend...
start "GymPro Frontend" /min cmd /k "cd frontend && npm run dev"

echo.
echo Waiting a few seconds for services to start...
timeout /t 4 /nobreak >nul

echo Opening GymPro in Google Chrome...
start chrome "http://localhost:5173"

exit
