@echo off
call "%~dp0_dev-env.cmd" || exit /b 1
cd /d "%NOVEL_AGENT_DIR%\agent-consumer"
set SPRING_PROFILES_ACTIVE=%SPRING_PROFILES_ACTIVE%
echo [DEV] consumer :8090 profile=%SPRING_PROFILES_ACTIVE%
call mvn spring-boot:run -DskipTests -Dspring-boot.run.mainClass=com.novel.agent.consumer.NovelAgentConsumerApplication -Dspring-boot.run.arguments=--server.port=8090
