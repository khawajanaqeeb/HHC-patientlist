@echo off
title HHC Patient Visit Sheet
cd /d "%~dp0"

echo Starting HHC Patient Visit Sheet...
echo Opening application in your browser...

powershell -Command "Start-Sleep -Seconds 2; Start-Process msedge '-app=http://localhost:3000'"

npm run dev
