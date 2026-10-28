@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto node_missing
node "%~dp0scripts\start.mjs"
if errorlevel 1 pause
exit /b
:node_missing
echo Node.js was not found. Install Node.js and run this file again.
pause
exit /b 1
