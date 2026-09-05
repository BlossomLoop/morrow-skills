# 把约束固化到具体项目

本文讲**如何在某个项目里把 morrow-guard 的约束变成绕不过的东西**。

前提认知：全局 skill 正文是 L2 强度——依赖我读了并选择遵守。而目标函数错位时我恰恰不会主动自查。所以要往上走：

| 层 | 载体 | 强度 | 谁来保证 |
|---|---|---|---|
| 1 | 全局 skill 自触发点 | L2 | 我的自觉（不可靠） |
| 2 | 全局 hook（已装） | L4 | 系统拦截，我做不到绕过 |
| 3 | 项目 CLAUDE.md | L2+ | 我每次读，但仍靠自觉 |
| 4 | pre-commit hook | L4 | 提交时拦截 |
| 5 | CI / prepublishOnly | L4 | 团队级，谁都绕不过 |

第 2 层已经通过 `node scripts/install-hook.mjs` 装好了，对所有项目生效。本文讲的是第 3-5 层，按项目按需加。

---

## 第 3 层：项目 CLAUDE.md

写进项目根的 `CLAUDE.md`。这段是给我读的，用第二人称写，因为执行者是我。

```markdown
## 交付物变更的强制自查

本项目对涉及交付物的变更（迁移、重构、批量修改、发布）有额外要求。

### 你（Claude）在宣布完成前必须做的事

准备写下"完成""已验证""测试通过""可以合并"之前，先逐条给出这 6 条的结论。
不要只说「已完成」——那句话在系统完全不工作时也能写出来。

1. **双向闭环** — 注册表→文件 且 文件→注册表，两个方向都查了吗？
2. **计数一致** — 声称数 == 实际数？有没有靠改阈值让它变绿？
3. **测试对象正确** — 跑的测试确实覆盖了这次改动的代码路径吗？查 tsconfig.exclude / testPathIgnorePatterns。
4. **基线可信** — 用来对比的基线没被本次操作改写吗？
5. **评审终局** — 有独立评审/子 agent 的否决结论被你自己推翻吗？
6. **反向验证** — 断言在 known-bad 上确实会失败吗？不会红的断言等于没写。

### 按变更规模分级

- 改动 > 10 个文件：6 条全查
- 改动 3-10 个文件：查第 1、3、6 条
- 改动 < 3 个文件：查第 6 条

### 验证对象必须是交付物，不是工作区

本项目交付 npm 包。`ls` 和 `git status` 看到的文件 ≠ 包里有的文件
（`.gitignore` 和 `package.json#files` 都会让两者分叉）。

验证方式：`npm pack` → 解包 → 干净目录安装 → 跑冒烟。

### 检查不通过时

只有两条路：

1. 修复系统，让检查通过
2. 明确说出「风险是 X，我选择跳过 Y 检查，因为 Z」，并写进 commit message

禁止：调低阈值、删掉检查项、说「这条不重要」。那是在销毁证据。
```

调整要点：把"本项目交付 npm 包"换成实际交付物形态；分级阈值按项目规模调。

---

## 第 4 层：pre-commit hook

拦提交这一刻。跟全局 Stop hook 互补——Stop hook 拦的是"我宣布完成"，pre-commit 拦的是"实际写入 git"。

`.git/hooks/pre-commit`：

```bash
#!/bin/bash
# 大规模提交前要求确认已自查

STAGED=$(git diff --cached --name-only | wc -l | tr -d ' ')
THRESHOLD=10

[ "$STAGED" -le "$THRESHOLD" ] && exit 0

# 有些环境下 stdin 不是终端，跳过交互
[ ! -t 0 ] && exec < /dev/tty 2>/dev/null || {
  echo "[guard] 暂存 $STAGED 个文件（无法交互确认，放行）"
  exit 0
}

cat <<EOF

[guard] 暂存了 $STAGED 个文件，超过阈值 $THRESHOLD

提交前确认：
  1. 双向闭环查过了？（注册表↔文件，两个方向）
  2. 声称的数量 == 实际数量，且没靠改阈值让检查变绿？
  3. 跑的测试确实覆盖了这次改动？
  4. 验证的是交付物（npm pack / git archive），不是工作区？
  5. 断言在 known-bad 上确实会失败？

EOF

read -r -p "以上都确认？(yes/no) " ans
[ "$ans" = "yes" ] || { echo "[guard] 已取消提交"; exit 1; }
```

安装：

```bash
cp <上面内容> .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

注意 `.git/hooks/` 不进版本控制，团队成员各自装。要共享就用 `core.hooksPath` 指向仓库内目录：

```bash
mkdir -p .githooks && mv .git/hooks/pre-commit .githooks/
git config core.hooksPath .githooks
git add .githooks && git commit -m "chore: 共享 pre-commit 门禁"
```

---

## 第 5 层：CI 与发布门禁

