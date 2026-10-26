@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -3 start.py
) else (
  where python >nul 2>nul
  if errorlevel 1 (
    echo Для запуска нужен Python 3.10 или новее: https://www.python.org/downloads/
    pause
    exit /b 1
  )
  python start.py
)
if errorlevel 1 pause
