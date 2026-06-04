@echo off
call "%~dp0_dev-env.cmd" || exit /b 1
cd /d "%NOVEL_AGENT_DIR%\agent-pyai"
set SPRING_PROFILES_ACTIVE=%SPRING_PROFILES_ACTIVE%
echo [DEV] pyai :8082 profile=%SPRING_PROFILES_ACTIVE%
call mvn spring-boot:run -DskipTests
