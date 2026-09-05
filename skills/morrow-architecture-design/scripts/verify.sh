#!/usr/bin/env bash
# Verify morrow-architecture-design skill structure & key markers.
# Run from anywhere; paths are derived from this script's location.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$SKILL_DIR/../.." && pwd)"

assert_path() {
  local path="$1"
  if [[ ! -e "$path" ]]; then
    echo "missing: $path" >&2
    exit 1
  fi
}

assert_contains() {
  local path="$1"
  local pattern="$2"
  if ! grep -q "$pattern" "$path"; then
    echo "pattern not found: $pattern in $path" >&2
    exit 1
  fi
}

# Core
assert_path "$SKILL_DIR/SKILL.md"
assert_path "$SKILL_DIR/AGENT.md"
assert_path "$SKILL_DIR/README.md"
assert_contains "$SKILL_DIR/README.md" 'morrow-architecture-design'
assert_contains "$SKILL_DIR/README.md" 'Greenfield'
assert_contains "$SKILL_DIR/README.md" 'Brownfield'

# References
assert_path "$SKILL_DIR/references/技术路线-202512.md"
assert_path "$SKILL_DIR/references/adr-trigger-checklist.md"
assert_path "$SKILL_DIR/references/project-mode-detection.md"

# Examples (PRD inputs only; no expected checklists anymore)
assert_path "$SKILL_DIR/examples/README.md"
assert_path "$SKILL_DIR/examples/minimal-prd.md"
assert_path "$SKILL_DIR/examples/mid-size-saas-prd.md"
assert_path "$SKILL_DIR/examples/unsupported-stack-prd.md"
assert_path "$SKILL_DIR/examples/brownfield-saas-prd.md"
assert_contains "$SKILL_DIR/examples/brownfield-saas-prd.md" '预设运行环境'
assert_contains "$SKILL_DIR/examples/brownfield-saas-prd.md" 'change_scope'

# Evals (README + manual template + scorecard + machine-executable evals.json)
assert_path "$SKILL_DIR/evals/README.md"
assert_path "$SKILL_DIR/evals/manual-run-template.md"
assert_path "$SKILL_DIR/evals/scorecard.md"
assert_path "$SKILL_DIR/evals/evals.json"
assert_contains "$SKILL_DIR/evals/evals.json" '"skill_name": "morrow-architecture-design"'
assert_contains "$SKILL_DIR/evals/evals.json" 'greenfield-minimal-guided'
assert_contains "$SKILL_DIR/evals/evals.json" 'greenfield-saas-semi-auto'
assert_contains "$SKILL_DIR/evals/evals.json" 'greenfield-unsupported-stack-fallback'
assert_contains "$SKILL_DIR/evals/evals.json" 'brownfield-saas-extension'

# Bootstrap script for Brownfield mock environment
assert_path "$SKILL_DIR/scripts/bootstrap-brownfield-mock.sh"
assert_contains "$SKILL_DIR/scripts/bootstrap-brownfield-mock.sh" 'pom.xml'
assert_contains "$SKILL_DIR/scripts/bootstrap-brownfield-mock.sh" 'admin-web/package.json'

# iter-4: Phase 10.5 Version Merge checkpoint 脚本
assert_path "$SKILL_DIR/scripts/merge-version.sh"
assert_contains "$SKILL_DIR/scripts/merge-version.sh" 'Phase 10.5'
assert_contains "$SKILL_DIR/scripts/merge-version.sh" 'assert_three_sections'
assert_contains "$SKILL_DIR/scripts/merge-version.sh" 'detect_breaking'
assert_contains "$SKILL_DIR/scripts/merge-version.sh" 'Last updated'
# shell 语法正确
bash -n "$SKILL_DIR/scripts/merge-version.sh"

