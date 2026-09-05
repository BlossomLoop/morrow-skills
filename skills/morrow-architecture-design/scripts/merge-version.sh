#!/usr/bin/env bash
# Phase 10.5 Version Merge checkpoint.
# 解析 ai-docs/{architecture,apis}/versions/v{x.y.z}/delta.md 三段式，
# 按规则刷新根级累积态文档与 openapi.yaml。
#
# 用法：
#   bash scripts/merge-version.sh v{x.y.z}            # 执行 merge
#   bash scripts/merge-version.sh v{x.y.z} --dry-run  # 仅列出待合并项
#   bash scripts/merge-version.sh v{x.y.z} --arch     # 仅合并架构侧
#   bash scripts/merge-version.sh v{x.y.z} --api      # 仅合并 API 侧
#
# 工作目录：脚本从目标项目根目录（含 ai-docs/）运行。

set -euo pipefail

# ──────────────────────────── 参数解析 ────────────────────────────
VERSION="${1:-}"
shift || true
DRY_RUN=0
ONLY_ARCH=0
ONLY_API=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --arch)    ONLY_ARCH=1 ;;
    --api)     ONLY_API=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

if [[ -z "$VERSION" ]]; then
  echo "usage: $0 v{x.y.z} [--dry-run|--arch|--api]" >&2
  exit 2
fi

# SemVer 校验：v{major}.{minor}.{patch}（可选预发标签 -alpha.1 / -rc.1 等）
if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9.-]+)?$ ]]; then
  echo "invalid version: $VERSION (must follow SemVer, e.g. v0.1.0 / v1.0.0-rc.1)" >&2
  exit 2
fi

PROJECT_ROOT="$(pwd)"
ARCH_VERSION_DIR="$PROJECT_ROOT/ai-docs/architecture/versions/$VERSION"
API_VERSION_DIR="$PROJECT_ROOT/ai-docs/apis/versions/$VERSION"
ARCH_ROOT="$PROJECT_ROOT/ai-docs/architecture"
API_ROOT="$PROJECT_ROOT/ai-docs/apis"
TODAY="$(date +%Y-%m-%d)"

# ──────────────────────────── 辅助函数 ────────────────────────────
log()       { echo "[merge-version] $*"; }
fail()      { echo "[merge-version] ERROR: $*" >&2; exit 1; }
dry_echo()  { if [[ $DRY_RUN -eq 1 ]]; then echo "  (dry-run) $*"; else echo "  $*"; fi; }

# 校验 delta.md 必含三段
assert_three_sections() {
  local path="$1"
  [[ -f "$path" ]] || fail "missing delta.md: $path"
  grep -q '^## 新增' "$path" || fail "missing '## 新增' section: $path"
  grep -q '^## 修改' "$path" || fail "missing '## 修改' section: $path"
  grep -q '^## 删除' "$path" || fail "missing '## 删除' section: $path"
}

# 提取某段的内容（用于 dry-run 列表）
extract_section() {
  local path="$1"
  local section="$2"
  awk -v s="$section" '
    $0 ~ "^## "s { inside=1; next }
    /^## / && inside { inside=0 }
    inside { print }
  ' "$path"
}

# 在文件顶部插入 Last updated 行（幂等：若已有同版本的行则替换）
prepend_last_updated() {
  local path="$1"
  local summary="$2"
  [[ -f "$path" ]] || { log "skip (not found): $path"; return; }
  local marker="> Last updated: $VERSION ($TODAY) — $summary"
  if [[ $DRY_RUN -eq 1 ]]; then
    dry_echo "would mark: $(basename "$path")"
    return
  fi
  # 剔除任何现存的 "Last updated: $VERSION" 行，避免同一版本多次运行产生重复
  local tmp
  tmp="$(mktemp)"
  grep -v "^> Last updated: $VERSION " "$path" > "$tmp" || true
  # 插到标题之后的第一个空行前（或文件开头）
  awk -v line="$marker" '
    NR==1 { print; print ""; print line; next }
    { print }
  ' "$tmp" > "$path"
  rm -f "$tmp"
}

# 向累积态文档追加版本变更记录（在文档末尾的 §变更历史 节，若无则创建）
append_change_log() {
  local path="$1"
  local section_title="$2"
  local content="$3"
  [[ -f "$path" ]] || { log "skip (not found): $path"; return; }
  if [[ $DRY_RUN -eq 1 ]]; then
    dry_echo "would append to $(basename "$path") / $section_title"
    return
  fi
  if ! grep -q "^## $section_title" "$path"; then
    printf '\n\n## %s\n' "$section_title" >> "$path"
  fi
  {
    printf '\n### %s (%s)\n\n' "$VERSION" "$TODAY"
    printf '%s\n' "$content"
  } >> "$path"
}

