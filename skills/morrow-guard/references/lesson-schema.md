# 教训结构化格式

> 示例中的项目、分支和提交标识已脱敏；历史验证记录不代表本仓库包含原始坏样本。

每条教训一个 YAML 文件，存于 `lessons/<slug>.yaml`。跨项目累积，自动进化。

## Schema

```yaml
# lessons/routing-closure-bidirectional.yaml
id: routing-closure-bidirectional
slug: routing-closure-bidirectional
created: 2026-07-29
updated: 2026-07-29
status: active  # active | archived | needs-review

# 描述
title: 路由表必须双向闭环检查
category: verification-design
severity: P0

# 来源
source:
  project: example-project
  task: 示例工具迁移
  failure_date: 2026-07-28
  known_bad_fixture:
    ref: example/known-bad-snapshot
    commit: REDACTED_COMMIT
    repo: /path/to/example-project

# 问题
problem:
  phenomena:
    - 删除了 3 个 skill，路由表仍有 3 个条目指向它们（dangling）
    - 新增了 19 个 skill，路由表无对应条目（orphan）
  root_cause: 只检查"路由表里的文件是否存在"（单向），漏掉"文件是否都被路由"
  phase: 4  # 对应 6 环节中的哪个

# 解决方案
solution:
  assertion_type: bidirectional-closure
  strength: L3  # L0-L5
  implementation:
    script: scripts/check-routing-closure.mjs
    invocation: node scripts/check-routing-closure.mjs
  verified_with_fixture: true  # 是否已用 known-bad 反验
  verification_date: 2026-07-29

# 可复用性
reusable:
  pattern: 双向闭环（Registry ↔ Files）
  applies_to:
    - 任何有路由表/注册表/索引的系统
    - agent 引用 ↔ skill 存在
    - package.json dependencies ↔ node_modules 实际安装
  reference: references/assertion-patterns.md#1-双向闭环

# 演进
evolution:
  hits: 1  # 命中次数（guard 模式下遇到类似场景时 +1）
  last_hit: 2026-07-29
  false_positives: 0
  false_negatives: 0

# 关联
related:
  - count-consistency  # 计数一致性（常一起出现）
  - artifact-based-verification  # 从制品验证
```

## 字段说明

### 基础字段

- `id` / `slug`: 唯一标识（kebab-case）
- `created` / `updated`: 时间戳
- `status`: 
  - `active` — 正在使用
  - `archived` — 已彻底解决（如上了 L4 门禁），可归档
  - `needs-review` — 长期 `hits: 0`，可能是断言空了或场景罕见

### 描述

- `title`: 一句话（< 60 字符）
- `category`: 类别（见下文分类）
- `severity`: P0（阻断发布）/ P1（应修复）/ P2（优化项）

### 来源

- `source.project`: 哪个项目出的问题
- `source.known_bad_fixture`: 保留坏样本的位置（commit / 分支 / 快照路径）

### 问题

- `problem.phenomena`: 具体错误（多条，每条一句话）
- `problem.root_cause`: Why-Why 递进后的根因
- `problem.phase`: 对应 6 环节的哪个（1-6）

### 解决方案

- `solution.assertion_type`: 断言类型（见下文分类）
- `solution.strength`: L0-L5 等级
- `solution.implementation`: 可执行脚本 + 调用方式
- `solution.verified_with_fixture`: **关键** — 是否已用 known-bad 反验（铁律 2）

### 可复用性

- `reusable.pattern`: 对应 `assertion-patterns.md` 的哪个模式
- `reusable.applies_to`: 适用场景（列表）

### 演进

- `evolution.hits`: 命中次数（自动累积）
- `evolution.false_positives`: 误报次数（断言报错但系统实际正确）
- `evolution.false_negatives`: 漏报次数（断言通过但系统实际有问题）

### 关联

- `related`: 关联的其他教训（slug 列表）

## 分类

### category 枚举

