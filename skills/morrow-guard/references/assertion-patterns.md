# 可复用断言模式

> 示例中的项目、分支和提交标识已脱敏；历史验证记录不代表本仓库包含原始坏样本。

这些模式从真实失败中提炼，每个都已用 known-bad fixture 验证过有效。

## 1. 双向闭环（Registry ↔ Files）

**适用场景**：任何有注册表/路由表/索引的系统。

**单向检查的问题**：只查"注册表里的东西是否存在"，漏掉反向"文件是否都被注册"。

### 实现

```javascript
// check-routing-closure.mjs
import { readdir } from 'fs/promises';

// 方向 1：Registry → Files（dangling reference）
const routed = parseRoutingTable('SKILL.md');  // 从路由表提取
const actual = await readdir('skills/');        // 扫文件系统
const dangling = routed.filter(x => !actual.includes(x));

// 方向 2：Files → Registry（orphan）
const orphan = actual.filter(x => !routed.includes(x));

if (dangling.length > 0) {
  console.error('断链引用（路由有、文件无）:', dangling);
  process.exit(1);
}

if (orphan.length > 0) {
  console.error('孤儿文件（文件有、路由无）:', orphan);
  process.exit(1);
}

console.log(`✓ 闭环：${routed.length} 条路由 == ${actual.length} 个文件`);
```

### Known-bad fixture 验证

在 `example/known-bad-snapshot` (commit `REDACTED_COMMIT`) 上：
- dangling: 3 个（`api-testing-patterns` 等已删但仍在路由表）
- orphan: 19 个（新 skill 有文件但未入路由表）

脚本在该 commit 上必须失败，在当前 HEAD 上必须通过。

### 变种

**agent 引用闭环**：agent 文件内引用的 skill 路径 ↔ 实际存在的 skill 目录。

```javascript
// 提取 agent 内的 skill 引用
const refs = extractSkillRefs(agentContent);  // 正则提取 `skills/<name>`
const actual = await readdir('skills/');

const broken = refs.filter(x => !actual.includes(x));
// broken.length > 0 → agent 引用了不存在的 skill
```

真实案例：24 个 agent 文件内的路径全是 `.claude/agents/v3/xxx`（上游路径），而本地 skill 在 `skills/xxx`。引用全断。

---

## 2. 计数一致性（声称 vs 实际）

**适用场景**：frontmatter / README / 注释里声称"包含 N 个 X"。

**陷阱**：手写数字容易过时，还能被主动篡改掩盖缺失。

### 实现

```javascript
// 错误做法：硬编码期望值
const EXPECTED = 78;  // ❌ 可以改成 76 让检查通过
const actual = (await readdir('skills/')).length;
assert.equal(actual, EXPECTED);

// 正确做法：独立提取两个源，比较它们
const claimed = extractClaimedCount('SKILL.md', /包含 (\d+) 个/);
const actual = (await readdir('skills/')).length;

if (claimed !== actual) {
  console.error(`声称 ${claimed} 个，实际 ${actual} 个`);
  process.exit(1);
}
```

### Known-bad fixture 验证

在 `REDACTED_COMMIT` 上：
- frontmatter 声称 `75 个 Skill + 29 个 Agent`
- 实际：94 个 SKILL.md（含 19 个嵌套重复），29 个 agent 文件但其中 2 个缺失

脚本必须报错：`声称 75，实际 94（或去重后 75，但嵌套重复存在）`。

### 防篡改加固

如果数字来自两个**独立源**的比对，改一个不够、必须同时改两个才能让检查通过，难度提升：

```javascript
const claimedInFrontmatter = extractCount('SKILL.md', /description:.*(\d+) 个/);
const claimedInBody = extractCount('SKILL.md', /## 路由表\n.*(\d+) 条/);
const actualRouted = parseRoutingTable('SKILL.md').length;
const actualFiles = (await readdir('skills/')).length;

// 4 个数字必须全部相等
assert.equal(claimedInFrontmatter, claimedInBody);
assert.equal(claimedInBody, actualRouted);
assert.equal(actualRouted, actualFiles);
```

真实案例：我把 frontmatter 的 59 改成 75，但路由表正文仍是 59 条——两个源对不上，掩盖了断链。

---

## 3. 路径形状（嵌套自引用检测）

**适用场景**：目录结构复制、rsync、批量重命名。

**问题**：操作失误导致 `a/a/`、`b/b/` 的嵌套。单纯检查"文件存在"发现不了。

