# morrow-architecture-design

> **决策优先的架构设计与项目骨架初始化 skill**
> 基于 PRD / 业务背景，自动探测 Greenfield / Brownfield，生成经过关键决策验证的架构文档集与可开工项目骨架。

[![evals](https://img.shields.io/badge/evals-4%20cases%20·%2054%20assertions-blue)]() [![mode](https://img.shields.io/badge/mode-Greenfield%20%2F%20Brownfield-orange)]()

评测数量表示已有场景定义，不表示全部通过。实测范围和已知问题见 [验证记录](../../reports/morrow-architecture-design-validation-2026-09-05.md)。

---

## 0. 使用场景速查（What / When / How）

> **先判断自己处在哪种场景，再从"典型触发词"里挑一句；skill 会自动识别形态（Greenfield / Brownfield）并切换产物组织方式。**
>
> ⚠️ **防止 skill 选错**：如果你环境里同时存在多个架构类 skill，请在触发语中**显式带上 skill 名 `morrow-architecture-design`**（或斜杠命令 `/morrow-architecture-design`），确保命中本 skill 而不是其他同名工具。

### 三种场景一览（含触发词）

| # | 场景 | 触发条件（你现在手上有什么） | 典型触发词（建议显式带 skill 名） | 产物组织 | 关键产物 |
|---|------|--------------------------------|------------------------------------|----------|----------|
| **S1** | **全新项目从 0 到 1** | 空目录（或只有 README）+ PRD / 业务背景 |  "用 **morrow-architecture-design** 根据 `<path>/PRD.md` 做一次架构设计"<br>· "调用 **morrow-architecture-design** 基于这份需求做技术选型 + 项目骨架"<br>· "走 **morrow-architecture-design** 流程，把这份 PRD 转成可开工骨架"<br>· "用 **morrow-architecture-design** 给这个新项目做系统设计 + ADR + OpenAPI"| 首个版本 `v0.1.0` merge 进空白根级 | 12–20+ 份架构文档 + `openapi.yaml` + 技术栈骨架 |
| **S2** | **存量项目加新模块 / 迭代演进** | 已有代码库（`pom.xml` / `package.json` / `go.mod` 等）+ 本次新增需求 |  "用 **morrow-architecture-design** 给这个老项目加 `<模块>`，先做架构设计"<br>· "调用 **morrow-architecture-design** 对现有 `<模块>` 做架构升级 / 重构设计"<br>· "走 **morrow-architecture-design** 流程：新增 `<模块>` 能力 + ADR + API"<br>· "用 **morrow-architecture-design** 做一次版本迭代设计，这次动 `<模块A>` + `<模块B>`"<br>· "用 **morrow-architecture-design** 把 `<模块>` 从单体拆成独立服务"<br><br> | 新开版本目录 `v{x.y.z}`（次版本 / 修订号 +1）；Phase 10.5 把 delta 合并到已有根级 | 版本 `delta.md` + `adaptation-summary.md` + 根级累积态刷新 |
| **S3** | **老项目首次补架构文档** | 已有代码库但**无** `ai-docs/` | "用 **morrow-architecture-design** 给这个老项目补一套架构文档"<br>· "调用 **morrow-architecture-design** 反推这个 legacy 系统的 baseline 架构"<br>· "走 **morrow-architecture-design** 流程：架构盘点 + 风险登记 + ADR 补档"<br>· "用 **morrow-architecture-design** 帮我把当前项目现状画出来，产出 baseline-architecture"<br><br>| `mode=brownfield` + 首个版本 `v0.1.0`；Phase 0.3 先产出 `baseline-architecture.md` | baseline 快照 + `adaptation-summary.md` + Do-Not-Touch 清单（**不改任何源码**） |

### 两句话决策树

1. **当前目录空不空？** 空（或只有 README）→ **S1**。
2. **非空：`ai-docs/` 有没有？** 没有 → **S3**（先铺 baseline 再考虑后续）；已有 → **S2**（直接开新版本目录）。

### 场景无关的前置动作（所有场景都要做）

- **准备 PRD 或业务背景**：哪怕一句话都行，skill 会进入强引导模式补问。
- **明确本次涉及的模块**：用于 `delta.md` / `adaptation-summary.md` 内部分组（kebab-case，且与 `baseline-architecture.md §1` 组件名对齐）；版本目录本身按 SemVer 版本号 `v{x.y.z}` 命名，与模块名解耦。
- **允许 skill 读写 `ai-docs/`**：所有累积态 + 版本决策过程都落在这里。

### 不适用的场景（请换工具）

| 诉求 | 用什么 |
|------|--------|
| 只想改一行代码 / 修 bug | 直接让 Claude 改，别走架构 skill |
| 只要一份 API 设计（无需组件/部署/ADR） | 用更轻的 API-only skill |
| 只要 PRD 评审 / 需求拆分 | 用 product 类 skill |
| 只要跑一次代码审查 | 用 `/review` 或 `pr-review-toolkit` |

---

## 1. 这个 skill 做什么

把**"业务输入（PRD + 背景 + 约束）"**转成**"经过关键决策验证的可开工项目基础设施"**。

不是简单生成一份架构说明；而是通过 **19 条强制门禁 + 12 阶段工作流**完成：

- 问题边界与约束显式建模（US / FR / SC / C 编号）
- 项目宪法（NON-NEGOTIABLE 原则）锁定
- **反工程化双审**：初审 + 风险分析后复审
- 至少两套候选方案比较 + 推荐理由 + 不推荐其他方案的原因
- 风险与演进独立文档（V / W / E 编号）
- ADR 基线 4 份 + 动态触发清单追加
- Brownfield 变更矩阵（adaptation-summary）+ Do-Not-Touch 清单
- 12–20+ 份结构化架构文档 + API 契约 + 模块骨架

---

## 2. 解决什么痛点

| 痛点 | 本 skill 如何应对 |
|------|-------------------|
| "架构文档很全但关键决策没讲清" | 19 条强制门禁卡住每个决策节点；ADR 必须含"涉及宪法条款 + 关联 FR" |
| "老项目改造总是被当新项目重做" | Phase 0.3 自动探测 Brownfield；Phase 10 硬约束不重建现有模块 |
| "文档写着为未来预留却说不清为啥" | Phase 4 反工程化初审 + Phase 8.5 复审双重追问 |
| "ADR 写了 4 份就不想写了" | `references/adr-trigger-checklist.md` 给 7 大类 30+ 触发器，强制动态追加 |
| "需求编号和 API / ADR 对不上" | Phase 12 终审校验 US↔FR↔SC↔ADR↔API 闭环 |

---

## 3. 核心能力

### 3.1 双形态自动分岔

| Phase | Greenfield（全新项目） | Brownfield（已有项目） |
|-------|------------------------|------------------------|
| 0.3 探测 | 探测为空目录 | 扫 `pom.xml` / `package.json` / `go.mod` 等强信号 |
| 0.5 宪法 | 从零锁定 | 对照现有代码检"已知违反"并登记豁免 |
| 4 候选方案 | 候选 A = 最简 V0 | 候选 A = 保留现状 + 增量改造 |
| 5 组件 | 从 PRD 新识别 | 以 baseline 为起点，每个组件标 `change_scope` |
| 6 技术栈 | 强制与用户确认 | 自动继承现有栈，引入新栈必须走 ADR |
| 10 骨架 | 按栈生成最小骨架 | 不重建模块，仅追加 `docs/` + 产出 `adaptation-summary.md` |

### 3.2 编号系统闭环

10 类编号互相回链，Phase 12 机器可校验：

```
R-xxx (角色) ──┐
G-xxx (目标) ──┤
US-xxx (场景) ─┼─→ FR-xxx (功能需求) ─→ SC-xxx (成功标准)
C-xxx (约束) ──┘                       │
                                       ↓
P-xxx (宪法原则) ←─── ADR-xxx ←──── API 接口表
                      ↓
                V-xxx / W-xxx / E-xxx (风险 / 取舍 / 演进触发)
```

### 3.3 强门禁体系

- **19 条强制执行规则**（SKILL.md §强制执行规则）——任一未满足禁止进入下阶段
- **24 项终审 checklist**（Phase 12）——含 Constitution Re-check
- **每份模板的"一句话判定"自检**——提供产物质量基线

### 3.4 支持技术栈骨架（第一版）

| 栈 | 适用场景 |
|----|----------|
| Java + Spring Boot | 核心服务 / BFF / 集成服务 / Worker |
| Python + FastAPI | AI 服务 / 轻量 API / 数据处理 |
| Vue 3 + TypeScript + Vite | 管理台 / 门户 / 运营台 |
| Go + Gin | 网关 / 轻量 API / 高并发中间服务 |
| Android Kotlin | 原生 Android 客户端 |
| Flutter | 跨端移动端 |

未覆盖栈走降级策略：保留完整架构设计 + 通用目录骨架 + 明确标注"缺少专用 skeleton"。

### 3.5 版本迭代式产物组织

架构设计不是一次性工作——新模块、新业务、大版本演进都需要**连续迭代**。本 skill 采用 **"累积态 + 版本决策过程"** 双层组织：

- **累积态文档**（`ai-docs/architecture/*.md` 与 `ai-docs/apis/*.md`）= 当前系统全量快照，永远回答"系统现在长啥样"
- **版本决策过程**（`versions/v{x.y.z}/`）= 每次架构迭代的候选方案 / delta / 终审报告，永远回答"这次为啥这么改"

对应 git：累积态 = `main`；版本 = 一次 feature PR 的完整记录。对应 API：累积态 = `openapi.yaml` 单一源头；版本 = `delta.md` 增量。

每次版本终审通过后走 **Phase 10.5 Merge**，把 版本 `delta.md` 自动合并到累积态——保证"看根级 = 看当前全貌，看版本 = 看当时决策"，互不污染。完整规范见 §7。

---

## 4. 对标主流框架

| 能力 | 本 skill | spec-kit | BMad | Superpowers |
|------|:-:|:-:|:-:|:-:|
| 项目宪法 (NON-NEGOTIABLE) | ✅ | ✅ | ⚠️ | ❌ |
| Brownfield 自动探测 | ✅ | ❌ | ⚠️ | ❌ |
| 反工程化双审 | ✅ | ❌ | ❌ | ❌ |
| ADR 动态触发清单 | ✅ 7 大类 | ⚠️ | ⚠️ | ❌ |
| 风险与演进独立文档 | ✅ V/W/E | ❌ | ❌ | ❌ |
| adaptation-summary 变更矩阵 | ✅ | ❌ | ❌ | ❌ |
| 19 条强制门禁 | ✅ | ✅ | ⚠️ | ✅ |
| 可机器执行 evals | ✅ 54 assert | ❌ | ❌ | ✅ |

**定位**：在"架构设计单点"上**超越 spec-kit，持平或超 BMad 架构 agent，延续 Superpowers 门禁精神**。

---

## 5. 快速上手

### 5.1 触发

用户向 Claude 说任意触发词（见 `SKILL.md §触发词`），例如：

```
"根据 tests/product-prd.md 做一次架构设计"
"给这个老项目做技术选型和 ADR"
"帮我把这个 PRD 转成项目骨架"
```

Claude 会自动加载本 skill 并进入 Phase 0 输入诊断。

### 5.2 典型对话

```
用户: 基于 examples/mid-size-saas-prd.md 做架构设计

skill: [Phase 0.3] 探测到当前目录为空 → mode=greenfield
       [Phase 0.5] 请确认项目宪法 NON-NEGOTIABLE 原则：
         P-001 多租户数据隔离...
         P-002 AI 输出必须经 Schema 校验...
         [继续提问]
       ...
```

### 5.3 Brownfield 场景预备

若在存量项目目录跑 eval，需先铺 mock baseline：

```bash
bash scripts/bootstrap-brownfield-mock.sh <target_dir>
# 可选：--dry-run 预览 / --force 覆盖
```

---

## 6. 目录结构

```
morrow-architecture-design/
├── SKILL.md                       # 给 Claude 读的完整工作流定义（19 条门禁 + 12 Phase）
├── AGENT.md                       # 给 AI 索引系统读的元数据 + FAQ
├── README.md                      # 本文件（给人读的入口）
├── templates/                     # 21 份产物模板（project-mode / constitution / adr / ...）
├── skeletons/                     # 6 种技术栈骨架（.template 后缀）
├── references/                    # 技术路线 / ADR 触发清单 / 形态探测规则
├── examples/                      # 4 份样例 PRD（3 Greenfield + 1 Brownfield）
├── evals/                         # 评测资产：evals.json + 手动模板 + scorecard
└── scripts/
    ├── verify.sh                  # 结构自检
    └── bootstrap-brownfield-mock.sh   # Brownfield eval 环境引导
```

---

## 7. 产物组织规范

> **核心哲学**：当前态与决策过程**分层**。根级累积刷新 / 版本永久冻结。对标 spec-kit `specs/NNNN-xxx/` + git `main` 分支 + `openapi.yaml` 单一源头的组织思路。

### 7.1 完整目录图

```
ai-docs/
├── architecture/                          # ━━ 架构文档根 ━━
│   │  ── 累积态：每次版本 merge 后刷新 ──
│   ├── constitution.md                    # 跨版本不变（版本号递增）
│   ├── project-mode.md                    # 项目形态（一次性）
│   ├── baseline-architecture.md           # Brownfield 基线快照
│   ├── architecture-overview.md           # 累积总览（含 版本索引）
│   ├── logical-architecture.md            # 当前组件全景图
│   ├── physical-architecture.md           # 当前部署拓扑
│   ├── capability-model.md                # 累积能力清单
│   ├── domain-model.md                    # 累积领域模型
│   ├── data-model.md                      # 全量 DDL
│   ├── risk-and-evolution.md              # 累积 V/W/E 登记
│   ├── adr/                               # 全局 ADR（跨版本唯一编号）
│   │   └── ADR-001…xxx.md
│   │
│   └── versions/                          # ── 每次版本：永久冻结决策过程 ──
│       ├── v0.1.0/                        # 首个版本（整体架构）
│       │   ├── README.md                  # 本轮 scope + 关联 ADR 清单
│       │   ├── requirement-analysis.md    # 本次新需求 US/FR/SC
│       │   ├── architecture-drivers.md    # 本次新驱动因素
│       │   ├── solution-options.md        # 候选方案 + §8/§8.5 反工程化
│       │   ├── delta.md                   # 本次相对上版的增删改（三段式）
│       │   ├── adaptation-summary.md      # Brownfield 独有
│       │   └── final-validation-report.md # 本次终审
│       └── v0.2.0/                        # 下个版本（多模块联合迭代，模块差异写在 delta.md 内部）
│
└── apis/                                  # ━━ API 文档根 ━━
    │  ── 累积态：每次版本 merge 后刷新 ──
    ├── api-design.md                      # 接口总表（含"服务于 FR-xxx"列）
    ├── openapi.yaml                       # 单一源头（breaking 即 bump info.version）
    ├── api-contract-mapping.md            # 双产物映射
    ├── contracts/                         # 稳定后的契约（从版本目录升级而来）
    │
    └── versions/                          # ── 每次版本：永久冻结 ──
        ├── v0.1.0/
        │   ├── README.md                  # 本轮新增/改动接口清单
        │   ├── delta.md                   # 相对上版的增删改（+/-/~）
        │   └── contracts/                 # 本轮新契约草案（稳定后升级到根级）
        └── v0.2.0/
```

### 7.2 累积态 vs 版本决策过程 职责划分

| 文档类型 | 位置 | 职责 | 更新节奏 | Git / API 类比 |
|----------|------|------|----------|----------------|
| **累积态** | 根级 `architecture/*.md` / `apis/*.md` | 回答"系统现在长啥样" | Phase 10.5 自动 merge 刷新 | `main` 分支当前态 / `openapi.yaml` |
| **冻结决策过程** | `versions/v{x.y.z}/` | 回答"这次为啥这么改、当时怎么比较的" | 版本终审通过后**永不修改** | feature PR 的完整记录 |
| **全局 ADR** | `architecture/adr/` | 跨版本引用的不可变决策 | 追加写 + 既有 ADR 可 bump 版本号节（v2 / v3）| git tag |
| **单一源头契约** | `apis/openapi.yaml` | 当前全量 API 契约 | Phase 10.5 merge；breaking 时 bump 主版本 | `openapi.yaml` 单一真相 |

### 7.3 版本命名约定

版本号遵循 [SemVer](https://semver.org/lang/zh-CN/) 语义化规范，格式 **`v{x.y.z}`**（可选预发标签 `-alpha.1` / `-rc.1`），正则 `^v\d+\.\d+\.\d+(-[a-z0-9.-]+)?$`。

| 情境 | 命名约定 | 示例 |
|------|----------|------|
| 首个版本（系统首次架构） | `v0.1.0` | `v0.1.0` |
| 后续小迭代（次版本号递增） | `v0.x.0` | `v0.2.0` / `v0.3.0` |
| Bugfix / 补丁版本（修订号递增） | `v0.x.y` | `v0.1.1` |
| 主版本（含 breaking） | `vN.0.0` | `v1.0.0` |
| 预发版本 | `vX.Y.Z-{tag}` | `v0.1.0-alpha.1` / `v0.2.0-rc.1` |

**硬约束**：
- 架构侧与 API 侧（`architecture/versions/` 与 `apis/versions/`）的版本目录**按版本号对齐**，同一次版本必须用相同的 `v{x.y.z}`
- 一个版本可同时承载多模块决策；模块差异在 `delta.md` 内部分行表达，不再以模块切目录
- 命名冲突时 Phase 0.3 必须提示用户 bump 版本号（次版本 / 修订号 +1），不允许静默覆盖

### 7.4 Brownfield 模块级文件命名

老模块 `<module>/docs/` 下的版本级文件必须按版本号绑定，避免多次覆盖：

```
<module>/docs/
├── index.md                          # 累积：本模块当前态
├── architecture.md                   # 累积：本模块架构
├── adaptation-todo-v0.1.0.md         # 绑定 v0.1.0
└── adaptation-todo-v0.2.0.md         # 绑定 v0.2.0
```

命名规则：**`adaptation-todo-v{x.y.z}.md`**。原 `adaptation-todo.md`（无版本号后缀）及旧版 `adaptation-todo-sprint-{module}.md` 自本次迁移起弃用。

### 7.5 Phase 10.5 Version Merge 机制

每次版本在 Phase 12 终审之前必须跑 **Phase 10.5 Merge checkpoint**，把 `delta.md` 结构化三段自动合并到累积态。失败即拒绝进入 Phase 11。

#### 7.5.1 delta.md 结构约束（架构侧 + API 侧共用）

```markdown
# v{x.y.z} Delta

## 新增
- 组件 / 实体 / DDL / 接口 / ADR / 风险（V-xxx） ...

## 修改
- 既有组件行为 / 既有表字段 / 既有接口 breaking 标记 ...

## 删除
- 下线组件 / 废弃接口 / 合并 ADR ...
```

#### 7.5.2 架构侧 merge 规则

| `delta.md` 产物 | 合并到根级哪里 | 合并动作 |
|-----------------|----------------|----------|
| 新增组件 | `logical-architecture.md` | 组件图追加节点 + `§组件清单` 追加行 |
| 新增部署节点 | `physical-architecture.md` | 拓扑图追加 + `§部署清单` 追加行 |
| 新增领域实体 | `domain-model.md` | 追加实体定义 + 状态机 |
| 新增 DDL | `data-model.md` | 追加表定义（保留原表） |
| 新增能力 | `capability-model.md` | 追加能力条目 |
| 新增风险 V/W/E | `risk-and-evolution.md` | 编号继续递增，附"引入于 v{x.y.z}" |
| 新增 ADR | `adr/ADR-NNN.md` | 直接落位（编号全局递增） |
| 修改既有 ADR | `adr/ADR-NNN.md` | 新增版本号节（v2 / v3）+ 超链到版本 |
| 删除 / 下线组件 | `logical-architecture.md` + 对应 ADR | 标 `deprecated`，一个 release 后真删 |

#### 7.5.3 API 侧 merge 规则

| `delta.md` 产物 | 合并到根级哪里 | 合并动作 |
|-----------------|----------------|----------|
| 新增接口 | `openapi.yaml paths:` + `api-design.md §接口总表` | 追加 path + Schema + 总表含 `FR-xxx` 列 |
| 修改接口 breaking | `openapi.yaml` | 字段级 merge + 强制 bump `info.version` 主版本 |
| 修改接口非 breaking | `openapi.yaml` | 字段级 merge（次版本号 +1） |
| 删除接口 | `openapi.yaml` | 先标 `deprecated: true`，保留一个 release cycle |
| 新增 FR↔接口映射 | `api-contract-mapping.md` | 追加映射关系 |
| 稳定契约 | `apis/versions/v{x.y.z}/contracts/*` → `apis/contracts/` | 稳定后升级到根级 |

#### 7.5.4 Merge 后根级文档顶部标注

每份累积态文档顶部维护"最近刷新"行：

```markdown
> Last updated: v0.2.0 (2026-08-12) — 新增 payment-service 组件 / payment_order 表 / V-017
```

### 7.6 机器可验的断言（verify.sh 扩展）

| 断言 | 校验方式 |
|------|----------|
| 每个版本目录包含 `delta.md` | `test -f ai-docs/{architecture,apis}/versions/*/delta.md` |
| 架构 / API 两侧版本目录命名同步对齐 | diff 两侧 `versions/` 的 `ls` 结果 |
| `delta.md` 包含完整的三段（新增 / 修改 / 删除）| grep 标题正则 |
| 根级 `openapi.yaml` `info.version` 与最新版本的 breaking 标记一致 | 解析 YAML + 比对版本 `delta.md §修改` |
| 根级 `api-design.md` 接口总数 ≥ 所有版本 delta `§新增` 之和 | 行数计数 |
| 根级 `logical-architecture.md` 组件清单 ≥ baseline + 所有版本新增组件 | 组件名 grep |
| 每份累积态文档顶部含 `Last updated: v{x.y.z}` 行 | grep |

### 7.7 一句话速记

**"根级 = 当前完整态（类比 `openapi.yaml`）；`versions/v{x.y.z}/` = 每次决策过程（类比 feature PR）；Phase 10.5 自动 merge delta 刷根级。首次架构 = `v0.1.0` merge 进空白根级；后续增量规则一致，无特例。"**

---

## 8. 评测与自检

### 8.1 结构自检（每次改 skill 后必跑）

```bash
bash scripts/verify.sh
# 期望输出：architecture skill verification passed
```

校验 90+ 项：模板完整性、关键字段、外部索引引用、skeleton 齐备性。

### 8.2 自动评测集

`evals/evals.json` 含 4 条 eval、54 条 assertions：

| ID | 场景 | mode | assertions |
|----|------|------|-----------|
| 1 | greenfield-minimal-guided | Greenfield 强引导 | 18 |
| 2 | greenfield-saas-semi-auto | Greenfield 半自动 | 12 |
| 3 | greenfield-unsupported-stack-fallback | Greenfield 降级 | 7 |
| 4 | brownfield-saas-extension | Brownfield 扩展 | 17 |

### 8.3 历史迭代成绩

| 迭代 | 静态完备度 | 运行时有效性 | 主要改进 |
|------|:-:|:-:|------|
| iter-1 | 9.07 | — | 基线结构立起 |
| iter-2 | 9.62 | — | R1-R5 重构（Constitution / 编号 / 风险独立 / 动态 ADR / 反 OE） |
| iter-3 | **9.88** | **7.5** | P0-P2 补齐（双模板 / Phase 8.5 门禁 / evals.json / Brownfield eval）|

iter-3 实战评测发现：**产物卡口型门禁真能拦住 AI；自查自纠型门禁依赖 AI 自觉**。详见 `morrow-architecture-design-workspace/iteration-3/static-vs-runtime-analysis.md`。

---

## 9. 扩展指南

### 9.1 新增文档模板

1. 在 `templates/` 下添加 `<your-template>.md`
2. 在 `SKILL.md §文档模板`清单登记
3. 在 `scripts/verify.sh` 加对应 `assert_path` + `assert_contains`
4. 跑 `bash scripts/verify.sh` 通过

### 9.2 新增技术栈骨架

1. 在 `skeletons/<stack>/` 下创建最小骨架（`.template` 后缀）
2. 至少含：`README.md` · `.gitignore.template` · 主构建文件 · 最小启动入口
3. 在 `SKILL.md §第一版正式支持技术栈` 登记
4. 在 `scripts/verify.sh skeletons` 数组加上栈名 + 关键模板路径

### 9.3 新增 ADR 触发类别

编辑 `references/adr-trigger-checklist.md`，在现有 7 大类（A 数据 / B 集成 / C 运行时 / D 安全 / E AI/LLM / F 可观测 / G 业务）基础上增加新类别，附"典型题目"让作者易于识别。

---

## 10. 常见问题（选摘，完整版见 AGENT.md §常见问题）

**Q: 用户只给一句业务背景怎么办？**
A: 进入强引导模式，先补问题定义、角色、关键场景和约束，再进入架构设计。

**Q: Brownfield 模式会改我的老代码吗？**
A: 不会。Phase 10 仅追加 `docs/` 目录和更新 README 中"相关 ADR"列表；变更项落到 `adaptation-summary.md` + `<module>/docs/adaptation-todo-v{x.y.z}.md`（按版本号绑定）。现有源码 / 构建配置 / CI 一律不触碰。

**Q: 技术栈没有对应 skeleton 怎么办？**
A: 输出选型建议和通用目录结构，明确标注"缺少专用 skeleton template"，不中断流程。

**Q: 什么时候算架构设计真正完成？**
A: 不是文档齐全就算完成，必须同时满足关键场景 / 驱动因素 / 候选方案 / 核心链路 / 数据边界 / 风险和演进策略都已说明，且 Phase 12 Constitution Re-check 实际通过。

---

## 11. 已知局限

1. **Brownfield eval 需手动铺 mock baseline**：`scripts/bootstrap-brownfield-mock.sh` 已覆盖，但断言执行器尚未落地
2. **自查自纠型门禁依赖 AI 自觉**：Mermaid 图示质量 / ADR 触发清单完备性 / Do-Not-Touch diff 等缺机械化校验（见 `static-vs-runtime-analysis.md §3.1`）
3. **混合项目场景未进 eval**：同仓库老模块走 Brownfield + 新模块走 Greenfield 的组合仅在流程定义中覆盖，未自动验证
4. **Phase 10.5 Merge 脚本只做"半自动" merge**：`scripts/merge-version.sh` 已落地（解析 delta.md 三段式 + 校验 + Last updated 标注 + breaking 提示），但 `openapi.yaml` 的 paths/schemas 字段级合并仍需 Claude 按 delta 手工补齐（避免引入 yq/openapi-merge 硬依赖）；SKILL.md / 模板 / verify.sh 已同步纳入版本化方案

---

## 12. 相关资源

- **完整工作流**：`SKILL.md`
- **模块元数据 + FAQ**：`AGENT.md`
- **形态探测规则**：`references/project-mode-detection.md`
- **ADR 触发清单**：`references/adr-trigger-checklist.md`
- **技术路线参考**：`references/技术路线-202512.md`（通用示例；原内部选型表已移除）
- **样例 PRD**：`examples/*.md`
- **评测资产**：`evals/evals.json` · `evals/manual-run-template.md` · `evals/scorecard.md`
- **历史问题归纳**：`evals/session-reviews/`（已脱敏，不作为当前版本验证通过的依据）

### 设计理念来源

- [github/spec-kit](https://github.com/github/spec-kit) — constitution / specify / plan / tasks 流程
- [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) — 多 agent 协作
- [obra/superpowers](https://github.com/obra/superpowers) — 门禁优先 + 自检驱动
- [Anthropic Skills Guide](https://docs.claude.com/en/docs/build-with-claude/agent-skills) — 渐进披露与 progressive loading

---

**当前版本**：iter-3 · 2026-04-20
**维护方式**：任何 skill 改动都必须跑 `bash scripts/verify.sh`；新增流程阶段同步更新 SKILL.md / AGENT.md / README.md 三处
