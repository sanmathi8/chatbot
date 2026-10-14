@echo off
title DocuMind AI Launcher
echo ===================================================
echo DocuMind AI - Local Document RAG Chatbot
echo Launching Backend and Frontend in separate windows...
echo ===================================================

start "DocuMind Backend" cmd /c "%~dp0start_backend.bat"
timeout /t 3 /nobreak >nul
start "DocuMind Frontend" cmd /c "%~dp0start_frontend.bat"

echo.
echo Both servers have been launched!
echo Backend:  http://127.0.0.1:8000 (Docs: http://127.0.0.1:8000/docs)
echo Frontend: http://localhost:5173
echo.
pause
