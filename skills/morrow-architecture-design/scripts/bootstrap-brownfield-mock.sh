#!/usr/bin/env bash
# Bootstrap mock baseline files for Brownfield eval (examples/brownfield-saas-prd.md).
# Usage:
#   bash bootstrap-brownfield-mock.sh [target_dir]    # default: current dir
#   bash bootstrap-brownfield-mock.sh --dry-run [dir] # preview files only
#   bash bootstrap-brownfield-mock.sh --force [dir]   # overwrite existing files
#
# Creates:
#   ./pom.xml                      Spring Boot 2.7.x manifest
#   ./Dockerfile                   openjdk:17 image
#   ./docker-compose.yml           mysql + redis + app
#   ./src/main/java/com/acme/saas/Application.java
#   ./admin-web/package.json       vue 3 + vite 4
#   ./admin-web/src/main.ts
#   ./.github/workflows/ci.yml     GitHub Actions CI
#   ./README.md                    single-tenant SaaS v1 readme
#
# After bootstrap, Phase 0.3 should detect brownfield with confidence=high.

set -euo pipefail

DRY_RUN=0
FORCE=0
TARGET_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help)
      sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      if [[ -z "$TARGET_DIR" ]]; then
        TARGET_DIR="$1"
      else
        echo "unexpected arg: $1" >&2; exit 2
      fi
      shift
      ;;
  esac
done

TARGET_DIR="${TARGET_DIR:-.}"
TARGET_DIR="$(cd "$TARGET_DIR" 2>/dev/null && pwd || { mkdir -p "$TARGET_DIR" && cd "$TARGET_DIR" && pwd; })"

log() { echo "[bootstrap-brownfield] $*"; }

write_file() {
  local rel="$1"; local content="$2"
  local abs="$TARGET_DIR/$rel"
  if [[ -e "$abs" && $FORCE -eq 0 ]]; then
    log "SKIP (exists): $rel  (use --force to overwrite)"
    return 0
  fi
  if [[ $DRY_RUN -eq 1 ]]; then
    log "DRY-RUN would write: $rel ($(echo -n "$content" | wc -c | tr -d ' ') bytes)"
    return 0
  fi
  mkdir -p "$(dirname "$abs")"
  printf '%s' "$content" > "$abs"
  log "WROTE: $rel"
}

log "Target: $TARGET_DIR"
[[ $DRY_RUN -eq 1 ]] && log "Mode: dry-run"
[[ $FORCE -eq 1 ]] && log "Mode: force overwrite"

# ---------- pom.xml ----------
write_file "pom.xml" '<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.7.18</version>
        <relativePath/>
    </parent>
    <groupId>com.acme</groupId>
    <artifactId>saas-monolith</artifactId>
    <version>1.0.0</version>
    <name>acme-training-saas</name>
    <description>Training SaaS v1 monolith (single-tenant)</description>
    <properties>
        <java.version>17</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>
        <dependency>
            <groupId>mysql</groupId>
            <artifactId>mysql-connector-java</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
    </dependencies>
</project>
'

# ---------- Dockerfile ----------
write_file "Dockerfile" 'FROM openjdk:17-jdk-slim
WORKDIR /app
COPY target/saas-monolith-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
'

# ---------- docker-compose.yml ----------
write_file "docker-compose.yml" 'version: "3.8"
services:
  app:
    build: .
    ports:
      - "8080:8080"
    depends_on:
      - mysql
      - redis
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/saas
      SPRING_REDIS_HOST: redis
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: saas
      MYSQL_ROOT_PASSWORD: changeme
    volumes:
      - mysql_data:/var/lib/mysql
  redis:
    image: redis:7-alpine
volumes:
  mysql_data:
'

# ---------- src/main/java ----------
write_file "src/main/java/com/acme/saas/Application.java" 'package com.acme.saas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
'

# ---------- admin-web/package.json ----------
write_file "admin-web/package.json" '{
  "name": "acme-admin-web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.3.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "axios": "^1.5.0",
    "element-plus": "^2.4.0"
  },
  "devDependencies": {
    "vite": "^4.4.0",
    "@vitejs/plugin-vue": "^4.3.0",
    "typescript": "^5.2.0",
    "vue-tsc": "^1.8.0"
  }
}
'

# ---------- admin-web/src/main.ts ----------
write_file "admin-web/src/main.ts" 'import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");
'

# ---------- .github/workflows/ci.yml ----------
write_file ".github/workflows/ci.yml" 'name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"
      - name: Build
        run: mvn -B package
  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: admin-web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run build
'

# ---------- README.md ----------
write_file "README.md" '# Acme Training SaaS (v1 monolith)

培训 SaaS 一期，**单租户单体版本**。后端 Spring Boot 2.7 + MySQL + Redis，管理台 Vue 3 + Vite。

## 模块

- 后端单体：`src/main/java/com/acme/saas/`
- 管理台：`admin-web/`
- 部署：`docker-compose up`

## 状态

已上线，服务单一客户。下一期计划引入多租户隔离与 AI 批改能力。
'

log ""
log "Bootstrap complete."
if [[ $DRY_RUN -eq 0 ]]; then
  log "Brownfield strong signals installed. Verify with:"
  log "  ls -la pom.xml Dockerfile docker-compose.yml admin-web/package.json .github/workflows/ci.yml"
fi
