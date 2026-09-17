@echo off
title Human Healthcare Log
cd /d "%~dp0"

echo Starting Human Healthcare Log...
if not exist "node_modules" (
	echo Installing project dependencies...
	call npm.cmd install
	if errorlevel 1 (
		echo Dependency installation failed.
		pause
		exit /b 1
	)
)

start "Human Healthcare Log Server" /b cmd /c "npm.cmd run dev"
echo Waiting for the application to be ready...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddSeconds(90); do { try { Invoke-WebRequest -UseBasicParsing http://localhost:3000 -TimeoutSec 2 | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 500 } } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
	echo The application did not start within 90 seconds.
	echo Check the server window for the error message.
	pause
	exit /b 1
)

echo Opening application in your browser...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Start-Process msedge.exe '-app=http://localhost:3000' } catch { Start-Process 'http://localhost:3000' }"
echo Application is running at http://localhost:3000
