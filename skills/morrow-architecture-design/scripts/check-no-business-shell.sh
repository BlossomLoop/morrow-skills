#!/usr/bin/env bash
# check-no-business-shell.sh
#
# 在产物目录（Greenfield 骨架）下执行，检查 Phase 10 "禁止预生成业务
# Controller/Service/Entity 空壳" 硬约束是否被遵守。
#
# 用法：
#   bash scripts/check-no-business-shell.sh <project-root>
#   # 或在产物根目录直接跑：
#   bash check-no-business-shell.sh .
#
# 语义：
#   - 允许：启动类（@SpringBootApplication）、配置类（@Configuration）、
#     FastAPI 的 app 入口、Gin 的 main、Flutter 的 main.dart 等最小入口。
#   - 禁止：@RestController / @Service / @Repository / @Component / FastAPI
#     APIRouter 路由实现 / Android Activity/Fragment（除 MainActivity）等业
#     务类在架构期预生成。
#
# 退出码：
#   0 = PASS（或目标目录无对应语言骨架）
#   1 = FAIL（发现业务空壳）

set -euo pipefail

TARGET="${1:-.}"
cd "$TARGET"

fail=0
log() { echo "$@" >&2; }

scan_java() {
  # 排除测试目录；检查主代码里的业务注解。
  local dir
  for dir in $(find . -type d -path '*/src/main/java' 2>/dev/null); do
    local offenders
    offenders=$(grep -rlE '@RestController|@Service\b|@Repository|@Component\b' "$dir" 2>/dev/null \
      | xargs -I{} grep -L '@SpringBootApplication\|@Configuration\|@ConfigurationProperties' {} 2>/dev/null || true)
    if [[ -n "$offenders" ]]; then
      log "FAIL [java] 发现业务类预生成（违反 Phase 10）："
      echo "$offenders" | sed 's/^/  /' >&2
      fail=1
    fi
  done
}

scan_python() {
  # FastAPI：@app.get/@app.post/@router.* 等路由装饰器是业务代码。
  local dir
  for dir in $(find . -type d \( -name app -o -name src \) -not -path '*/node_modules/*' 2>/dev/null); do
    local offenders
    offenders=$(grep -rlE '^\s*@(app|router)\.(get|post|put|delete|patch)\(' "$dir" 2>/dev/null || true)
    if [[ -n "$offenders" ]]; then
      log "FAIL [python] 发现 FastAPI 路由实现（违反 Phase 10）："
      echo "$offenders" | sed 's/^/  /' >&2
      fail=1
    fi
  done
}

scan_go() {
  # Gin：router.GET/POST 等业务路由不应在骨架期出现（仅允许 main.go 的 r := gin.Default()）。
  local offenders
  offenders=$(grep -rlE '\b(r|router|engine)\.(GET|POST|PUT|DELETE|PATCH)\(' \
    --include='*.go' . 2>/dev/null \
    | xargs -I{} grep -L 'func main' {} 2>/dev/null || true)
  if [[ -n "$offenders" ]]; then
    log "FAIL [go] 发现 Gin 业务路由（违反 Phase 10）："
    echo "$offenders" | sed 's/^/  /' >&2
    fail=1
  fi
}

scan_kotlin_android() {
  # Android：允许 MainActivity / Application 类，其它 Activity/Fragment/ViewModel 视为业务。
  local offenders
  offenders=$(grep -rlE 'class\s+\w+(Activity|Fragment|ViewModel)\b' \
    --include='*.kt' --include='*.java' . 2>/dev/null \
    | grep -vE 'MainActivity|Application\.kt' || true)
  if [[ -n "$offenders" ]]; then
    log "FAIL [android] 发现非入口 Activity/Fragment/ViewModel（违反 Phase 10）："
    echo "$offenders" | sed 's/^/  /' >&2
    fail=1
  fi
}

scan_java
scan_python
scan_go
scan_kotlin_android

if [[ $fail -eq 0 ]]; then
  echo "check-no-business-shell: PASS (no business shells detected in $TARGET)"
  exit 0
else
  log ""
  log "修复指引：架构期骨架只保留启动类 + 配置；业务 Controller/Service/Entity"
  log "应留到实施期按 TDD 补齐。详见 SKILL.md §Phase 10 与 §反模式。"
  exit 1
fi