# SKILL.md expected markers
assert_contains "$SKILL_DIR/SKILL.md" 'Phase 0.3'
assert_contains "$SKILL_DIR/SKILL.md" 'Phase 0.5'
assert_contains "$SKILL_DIR/SKILL.md" 'Phase 8.5'
assert_contains "$SKILL_DIR/SKILL.md" 'Phase 10.5'
assert_contains "$SKILL_DIR/SKILL.md" 'Phase 12'
assert_contains "$SKILL_DIR/SKILL.md" 'constitution.md'
assert_contains "$SKILL_DIR/SKILL.md" 'baseline-architecture.md'
assert_contains "$SKILL_DIR/SKILL.md" 'risk-and-evolution.md'
assert_contains "$SKILL_DIR/SKILL.md" 'project-mode-detection.md'
assert_contains "$SKILL_DIR/SKILL.md" 'adr-trigger-checklist.md'
assert_contains "$SKILL_DIR/SKILL.md" 'api-design.md'
assert_contains "$SKILL_DIR/SKILL.md" 'openapi.yaml'
# iter-4: 版本结构与 Merge 规范
assert_contains "$SKILL_DIR/SKILL.md" 'versions/v{x.y.z}'
assert_contains "$SKILL_DIR/SKILL.md" 'delta.md'
assert_contains "$SKILL_DIR/SKILL.md" 'Version Merge'
assert_contains "$SKILL_DIR/SKILL.md" 'adaptation-todo-v{x.y.z}'
assert_contains "$SKILL_DIR/SKILL.md" 'Last updated'

# 版本化迁移守护：禁止文档/脚本/eval 残留旧 sprint 路径或旧 adaptation-todo 文件名
# 例外豁免：
#   1) evals/session-reviews/ 下的历史快照（按用户决策不动历史）
#   2) verify.sh 自身（本守护规则的存放地）
#   3) 同行带"废弃 / 弃用 / deprecated"明确标注的弃用通知
assert_no_legacy_sprint() {
  local pattern="$1"
  local desc="$2"
  local hits
  hits=$(grep -rEln "${pattern}" \
    --include='*.md' --include='*.sh' --include='*.json' --include='*.yaml' --include='*.yml' \
    "${SKILL_DIR}" 2>/dev/null \
    | grep -v 'evals/session-reviews/' \
    | grep -v "${SKILL_DIR}/scripts/verify.sh" \
    || true)
  if [[ -z "${hits}" ]]; then
    return 0
  fi
  # 逐文件检查每个匹配行；如果该行同时含"废弃|弃用|deprecated"则豁免
  local violation_files=""
  local f
  while IFS= read -r f; do
    [[ -z "${f}" ]] && continue
    local bad_lines
    bad_lines=$(grep -En "${pattern}" "${f}" | grep -Ev '废弃|弃用|deprecated' || true)
    if [[ -n "${bad_lines}" ]]; then
      violation_files+="${f}\n${bad_lines}\n"
    fi
  done <<< "${hits}"
  if [[ -n "${violation_files}" ]]; then
    echo "FAIL: 残留旧 sprint 体例 [${desc}]:" >&2
    printf '%b' "${violation_files}" >&2
    exit 1
  fi
}
assert_no_legacy_sprint 'sprints/sprint-' '旧 sprint 目录路径'
assert_no_legacy_sprint 'merge-sprint\.sh' '旧合并脚本名'
assert_no_legacy_sprint 'adaptation-todo\.md' '旧 adaptation-todo 文件名（无版本号后缀）'

# 版本化迁移守护：evals.json 必须使用 versions/ 路径访问 per-version 产物
assert_contains "$SKILL_DIR/evals/evals.json" 'versions/v0.1.0'
if grep -E '"path":\s*"ai-docs/architecture/(requirement-analysis|architecture-drivers|solution-options|adaptation-summary)\.md"' "$SKILL_DIR/evals/evals.json" >/dev/null 2>&1; then
  echo "FAIL: evals.json 仍引用根级 per-version 产物路径（应改为 versions/v{x.y.z}/...）" >&2
  exit 1
fi

# 文档一致性守护：README / SKILL / 根 README 中"X 条 assertions"必须与 evals.json 实际计数一致
if command -v python3 >/dev/null 2>&1; then
  python3 - "${SKILL_DIR}" "${ROOT}" <<'PY' || exit 1
import json, re, sys, os
skill_dir, root = sys.argv[1], sys.argv[2]
with open(os.path.join(skill_dir, 'evals/evals.json')) as f:
    actual = sum(len(e['assertions']) for e in json.load(f)['evals'])
