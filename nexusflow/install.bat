@echo off
pushd E:\试验\nexusflow
echo Current directory: %CD%
call npm install
echo EXIT_CODE=%ERRORLEVEL%
popd