### 实现

```bash
# Bash 版本
find skills/ -type f -name 'SKILL.md' | \
  awk -F/ '{if($2==$3) print "嵌套: " $0}' | \
  grep . && exit 1 || echo "✓ 无嵌套"
```

```javascript
// Node.js 版本
import { glob } from 'glob';

const files = await glob('skills/**/SKILL.md');
const nested = files.filter(f => {
  const parts = f.split('/');
  return parts.length >= 3 && parts[1] === parts[2];  // skills/a/a/SKILL.md
});

if (nested.length > 0) {
  console.error('检测到嵌套自引用:', nested);
  process.exit(1);
}
```

### Known-bad fixture 验证

在 `REDACTED_COMMIT` 上：19 个嵌套自引用目录（`api-defect-extractor/api-defect-extractor/` 等）。

脚本必须报错并列出全部 19 个。

### 扩展：通用重复路径段

```javascript
// 检测任意层级的连续重复
const detectRepeat = (path) => {
  const parts = path.split('/');
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i] === parts[i+1]) return true;
  }
  return false;
};
```

---

## 4. 从制品验证（Artifact-based，不测工作区）

**适用场景**：任何有"构建→打包→分发"流程的交付物。

**核心**：`.gitignore` / `package.json#files` / `.dockerignore` 会让工作区与制品分叉。

### 实现模板

```bash
#!/bin/bash
# verify-from-artifact.sh

set -euo pipefail

ARTIFACT_TYPE="${1:-npm}"  # npm / git-archive / docker
VERIFY_CMD="${2:-npm test}"

case "$ARTIFACT_TYPE" in
  npm)
    TARBALL=$(npm pack)
    VERIFY_DIR=$(mktemp -d)
    tar xzf "$TARBALL" -C "$VERIFY_DIR" --strip-components=1
    ;;
  git-archive)
    VERIFY_DIR=$(mktemp -d)
    git archive HEAD | tar x -C "$VERIFY_DIR"
    ;;
  docker)
    IMAGE=$(docker build -q .)
    VERIFY_DIR=$(mktemp -d)
    CONTAINER=$(docker create "$IMAGE")
    docker cp "$CONTAINER:/app" "$VERIFY_DIR"
    docker rm "$CONTAINER"
    ;;
esac

echo "=== 制品已解包到 $VERIFY_DIR ==="

# 在制品目录里构建 + 测试
cd "$VERIFY_DIR"
npm install --silent
npm run build
eval "$VERIFY_CMD"

# 冒烟：能否被消费方成功安装
SMOKE_DIR=$(mktemp -d)
npm install -g "$VERIFY_DIR"
cd "$SMOKE_DIR"
# 执行实际消费场景的命令
example-cli list skills | grep -q 'test'

echo "✓ 制品验证通过（解包→构建→测试→冒烟）"
```

### Known-bad fixture 验证

在 `REDACTED_COMMIT` 上执行上述脚本，预期失败点：

```bash
$ tar tzf example-project-*.tgz | grep -c '\.jar$'
0  # ❌ JAR 全丢

$ tar tzf example-project-*.tgz | grep '.claude'
(empty)  # ❌ template 目录被 .gitignore 排除
```

脚本在这两步就该报错，不必等到安装失败。

---

## 5. 反向验证（Mutation-based）

**适用场景**：验证断言本身是否有效（铁律 2）。

**方法**：主动破坏系统，确认断言变红。

### 实现：手动 mutation

```bash
#!/bin/bash
# verify-assertion-catches-known-defects.sh

ASSERTION_SCRIPT="$1"
shift
MUTATIONS=("$@")  # 一组"如何破坏"的描述

echo "=== 断言在好样本上通过 ==="
"$ASSERTION_SCRIPT" || { echo "✗ 好样本就失败"; exit 1; }

for mutation in "${MUTATIONS[@]}"; do
  echo "=== 注入缺陷: $mutation ==="
  
  # 根据 mutation 字符串执行破坏
  case "$mutation" in
    delete-skill-file)
      TARGET=$(ls skills/ | head -1)
      mv "skills/$TARGET" "/tmp/backup-$TARGET"
      ;;
    remove-routing-entry)
      sed -i.bak '/^- `api-shared/d' SKILL.md
      ;;
  esac
  
  # 断言必须失败
  if "$ASSERTION_SCRIPT"; then
    echo "✗ BUG: 断言没有检测到缺陷 [$mutation]"
    exit 1
  else
    echo "✓ 断言正确捕获了缺陷"
  fi
  
  # 恢复
  case "$mutation" in
    delete-skill-file)
      mv "/tmp/backup-$TARGET" "skills/$TARGET"
      ;;
    remove-routing-entry)
      mv SKILL.md.bak SKILL.md
      ;;
  esac