这一层最强——谁都绕不过，包括用户自己手动操作。

### 发布前门禁（npm 包）

`package.json`：

```json
{
  "scripts": {
    "verify:artifact": "bash scripts/verify-artifact.sh",
    "prepublishOnly": "npm run build && npm test && npm run verify:artifact"
  }
}
```

`scripts/verify-artifact.sh` —— 从制品验证，不读工作区：

```bash
#!/bin/bash
set -euo pipefail

echo "[gate] 打包并解包验证"
TARBALL=$(npm pack --silent | tail -1)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK" "$TARBALL"' EXIT

tar xzf "$TARBALL" -C "$WORK" --strip-components=1

fail=0

# 必需产物存在性 —— 改成你项目的真实清单
for p in dist/ package.json README.md; do
  [ -e "$WORK/$p" ] || { echo "[gate] ✗ 制品缺少 $p"; fail=1; }
done

# 二进制资源没被 .gitignore 吃掉（真实案例：*.jar 被排除，用户装完能力残废）
# 若项目含此类资源，取消注释并改成实际数量
# JARS=$(find "$WORK" -name '*.jar' | wc -l | tr -d ' ')
# [ "$JARS" -eq 3 ] || { echo "[gate] ✗ 制品含 $JARS 个 JAR，期望 3"; fail=1; }

# 干净目录安装 + 冒烟
echo "[gate] 干净目录安装冒烟"
SMOKE=$(mktemp -d)
trap 'rm -rf "$WORK" "$TARBALL" "$SMOKE"' EXIT
(cd "$SMOKE" && npm init -qy >/dev/null && npm install --silent "$OLDPWD/$TARBALL" >/dev/null)
# 换成你项目的真实消费场景
# (cd "$SMOKE" && npx your-cli --version) || fail=1

[ "$fail" -eq 0 ] && echo "[gate] ✓ 制品验证通过" || { echo "[gate] 门禁未通过"; exit 1; }
```

### CI 门禁

`.github/workflows/guard.yml`：

```yaml
name: guard
on: [pull_request, push]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }

      - run: npm ci
      - run: npm test

      - name: 制品验证（不读工作区）
        run: bash scripts/verify-artifact.sh

      - name: 反向验证 — 断言必须能抓住已知缺陷
        run: |
          # 断言在好样本上通过
          bash scripts/verify-artifact.sh

          # 制造已知缺陷后必须失败，否则断言是空的
          rm -rf dist
          if bash scripts/verify-artifact.sh 2>/dev/null; then
            echo "✗ 删掉 dist 后门禁仍通过 → 断言是空的"
            exit 1
          fi
          echo "✓ 断言有效"
```

最后那步是**铁律 2 的自动化**：它验证的不是代码，是**门禁本身有没有用**。上一次失败的核心正是"验证全绿但什么都没验证"。

---

## 按场景选组合

**独立开发、单项目**
第 2 层（已装）+ 第 4 层 pre-commit。约 5 分钟。

**独立开发、发 npm 包**
上面 + 第 5 层的 prepublishOnly。约 30 分钟。发布残缺制品的代价最高，这层最值。

**团队项目**
第 3 层 CLAUDE.md（团队共享约束）+ 第 5 层 CI。`core.hooksPath` 让 pre-commit 也能共享。

**只想防住上次那类失败**
第 2 层已经覆盖破坏性操作和"无验证就宣布完成"。再加第 5 层的反向验证步骤，就覆盖了"验证是空的"这个根因。

---

## 常见问题

### hook 装了但没反应？

hook 配置在会话启动时读取，**装完要重启会话**。确认是否装上：

```bash
node ~/.claude/skills/morrow-guard/scripts/install-hook.mjs --dry-run
```

### 我被打回但这次确实不需要那些检查？

说明理由继续即可。Stop hook 单轮只打回一次，不会卡住。

要整段关掉：`MORROW_GUARD_BYPASS=1`。

### 每轮都被打回，太吵？

检查阈值。Stop hook 只在**有交付物动作且零验证痕迹**时才拦——正常开发只要跑过测试就不会触发。如果频繁触发，说明确实在没验证的情况下提交，那不是噪音。

调整位置：`hook-track-delivery.mjs` 的 `DELIVERY_PATTERNS` / `SELFCHECK_PATTERNS`，`hook-stop-selfcheck.mjs` 的 `BULK_WRITE_THRESHOLD`。

### 项目没有注册表，双向闭环不适用？

注册表只是一个实例。任何"A 引用 B，需保证 B 存在"的结构都适用：`package.json` deps ↔ `node_modules`、路由配置 ↔ 页面文件、外键 ↔ 被引用行、`tsconfig.paths` ↔ 实际目录。

### 哪些教训适用当前项目？

```bash
node ~/.claude/skills/morrow-guard/scripts/lesson-stats.mjs --all
```

看每条的 `applies_to`。
