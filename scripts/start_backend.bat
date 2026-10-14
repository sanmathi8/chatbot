@echo off
title DocuMind AI Backend
echo ===================================================
echo Starting DocuMind AI Backend Server (FastAPI)
echo ===================================================
cd /d "%~dp0\.."
.\backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --app-dir backend
pause
