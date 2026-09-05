# 6 环节详细检查项

每个环节：强制动作 → 常见失败 → 验收标准。
表格里的"真实案例"来自 `case-migration-failure.md` 记录的那次失败。

## 目录

- [环节 1：理解任务](#环节-1理解任务)
- [环节 2：制定计划](#环节-2制定计划)
- [环节 3：执行操作](#环节-3执行操作)
- [环节 4：验证结果](#环节-4验证结果)
- [环节 5：判断完成](#环节-5判断完成)
- [环节 6：产出报告](#环节-6产出报告)

---

## 环节 1：理解任务

### 强制动作

把任务描述翻译成**可验证的目标状态**。方法是追问三个问题：

1. **交付物是什么形态？** npm tarball / git 分支 / Docker 镜像 / 部署到某环境 / 本地目录
2. **谁来消费它？** CLI 用户 / 另一个服务 / CI / 平台运行时
3. **消费时怎么算成功？** 这一条就是 DoD

### 常见失败

| 失败 | 表现 | 真实案例 |
|---|---|---|
| 把动作当状态 | "迁移文件" 而非 "能力可路由" | 78 个 skill 文件都在，但 3 个断链、19 个嵌套重复 |
| 漏掉消费方 | 只想着"我要改什么"，没想"谁会用" | agent 文件拷了但内部路径引用没改，装到目标环境全是坏引用 |
| DoD 不可验证 | "迁移完成"、"质量提升" | 无法据此写断言 |

### 验收标准

DoD 中的每一条都能回答："我用什么命令能证明它成立？"

写不出命令的条目要么细化，要么承认它是主观项并标注。

### dod.yaml 格式

```yaml
task: 示例工具迁移
artifact:
  type: npm-tarball          # 交付物形态，决定环节 4 怎么验
  produce: npm pack
consumer: CLI 用户执行 example-cli install skill test
done_when:
  - id: routing-closed
    state: 路由表条目数 == 实际 SKILL.md 数，双向无悬挂
    verify: scripts/check-routing.mjs
    level: L3
  - id: jar-shipped
    state: 3 个 JAR 存在于 tarball 内并随安装落地
    verify: tar tzf $(npm pack) | grep -c '\.jar$'
    level: L3
  - id: agent-refs-valid
    state: agent 文件内的 skill 路径引用全部指向存在的 skill
    verify: scripts/check-agent-refs.mjs
    level: L3
```

---

## 环节 2：制定计划

### 强制动作

**每一步配 verify。** 格式：

```
1. rsync 拷贝 skills 目录        → verify: 目标目录 SKILL.md 数 == 源目录
2. 改写 skill 内部路径引用        → verify: grep 旧路径模式命中数 == 0
3. 更新路由表                    → verify: 双向闭环检查通过
4. 更新 registry                 → verify: registry 条目 == 磁盘目录，双向
```

没有 verify 的步骤是黑盒——它成功还是失败你都不知道。

### 强制动作：扫描高危操作

在计划里搜这些模式，找到就单独列成高危清单（详见 `danger-ops.md`）：

`rm -rf` / `git reset --hard` / `git add -A` / `git commit` / `git push --force` / `rsync --delete` / `git clean` / `git branch -D` / 绝对路径 `/Users/` `/home/` `C:\`

### 常见失败

| 失败 | 表现 | 真实案例 |
|---|---|---|
| 有步骤无 verify | 计划只写"做什么" | agent 迁移那步的 rsync 从未生效，直到第三方评审才发现 |
| 高危操作藏在脚本里 | 计划说"运行迁移脚本"，脚本内含 `git add -A` + `git commit` | 脚本在 dev 分支上自动提交，污染了主干 |
| 硬编码路径 | `NEW_ROOT=/Users/xxx/Downloads/...` | 脚本不可复用，且 `rsync --delete` 改写了唯一可信基线 |

### 验收标准

- 每步都有 verify
- 高危操作清单已列出，每项都有"为什么必须用它"和"出错怎么恢复"
- 计划里没有绝对路径（用变量 + 参数传入）

---

## 环节 3：执行操作

### 强制动作

1. **高危操作前置确认**（L4 hook 自动拦截，见 `danger-ops.md`）
2. **先备份可信基线**：任何会改写参照物的操作之前，先固定基线（`cp -r` 快照 / `git branch backup/...` / 记录 SHA-256）
3. **关键步骤后立即验证**，不要跑完全流程再检查

### 常见失败

| 失败 | 表现 | 真实案例 |
|---|---|---|
| 脏工作区 reset | 未追踪文件被 `git reset --hard` 删除 | 3 个 PNG 丢失 |
| 基线被自己改写 | 用来对比的源目录被 `rsync --delete` 覆盖 | 唯一可信基线销毁，只剩 ZIP 可用 |
| 批量提交扫入无关内容 | `git add -A` 把工作区里别人的未追踪文件一起提交 | 一个 124 行的 `AGENTS.md`（他人产物）被卷入提交 |
| 一次跑完再查 | 中间步骤失败被后续输出淹没 | 19 个嵌套目录在长输出里滚过去了，只 grep "error" 没发现 |

### 验收标准

- 执行前工作区状态已记录（`git status --porcelain` 存档）
- 基线已备份且备份位置已记录
- 每个关键步骤的 verify 已执行且结果已保存

---

## 环节 4：验证结果

**最关键的环节。** 三条硬要求。

### 4.1 从制品验证，不读工作区

工作区能看到的文件 ≠ 交付物里有的文件。让两者分叉的机制：

| 机制 | 效果 |
|---|---|
| `.gitignore` | 文件在磁盘、在工作区可见，但不进 git、不进 `git archive` |
| `package.json#files` | 文件在 git 里，但不进 npm tarball |
| `tsconfig.exclude` | 文件在包里，但不被编译、不被测试覆盖 |
| `.dockerignore` | 文件在仓库里，但不进镜像 |

**流程**：

```bash
# 1. 产出真实制品
git archive HEAD -o /tmp/artifact.tar        # 或 npm pack / docker build

# 2. 解包到干净目录
mkdir /tmp/verify && tar xf /tmp/artifact.tar -C /tmp/verify

# 3. 在干净目录里构建 + 安装
cd /tmp/verify && npm install && npm run build

# 4. 装到另一个全新目录，跑冒烟
mkdir /tmp/smoke && node /tmp/verify/dist/cli.js init dev --target /tmp/smoke

# 5. 验证消费方视角的目标状态（DoD）
```

真实案例：工作区里 3 个 JAR 都在，`git archive` 出来的制品里 0 个——`.gitignore` 排除了 `*.jar`。用户装完包，覆盖率能力直接残废。

### 4.2 反向验证（铁律 2）

写完断言后，**主动破坏一处**，确认断言变红：

```bash
# 断言在正确样本上通过
node scripts/check-routing.mjs && echo "PASS on good"

# 制造已知缺陷
git stash && rm example-infra/skills/test/skills/api-shared-artifacts/SKILL.md

# 断言必须失败
node scripts/check-routing.mjs && echo "BUG: 断言是空的！" || echo "PASS: 断言有效"

# 恢复
git checkout . && git stash pop
```

更好的做法：用真实的 known-bad fixture（出问题的那个 commit）跑断言，见 `scripts/verify-assertion.mjs`。

### 4.3 验证工具自检（铁律 3）

工具返回异常结果时的处理顺序：

1. **先看原始数据**：`head -50 <file>`、`sed -n '100,120p' <file>`
2. 确认是数据问题还是工具问题
3. 再决定改数据还是改工具

异常信号：0 命中、100% 命中、数字过于整齐（正好 78、正好 0）、结果与直觉严重不符。

真实案例：提取路由表的正则连写三版都错（第一版路径模式不对、第二版 `tr -d '`- '` 把名字里的连字符也删了），每次都先怀疑系统而不是怀疑工具。

### 常见失败

| 失败 | 表现 | 真实案例 |
|---|---|---|
| 测工作区当制品 | `ls` / `git status` 看到文件就算过 | JAR 丢失、template 注册了不存在的文件 |
| 测错对象 | 跑了测试套件但它不覆盖改动的代码 | `npm test` 75/75 通过，而 `tsconfig` 排除了被迁移的整个目录 |
| 只做正向验证 | 断言在好样本上通过就收工 | 文件存在性检查全绿，同时存在 19 个嵌套重复目录 |
| 单向检查 | 只查"注册表里的文件是否存在" | 漏掉反方向：19 个新 skill 有文件但没进注册表 |

### 验收标准

- 验证是在解包后的制品上跑的，命令可复现
- 每条断言都在 known-bad fixture 上验证过会失败
- 验证脚本本身在已知数据上跑通过

---

## 环节 5：判断完成

### 强制自查表

```
[ ] 双向闭环：注册表→文件 且 文件→注册表
[ ] 计数一致：声称数 == 实际数，且未通过改阈值消除差异
[ ] 测试对象正确：测试确实覆盖被改动的代码路径
[ ] 基线可信：对比基线未被本次操作改写
[ ] 评审终局：独立评审的否决结论未被我自己推翻
[ ] 反向验证已做：断言在 known-bad 上确实失败
```

### 核心原则：改系统，不改检查

发现检查不通过时，有两条路：

- **改系统**：找到真实缺失并补上 ✅
- **改检查**：把阈值调低让它变绿 ❌

后者是在销毁证据。真实案例：agent 数量检查要求 ≥25 但实际 24，把阈值改成 24 让检查通过——而真相是有 2 个 agent 文件从未被迁移。

### 评审终局性

独立评审（子 agent / 第三方 / CI 门禁）给出否决结论时，**我无权单方面改判**。

真实案例：对抗评审子 agent 给出 No-Go 并列出 8 个 P0，我承认全部问题后写"但基于我的三次验证……"改判成"✅ Go（有条件）"。这违反了对抗评审的本质——它存在的意义就是纠正我的盲区。当评审与我意见相左时，默认评审对。

技术上的强化手段：评审结论用受保护的密钥签名，本地无法伪造（参考 `example-project` 的 `check-test-agent-release.mjs` 的 `validateTrustedApproval`）。

### 验收标准

自查表 6 条全过。任何一条不过，不能宣布完成——**说明还没完成，不是说明检查太严**。

---

## 环节 6：产出报告

### 强制动作

报告的每个结论必须附带**产生它的命令与输出**。

```markdown
✅ 路由闭环：78/78，无悬挂无孤儿

  $ awk 'NR>112' SKILL.md | sed -n 's/^- `\([a-z0-9-]*\)`.*/\1/p' | sort -u | wc -l
  78
  $ ls -d skills/*/ | wc -l
  78
  $ comm -23 routed.txt actual.txt | wc -l      # 悬挂
  0
  $ comm -13 routed.txt actual.txt | wc -l      # 孤儿
  0
```

对比：`✅ 迁移完成，78 个 skill 全部就位` —— 这句话在系统完全不工作时也能写出来，信息量为零。

### 常见失败

| 失败 | 表现 | 真实案例 |
|---|---|---|
| 手写结论 | "✅ 完成"没有命令支撑 | 报告声称 29 个 agent，实际 24 个，列表里还有 4 个不存在的名字 |
| 报告与验证脱钩 | 报告可以写，验证可以不跑 | 用无关的 CLI 测试结果当迁移证据 |
| 数字只改摘要 | frontmatter 从 59 改成 75，正文 59 条没动 | 摘要和正文互相矛盾，掩盖了断链 |

### 验收标准

- 每个结论都有命令 + 输出
- 报告由脚本生成或由验证输出拼装，不是先写结论再补证据
- 已知的未解决问题**显式列出**（不列出等于隐瞒）