- `verification-design` — 验证设计缺陷（用错指标、测错对象）
- `goal-misalignment` — 目标函数错位
- `artifact-mismatch` — 交付物与验证对象不一致
- `dangerous-ops` — 破坏性操作风险
- `tool-reliability` — 验证工具不可信
- `confirmation-bias` — 确认性偏差、自我覆盖
- `knowledge-decay` — 经验未固化

### assertion_type 枚举

- `bidirectional-closure` — 双向闭环
- `count-consistency` — 计数一致性
- `path-shape` — 路径形状
- `artifact-based` — 从制品验证
- `reverse-verification` — 反向验证（mutation）
- `tool-validation` — 工具自检

## 命中计数机制

guard 模式下，每次注入约束时检查当前项目是否匹配某条教训的 `applies_to`：

```javascript
// 伪代码
for (const lesson of loadAllLessons()) {
  if (matchesContext(lesson.reusable.applies_to, currentProject)) {
    lesson.evolution.hits += 1;
    lesson.evolution.last_hit = new Date().toISOString();
    saveLessson(lesson);
    
    console.log(`📌 命中教训: ${lesson.title}`);
    injectConstraint(lesson);
  }
}
```

## 归档规则

当满足以下条件时，教训可标记为 `archived`：

- `solution.strength === 'L4'`（已上门禁，强制执行）
- `evolution.false_positives === 0`（无误报）
- `evolution.hits > 3`（经过充分验证）

归档后仍保留文件，但 guard 模式不再主动注入（除非用户显式启用 `--include-archived`）。

## needs-review 触发

自动标记规则：

```javascript
if (lesson.evolution.hits === 0 && daysSince(lesson.created) > 90) {
  lesson.status = 'needs-review';
  lesson.review_reason = '创建 90 天未命中，可能场景罕见或断言失效';
}

if (lesson.evolution.false_negatives > 0) {
  lesson.status = 'needs-review';
  lesson.review_reason = `漏报 ${lesson.evolution.false_negatives} 次，断言可能有漏洞`;
}
```

用 `scripts/lesson-stats.mjs --needs-review` 查看待复核清单。

## 示例：完整的一条教训

```yaml
id: jar-excluded-by-gitignore
slug: jar-excluded-by-gitignore
created: 2026-07-29
updated: 2026-07-29
status: active

title: JAR 被 .gitignore 排除导致交付物残缺
category: artifact-mismatch
severity: P0

source:
  project: example-project
  task: 示例工具迁移
  failure_date: 2026-07-28
  known_bad_fixture:
    ref: example/known-bad-snapshot
    commit: REDACTED_COMMIT
    repo: /path/to/example-project

problem:
  phenomena:
    - 工作区里 3 个 JAR 都在，git archive 制品里 0 个
    - 用户安装后覆盖率能力直接残废
  root_cause: 验证在工作区（ls 能看到），交付物是 tarball（.gitignore 排除了 *.jar）
  phase: 4

solution:
  assertion_type: artifact-based
  strength: L3
  implementation:
    script: scripts/verify-from-artifact.sh
    invocation: bash scripts/verify-from-artifact.sh npm 'tar tzf *.tgz | grep -c "\.jar$"'
  verified_with_fixture: true
  verification_date: 2026-07-29

reusable:
  pattern: 从制品验证
  applies_to:
    - 任何有 .gitignore / package.json#files / .dockerignore 的项目
    - npm 包发布
    - Docker 镜像构建
    - git archive 打包
  reference: references/assertion-patterns.md#4-从制品验证

evolution:
  hits: 1
  last_hit: 2026-07-29
  false_positives: 0
  false_negatives: 0

related:
  - template-excluded-by-gitignore  # 类似：template 目录被排除
```

## 新增教训的流程

1. **retro 模式**：分析失败，填写 YAML
2. **验证断言**：`scripts/verify-assertion.mjs <lesson-slug>` 用 known-bad fixture 反验
3. **落盘**：`lessons/<slug>.yaml`
4. **下次 guard 模式自动注入**：hits +1，演进数据自动更新
