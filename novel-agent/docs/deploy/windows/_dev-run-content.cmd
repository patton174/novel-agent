@echo off
call "%~dp0_dev-env.cmd" || exit /b 1
cd /d "%NOVEL_AGENT_DIR%\agent-content"
set SPRING_PROFILES_ACTIVE=%SPRING_PROFILES_ACTIVE%
echo [DEV] content :8091 profile=%SPRING_PROFILES_ACTIVE%
call mvn spring-boot:run -DskipTests -Dspring-boot.run.mainClass=com.novel.agent.content.NovelAgentContentApplication -Dspring-boot.run.arguments=--server.port=8091