done

echo "✓ 全部 mutation 被正确捕获，断言有效"
```

### 实现：用 known-bad fixture

更直接的做法：在保存的坏 commit 上跑断言。

```bash
#!/bin/bash
# verify-with-known-bad-fixture.sh

ASSERTION_SCRIPT="$1"
KNOWN_BAD_REF="$2"  # 如 example/known-bad-snapshot

echo "=== 在当前 HEAD（好样本）上测试 ==="
"$ASSERTION_SCRIPT" || { echo "✗ 好样本失败"; exit 1; }

echo "=== 在 known-bad fixture ($KNOWN_BAD_REF) 上测试 ==="
TEMP_DIR=$(mktemp -d)
git archive "$KNOWN_BAD_REF" | tar x -C "$TEMP_DIR"

cd "$TEMP_DIR"
if bash -c "$ASSERTION_SCRIPT"; then
  echo "✗ BUG: 断言在已知坏样本上通过了，说明断言是空的"
  exit 1
else
  echo "✓ 断言正确拒绝了 known-bad fixture"
fi

echo "✓ 断言有效性验证通过"
```

### 真实案例

`REDACTED_COMMIT` 那个 commit 就是现成的 known-bad fixture，上面有：

- 19 个嵌套重复目录
- 3 个断链路由
- 0 个 JAR
- 路由表 82 条 vs 实际 75 个文件

任何声称"检测这些问题"的断言，在 `REDACTED_COMMIT` 上必须失败。不失败 = 断言是假的。

---

## 6. 工具自检（Tool Validation）

**适用场景**：验证脚本本身可能出错。

**问题**：工具返回异常结果（0 命中、100% 命中、数字诡异）时，先怀疑工具还是先怀疑系统？

### 原则

工具返回异常结果时的流程：

```
1. 记下异常信号（0 命中 / 全部命中 / 数字过于整齐）
2. 【不改结论】先看原始数据：head -50 / 手动 grep 几条
3. 确认是数据问题还是工具问题
4. 再决定改数据还是改工具
```

### 实现：Fixture-driven 工具测试

```javascript
// test-extract-routing.test.js
import { test } from 'vitest';
import { extractRoutingTable } from './extract-routing.mjs';

test('从已知格式的 SKILL.md 提取路由表', () => {
  const sample = `
## 路由表（3 个）
- \`skill-a\` — 描述 A
- \`skill-b\` — 描述 B
- \`skill-c\` — 描述 C
  `;
  
  const result = extractRoutingTable(sample);
  
  expect(result).toEqual(['skill-a', 'skill-b', 'skill-c']);
  expect(result.length).toBe(3);
});

test('空输入返回空数组，不抛异常', () => {
  expect(extractRoutingTable('')).toEqual([]);
});

test('格式错误时返回空而非误判', () => {
  const malformed = `- skill-a（没有反引号）`;
  expect(extractRoutingTable(malformed)).toEqual([]);
});
```

真实案例：提取脚本写了三版：

1. `grep -oE 'skills/[a-z0-9-]+'` → 返回 0（路径模式不对）
2. `sed ... | tr -d '`- '` → 返回 78 个名字，但全是 `apicodediffanalyzer`（连字符被删了）
3. `sed -n 's/^- `\([a-z0-9-]*\)`.*/\1/p'` → 才对

如果第一版就在 fixture 上跑过，立刻就能发现返回 0 是工具错了不是系统坏了。

---

## 组合使用

真实世界的验证通常需要组合多个模式：

```javascript
// comprehensive-check.mjs

// 1. 双向闭环
await checkRoutingClosure();

// 2. 计数一致性
await checkCountConsistency();

// 3. 路径形状
await checkNoNestedDuplicates();

// 4. 从制品验证（而非工作区）
const artifact = await buildArtifact();  // npm pack
await verifyArtifact(artifact);

// 5. 用 known-bad 反验断言
await verifyAssertionWithFixture('example/known-bad-snapshot');

console.log('✓ 全部模式检查通过');
```

每个模式解决一类问题，组合起来覆盖 80%+ 的常见失败。
