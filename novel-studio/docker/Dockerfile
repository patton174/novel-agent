FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY studio-app/target/studio-app-*.jar app.jar
EXPOSE 8080
ENV SERVER_PORT=8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
