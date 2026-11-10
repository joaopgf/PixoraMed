# Imagem do backend: compila o projeto com Maven e roda o .jar só com o JRE, como usuário sem privilégios.

# 1. Build
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B package -DskipTests

# 2. Execução
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /build/target/backend-*.jar app.jar
USER app
# O plano gratuito do Render tem 512 MB: a JVM usa no máximo 70% da memória do container
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
