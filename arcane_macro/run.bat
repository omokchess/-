@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PY=python
where py >nul 2>nul
if %errorlevel%==0 set PY=py -3
%PY% -m pip install --disable-pip-version-check -q -r requirements.txt
if errorlevel 1 (
  echo [!] pip install failed. Install Python 3.10+ from python.org (check "Add to PATH").
  pause
  exit /b 1
)
%PY% main.py
if errorlevel 1 pause