docs = [
    os.path.join(skill_dir, 'README.md'),
    os.path.join(skill_dir, 'SKILL.md'),
    os.path.join(skill_dir, 'evals/evals.json'),
    os.path.join(root, 'README.md'),
]
# 三种声明形态：
#  A. "X 条 assertions"（中文）
#  B. "X assertions"（英文，独立词）
#  C. "%20X%20assertions"（badge URL 编码，X 前必须紧跟 %20 或行首）
patterns = [
    re.compile(r'(?<![\d])(\d+)\s*条\s*assertions?'),
    re.compile(r'(?<![\d%])(\d+)\s+assertions?\b'),
    re.compile(r'(?:%20|^|·\s*)(\d+)%20assertions?'),
]
fail = False
for doc in docs:
    if not os.path.isfile(doc):
        continue
    with open(doc) as f:
        text = f.read()
    for p in patterns:
        for m in p.finditer(text):
            n = int(m.group(1))
            if n != actual:
                print(f"FAIL: {doc} 声明的 assertions 数 ({n}) 与 evals.json 实际计数 ({actual}) 不一致", file=sys.stderr)
                fail = True
sys.exit(1 if fail else 0)
PY
fi

# Templates
for template in \
  project-mode.md \
  constitution.md \
  baseline-architecture.md \
  adaptation-summary.md \
  risk-and-evolution.md \
  requirement-analysis.md \
  architecture-overview.md \
  architecture-drivers.md \
  solution-options.md \
  physical-architecture.md \
  logical-architecture.md \
  capability-model.md \
  domain-model.md \
  data-model.md \
  api-design.md \
  api-contract-mapping.md \
  openapi.yaml \
  adr-template.md \
  module-readme.md \
  module-docs-index.md \
  module-architecture.md \
  version-readme.md \
  version-delta.md \
  api-version-delta.md \
  final-validation-report.md; do
  assert_path "$SKILL_DIR/templates/$template"
done

# Template content checks
assert_contains "$SKILL_DIR/templates/constitution.md" 'NON-NEGOTIABLE'
assert_contains "$SKILL_DIR/templates/risk-and-evolution.md" '演进触发条件'
assert_contains "$SKILL_DIR/templates/baseline-architecture.md" '现状盘点'
assert_contains "$SKILL_DIR/templates/project-mode.md" 'brownfield'
assert_contains "$SKILL_DIR/templates/project-mode.md" 'greenfield'
assert_contains "$SKILL_DIR/templates/adaptation-summary.md" '变更矩阵'
assert_contains "$SKILL_DIR/templates/adaptation-summary.md" 'change_scope'
assert_contains "$SKILL_DIR/templates/requirement-analysis.md" 'US-001'
assert_contains "$SKILL_DIR/templates/solution-options.md" '反工程化审视'
assert_contains "$SKILL_DIR/templates/adr-template.md" '涉及宪法条款'
assert_contains "$SKILL_DIR/templates/adr-template.md" '取舍分析'
assert_contains "$SKILL_DIR/templates/api-design.md" '服务于 FR'
assert_contains "$SKILL_DIR/templates/api-contract-mapping.md" 'api-design.md'
assert_contains "$SKILL_DIR/templates/openapi.yaml" 'openapi: 3.1.0'
assert_contains "$SKILL_DIR/templates/module-readme.md" '模块定位'
assert_contains "$SKILL_DIR/templates/module-docs-index.md" '模块概览'
assert_contains "$SKILL_DIR/templates/module-architecture.md" '模块职责'
# iter-4: 版本模板三段式 delta 约束
assert_contains "$SKILL_DIR/templates/version-readme.md" '版本'
assert_contains "$SKILL_DIR/templates/version-readme.md" 'Phase 10.5 Merge'
assert_contains "$SKILL_DIR/templates/version-delta.md" '## 新增'
assert_contains "$SKILL_DIR/templates/version-delta.md" '## 修改'
assert_contains "$SKILL_DIR/templates/version-delta.md" '## 删除'
assert_contains "$SKILL_DIR/templates/api-version-delta.md" '## 新增'
assert_contains "$SKILL_DIR/templates/api-version-delta.md" '## 修改'
assert_contains "$SKILL_DIR/templates/api-version-delta.md" '## 删除'
assert_contains "$SKILL_DIR/templates/api-version-delta.md" 'Breaking Change'
# iter-5: 终审报告统一模板 + 外部假设 T-N 截止日
assert_contains "$SKILL_DIR/templates/final-validation-report.md" 'Constitution Re-check'
assert_contains "$SKILL_DIR/templates/final-validation-report.md" '决策截止日'
assert_contains "$SKILL_DIR/templates/final-validation-report.md" '过期降级方案'
# iter-5: ADR 触发清单补 H 类抽象接口完整性
assert_contains "$SKILL_DIR/references/adr-trigger-checklist.md" '抽象接口完整性'
assert_contains "$SKILL_DIR/references/adr-trigger-checklist.md" 'H.1'
# iter-5: 风险模板补语境专属风险族
assert_contains "$SKILL_DIR/templates/risk-and-evolution.md" '语境专属风险族'
assert_contains "$SKILL_DIR/templates/risk-and-evolution.md" '展会 / Demo'

