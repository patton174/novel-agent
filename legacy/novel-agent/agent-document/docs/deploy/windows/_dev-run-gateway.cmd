@echo off
call "%~dp0_dev-env.cmd" || exit /b 1
cd /d "%NOVEL_AGENT_DIR%\agent-gateway"
set SPRING_PROFILES_ACTIVE=%SPRING_PROFILES_ACTIVE%
echo [DEV] gateway :8080 profile=%SPRING_PROFILES_ACTIVE%
call mvn spring-boot:run -DskipTests -Dspring-boot.run.mainClass=com.novel.agent.gateway.NovelAgentGatewayApplication