# 检测 API delta 是否 breaking（§修改 段是否含 "breaking" 关键词 或 §删除 段非空）
detect_breaking() {
  local path="$1"
  local mod
  local del
  mod="$(extract_section "$path" "修改")"
  del="$(extract_section "$path" "删除")"
  if echo "$mod" | grep -qi 'breaking'; then return 0; fi
  # §删除 段若有表格行（以 | 开头），视为 breaking
  if echo "$del" | grep -qE '^\|[^|]+\|'; then return 0; fi
  return 1
}

# ──────────────────────────── 前置校验 ────────────────────────────
log "version=$VERSION dry_run=$DRY_RUN arch_only=$ONLY_ARCH api_only=$ONLY_API"

if [[ $ONLY_API -eq 0 ]]; then
  [[ -d "$ARCH_VERSION_DIR" ]] || fail "architecture version dir missing: $ARCH_VERSION_DIR"
  assert_three_sections "$ARCH_VERSION_DIR/delta.md"
fi

if [[ $ONLY_ARCH -eq 0 ]]; then
  [[ -d "$API_VERSION_DIR" ]] || fail "api version dir missing: $API_VERSION_DIR"
  assert_three_sections "$API_VERSION_DIR/delta.md"
fi

# 两侧目录必须按版本号对齐
if [[ $ONLY_ARCH -eq 0 && $ONLY_API -eq 0 ]]; then
  [[ -d "$ARCH_VERSION_DIR" && -d "$API_VERSION_DIR" ]] \
    || fail "both sides must exist and align: $ARCH_VERSION_DIR + $API_VERSION_DIR"
fi

# ──────────────────────────── 架构侧合并 ────────────────────────────
if [[ $ONLY_API -eq 0 ]]; then
  log "── 架构侧 merge ──"
  ARCH_DELTA="$ARCH_VERSION_DIR/delta.md"

  NEW_ITEMS="$(extract_section "$ARCH_DELTA" "新增")"
  MOD_ITEMS="$(extract_section "$ARCH_DELTA" "修改")"
  DEL_ITEMS="$(extract_section "$ARCH_DELTA" "删除")"

  # 1. logical-architecture.md 追加新增组件的变更记录
  if echo "$NEW_ITEMS" | grep -q '组件'; then
    append_change_log "$ARCH_ROOT/logical-architecture.md" "版本变更历史" "$NEW_ITEMS" \
      || true
    prepend_last_updated "$ARCH_ROOT/logical-architecture.md" "新增组件/修改行为（见 $VERSION/delta.md）"
  fi

  # 2. physical-architecture.md
  if echo "$NEW_ITEMS" | grep -q '部署节点'; then
    append_change_log "$ARCH_ROOT/physical-architecture.md" "版本变更历史" "$NEW_ITEMS"
    prepend_last_updated "$ARCH_ROOT/physical-architecture.md" "新增部署节点（见 $VERSION/delta.md）"
  fi

  # 3. domain-model.md
  if echo "$NEW_ITEMS" | grep -q '领域实体\|实体'; then
    append_change_log "$ARCH_ROOT/domain-model.md" "版本变更历史" "$NEW_ITEMS"
    prepend_last_updated "$ARCH_ROOT/domain-model.md" "新增领域实体（见 $VERSION/delta.md）"
  fi

  # 4. data-model.md
  if echo "$NEW_ITEMS" | grep -q '数据表\|DDL'; then
    append_change_log "$ARCH_ROOT/data-model.md" "版本变更历史" "$NEW_ITEMS"
    prepend_last_updated "$ARCH_ROOT/data-model.md" "新增表/字段（见 $VERSION/delta.md）"
  fi
  if echo "$MOD_ITEMS" | grep -q '数据表\|字段\|ALTER'; then
    append_change_log "$ARCH_ROOT/data-model.md" "版本变更历史" "$MOD_ITEMS"
  fi

  # 5. capability-model.md
  if echo "$NEW_ITEMS" | grep -q '能力'; then
    append_change_log "$ARCH_ROOT/capability-model.md" "版本变更历史" "$NEW_ITEMS"
    prepend_last_updated "$ARCH_ROOT/capability-model.md" "新增能力（见 $VERSION/delta.md）"
  fi

  # 6. risk-and-evolution.md
  if echo "$NEW_ITEMS" | grep -qE 'V-|W-|E-|风险|脆弱点|演进'; then
    append_change_log "$ARCH_ROOT/risk-and-evolution.md" "版本变更历史" "$NEW_ITEMS"
    prepend_last_updated "$ARCH_ROOT/risk-and-evolution.md" "新增 V/W/E 登记（见 $VERSION/delta.md）"
  fi

  # 7. architecture-overview.md —— 追加版本索引
  if [[ -f "$ARCH_ROOT/architecture-overview.md" ]]; then
    if [[ $DRY_RUN -eq 1 ]]; then
      dry_echo "would add version index to architecture-overview.md"
    else
      if ! grep -q "^- \[$VERSION\]" "$ARCH_ROOT/architecture-overview.md"; then
        if ! grep -q '^## 版本索引' "$ARCH_ROOT/architecture-overview.md"; then
          printf '\n\n## 版本索引\n\n' >> "$ARCH_ROOT/architecture-overview.md"
        fi
        printf -- '- [%s](versions/%s/README.md) — %s\n' \
          "$VERSION" "$VERSION" "$TODAY" \
          >> "$ARCH_ROOT/architecture-overview.md"
      fi
    fi
    prepend_last_updated "$ARCH_ROOT/architecture-overview.md" "版本索引已追加"
  fi

  log "架构侧 merge 完成"
