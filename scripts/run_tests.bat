@echo off
title DocuMind AI Test Suite
echo ===================================================
echo Running DocuMind Automated Backend Tests
echo ===================================================
cd /d "%~dp0\..\backend"
.\venv\Scripts\pytest -v
pause
