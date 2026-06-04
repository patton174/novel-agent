# 多阶段：一次 Maven 构建全部 JAR，再按 MODULE 打包运行时镜像
# build: docker build --build-arg MODULE=agent-auth --build-arg JAR=... -f Dockerfile.java .
ARG MODULE=agent-auth
ARG JAR=agent-auth-1.0.0-SNAPSHOT.jar

FROM maven:3.9-eclipse-temurin-21 AS build-all
WORKDIR /build
COPY novel-agent/pom.xml novel-agent/pom.xml
COPY novel-agent/agent-common novel-agent/agent-common
COPY novel-agent/agent-auth novel-agent/agent-auth
COPY novel-agent/agent-gateway novel-agent/agent-gateway
COPY novel-agent/agent-pyai novel-agent/agent-pyai
COPY novel-agent/agent-content novel-agent/agent-content
COPY novel-agent/agent-consumer novel-agent/agent-consumer
RUN mvn -f novel-agent/pom.xml \
  -pl agent-auth,agent-gateway,agent-pyai,agent-content,agent-consumer \
  -am clean package -DskipTests -Dspring-boot.repackage.skip=false

FROM eclipse-temurin:21-jre-alpine AS runtime
ARG MODULE
ARG JAR
WORKDIR /app
COPY --from=build-all /build/novel-agent/${MODULE}/target/${JAR} /app/app.jar
ENV JAVA_OPTS="-Xms256m -Xmx768m -Dfile.encoding=UTF-8"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