fi

# ──────────────────────────── API 侧合并 ────────────────────────────
if [[ $ONLY_ARCH -eq 0 ]]; then
  log "── API 侧 merge ──"
  API_DELTA="$API_VERSION_DIR/delta.md"

  # Breaking 检测
  if detect_breaking "$API_DELTA"; then
    log "⚠️  检测到 BREAKING change —— openapi.yaml info.version 主版本必须 +1"
    if [[ $DRY_RUN -eq 0 && -f "$API_ROOT/openapi.yaml" ]]; then
      CURRENT_VERSION="$(grep -E '^\s+version:' "$API_ROOT/openapi.yaml" | head -1 | sed -E 's/.*version: *//; s/"//g')"
      log "  当前 openapi.yaml info.version = $CURRENT_VERSION"
      log "  请**手动**修改为 $(echo "$CURRENT_VERSION" | awk -F. '{print ($1+1)".0.0"}') 并确认；脚本不自动 bump 主版本以避免误操作"
    fi
  fi

  NEW_API="$(extract_section "$API_DELTA" "新增")"
  MOD_API="$(extract_section "$API_DELTA" "修改")"
  DEL_API="$(extract_section "$API_DELTA" "删除")"

  # api-design.md 追加接口总表变更
  if [[ -f "$API_ROOT/api-design.md" ]]; then
    if echo "$NEW_API" | grep -qE '/v[0-9]+/'; then
      append_change_log "$API_ROOT/api-design.md" "版本接口变更历史" "$NEW_API"
    fi
    prepend_last_updated "$API_ROOT/api-design.md" "新增接口（见 $VERSION/delta.md）"
  fi

  # api-contract-mapping.md
  if [[ -f "$API_ROOT/api-contract-mapping.md" ]]; then
    if echo "$NEW_API" | grep -qE 'FR-[0-9]+'; then
      append_change_log "$API_ROOT/api-contract-mapping.md" "版本映射变更" "$NEW_API"
    fi
    prepend_last_updated "$API_ROOT/api-contract-mapping.md" "FR↔接口映射更新（见 $VERSION/delta.md）"
  fi

  # openapi.yaml: 本脚本不自动注入 paths/schemas，由 Claude 按 delta 手工 merge；仅标 Last updated
  # （原因：YAML 结构化 merge 需要 yq/openapi-merge 工具，避免引入硬依赖）
  if [[ -f "$API_ROOT/openapi.yaml" ]]; then
    if [[ $DRY_RUN -eq 1 ]]; then
      dry_echo "would remind: manual YAML merge required for openapi.yaml"
    else
      # openapi.yaml 注释头不同于 markdown，用 # 开头的注释记录
      tmp="$(mktemp)"
      grep -v "^# Last updated: $VERSION " "$API_ROOT/openapi.yaml" > "$tmp" || true
      {
        head -1 "$tmp"
        echo "# Last updated: $VERSION ($TODAY) — 按 $VERSION/delta.md 手工合并 paths/schemas"
        tail -n +2 "$tmp"
      } > "$API_ROOT/openapi.yaml"
      rm -f "$tmp"
      log "  openapi.yaml 标 Last updated；paths/schemas 需参照 $VERSION/delta.md 手工合并"
    fi
  fi

  log "API 侧 merge 完成"
fi

# ──────────────────────────── 总结 ────────────────────────────
if [[ $DRY_RUN -eq 1 ]]; then
  log "DRY-RUN 结束。实际刷盘请去掉 --dry-run 参数。"
else
  log "Merge 完成。下一步："
  log "  1. 检查版本 $VERSION/README.md §5 Phase 10.5 Merge 清单 打勾"
  log "  2. 若有 breaking change，手动 bump openapi.yaml info.version 主版本"
  log "  3. 按 delta.md 三段手工补 openapi.yaml 的 paths / components.schemas"
  log "  4. 进入 Phase 11 / Phase 12 终审"
fi