# Reference content checks
assert_contains "$SKILL_DIR/references/project-mode-detection.md" 'Brownfield'
assert_contains "$SKILL_DIR/references/project-mode-detection.md" 'Greenfield'
assert_contains "$SKILL_DIR/references/adr-trigger-checklist.md" '触发清单'

# Skeletons
for skeleton in \
  common \
  java-springboot \
  python-fastapi \
  vue3 \
  go-gin \
  android-kotlin \
  flutter; do
  assert_path "$SKILL_DIR/skeletons/$skeleton"
done

for common_template in \
  "skeletons/common/README.md.template" \
  "skeletons/common/docs/index.md.template" \
  "skeletons/common/.gitignore.template"; do
  assert_path "$SKILL_DIR/$common_template"
done

for stack_template in \
  "skeletons/java-springboot/.gitignore.template" \
  "skeletons/python-fastapi/.gitignore.template" \
  "skeletons/vue3/.gitignore.template" \
  "skeletons/go-gin/.gitignore.template" \
  "skeletons/android-kotlin/.gitignore.template" \
  "skeletons/flutter/.gitignore.template"; do
  assert_path "$SKILL_DIR/$stack_template"
done

# Java 骨架模板自身不得含业务空壳（SKILL §Phase 10 硬约束的源头守护）
# 只允许 Application.java.template + Config/Properties 类；
# 出现 @RestController / @Service / @Repository / @Component 即判失败。
java_skel_dir="$SKILL_DIR/skeletons/java-springboot/src/main/java"
if [[ -d "$java_skel_dir" ]]; then
  bad=$(grep -rlE '@RestController|@Service|@Repository|@Component\b' "$java_skel_dir" 2>/dev/null || true)
  if [[ -n "$bad" ]]; then
    echo "FAIL: java-springboot 骨架模板含业务类注解（违反 Phase 10 禁令）:" >&2
    echo "$bad" >&2
    exit 1
  fi
fi

# 产物侧自检脚本（供 Phase 12 终审在产物目录复用）
assert_path "$SKILL_DIR/scripts/check-no-business-shell.sh"
assert_contains "$SKILL_DIR/scripts/check-no-business-shell.sh" '@RestController'
bash -n "$SKILL_DIR/scripts/check-no-business-shell.sh"

# Repository README
# 根级 README 仅在 skill 被纳入上级聚合仓时才存在；
# 单独使用 skill 时，找不到则提示并跳过。
assert_contains_soft() {
  local path="$1"
  local pattern="$2"
  if [[ ! -f "$path" ]]; then
    echo "warn: skipped (file missing): $path" >&2
    return 0
  fi
  if ! grep -q "$pattern" "$path"; then
    echo "pattern not found: $pattern in $path" >&2
    exit 1
  fi
}
assert_contains_soft "$ROOT/README.md" 'morrow-architecture-design'

# Skill evals & examples README content
assert_contains "$SKILL_DIR/examples/README.md" '样例'
assert_contains "$SKILL_DIR/evals/README.md" '评测'
assert_contains "$SKILL_DIR/evals/manual-run-template.md" '执行记录'
assert_contains "$SKILL_DIR/evals/scorecard.md" '评分'

# AGENT.md markers
assert_contains "$SKILL_DIR/AGENT.md" 'Phase 0.3'
assert_contains "$SKILL_DIR/AGENT.md" 'Brownfield'
assert_contains "$SKILL_DIR/AGENT.md" 'docs/architecture.md'
assert_contains "$SKILL_DIR/AGENT.md" 'openapi.yaml'
assert_contains "$SKILL_DIR/AGENT.md" 'api-contract-mapping.md'
# iter-4: AGENT.md 必须覆盖版本结构与 Phase 10.5
assert_contains "$SKILL_DIR/AGENT.md" 'Phase 10.5'
assert_contains "$SKILL_DIR/AGENT.md" 'versions/v{x.y.z}'
assert_contains "$SKILL_DIR/AGENT.md" 'delta.md'

echo "architecture skill verification passed"
