@echo off
cd /d "%~dp0"
title LEMMA v0.3 - IMMERSIVE MATH EXPERIENCE
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.12+ first, then run this file again.
  pause
  exit /b 1
)
echo LEMMA v0.3 - Building THIS folder, then opening a NEW port.
echo Folder: %CD%
if not exist node_modules (
  call npm ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm run build
if errorlevel 1 (
  echo Build failed. Please send a screenshot of the error above.
  pause
  exit /b 1
)
node scripts/start-local.mjs
pause
