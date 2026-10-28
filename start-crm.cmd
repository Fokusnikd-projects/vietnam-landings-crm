@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto fail
)
echo.
echo Open http://localhost:4173/ in your browser.
echo Keep this window open while using the CRM.
echo.
call npm run dev
if errorlevel 1 goto fail
exit /b 0
:fail
echo.
echo CRM could not start. See the error above.
pause
exit /b 1
