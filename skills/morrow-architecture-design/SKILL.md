---
name: morrow-architecture-design
description: 当用户希望基于 PRD、业务背景或项目目标完成系统架构设计、技术选型、模块拆分、项目骨架初始化、或对既有架构做迭代演进时使用；**自动探测 Greenfield（全新项目）与 Brownfield（已有项目）两种形态**：Greenfield 与用户交互确认组件、编程语言和技术栈；Brownfield 自动继承现有栈、产出 baseline 与变更矩阵（adaptation-summary），不重建已有模块。**每次架构设计按 `versions/v{x.y.z}/` 隔离决策过程**，Phase 10.5 Merge checkpoint 自动把 `delta.md` 三段式（新增 / 修改 / 删除）合并到根级累积态文档与 `openapi.yaml`，实现"根级 = 当前完整态 / versions/ = 每次决策过程"的双层组织。
---

# morrow-architecture-design

## 概述

本技能用于把“业务输入”转成“经过关键决策验证的可开工项目基础设施”。

它不是单纯生成一份架构说明，而是通过强门禁工作流完成以下目标：

- 明确系统问题边界、架构驱动因素和关键约束
- 对至少两套候选方案进行比较并完成关键取舍
- 明确系统包含哪些组件、边界、核心链路和数据关系
- 为每个组件确认编程语言和技术栈
- 生成关键架构决策记录（ADR）
- 动态创建项目模块目录和最小可开工骨架
- 生成完整的架构与 API 设计文档及可执行设计上下文

默认采用 **强引导模式**。如果用户已经提供了组件列表、语言偏好和技术约束，则自动切换到 **半自动模式**。

## 强制执行规则

**禁止跳过关键决策确认点直接创建设计产物。**

在以下任一条件未满足前，禁止创建模块目录或生成最终架构文档：

1. 问题边界与关键场景未确认
2. **项目形态（Brownfield / Greenfield）未自动探测并输出 `project-mode.md`**
3. **Brownfield 模式下，`baseline-architecture.md` 未产出**
4. **版本目录未创建**（`ai-docs/architecture/versions/v{x.y.z}/` + `ai-docs/apis/versions/v{x.y.z}/` 必须按版本号对齐，Phase 0.3 末尾产出）
5. **需求 / 场景 / 成功标准未编号**（US-xxx / FR-xxx / SC-xxx）
6. **项目宪法（NON-NEGOTIABLE）未锁定**
7. 架构驱动因素未提炼
8. 候选方案未比较（Brownfield 候选 A 必须是"保留现状 + 增量改造"）
9. **Phase 4 §8 反工程化审视初审未完成**（"最简 V0 是什么 / 现在不做什么 / 三个追问"未落到 版本 `solution-options.md §8`）
10. 组件清单未确认（Brownfield 必须标 `change_scope`）
11. **Greenfield 模式下**，组件语言未与用户确认
12. 技术栈选型未确认（Brownfield 默认继承，偏离须有 ADR）
13. 核心链路与数据边界未明确
14. **风险与演进独立文档未产出**
15. **Phase 8.5 反工程化复审结论未回写**到 版本 `solution-options.md §8.5` 与 `risk-and-evolution.md §6`
16. 关键 ADR 未生成（基线 4 份 + 触发清单动态追加）
17. **版本 delta.md 未产出**（架构侧三段式 `## 新增 / ## 修改 / ## 删除` + API 侧同结构）
18. **Phase 10.5 Version Merge 未完成**（累积态 7 份架构文档 + `openapi.yaml` 未按 delta.md 三段刷新；每份累积文档顶部 `Last updated: v{x.y.z}` 行未写入）——**禁止进入 Phase 11**
19. **Constitution 终审 revalidate 未完成**

## 输出位置

### Skill 参考资产

- `references/技术路线-202512.md`：通用选型示例，不代表组织白名单
- `references/adr-trigger-checklist.md`：Phase 9 ADR 动态追加触发器
- `references/project-mode-detection.md`：Phase 0.3 Brownfield / Greenfield 探测规则
- `templates/`：架构文档与模块文档模板（含 `version-readme.md` / `version-delta.md` / `api-version-delta.md`）
- `skeletons/`：技术栈骨架模板
- `scripts/verify.sh`：结构自检
- `scripts/bootstrap-brownfield-mock.sh`：Brownfield eval 环境引导
- `scripts/merge-version.sh`：Phase 10.5 Version Merge checkpoint 合并脚本

### 产物组织总则

产物分**两层**：

1. **累积态**（根级 `ai-docs/architecture/*.md` 与 `ai-docs/apis/*.md`）—— 系统当前全量快照，每次版本 Merge 后刷新，回答"系统现在长啥样"
2. **决策过程**（`ai-docs/{architecture,apis}/versions/v{x.y.z}/`）—— 每次架构迭代的 scope / 候选方案 / delta / 终审报告；版本终审通过后**永不修改**，回答"这次为啥这么改"

完整规范见 `README.md §7`。

### 运行后产物 — 累积态（根级，每次版本 Merge 后刷新）

- `ai-docs/architecture/project-mode.md`（Phase 0.3 产出，Greenfield / Brownfield 判定，一次性）
- `ai-docs/architecture/baseline-architecture.md`（**仅 Brownfield 模式**，Phase 0.3 产出）
- `ai-docs/architecture/constitution.md`（Phase 0.5 产出，Phase 12 revalidate；跨版本不变，版本号递增）
- `ai-docs/architecture/architecture-overview.md`（累积总览，含 版本索引）
- `ai-docs/architecture/logical-architecture.md`（当前组件全景图；Phase 10.5 Merge 追加节点）
- `ai-docs/architecture/physical-architecture.md`（当前部署拓扑；Phase 10.5 Merge 追加节点）
- `ai-docs/architecture/capability-model.md`（累积能力清单）
- `ai-docs/architecture/domain-model.md`（累积领域模型）
- `ai-docs/architecture/data-model.md`（全量 DDL；Phase 10.5 Merge 追加表 / 字段）
- `ai-docs/architecture/risk-and-evolution.md`（累积 V / W / E 登记；Phase 10.5 Merge 追加编号）
- `ai-docs/architecture/adr/*.md`（全局 ADR；基线 4 份 + 按触发清单动态追加；跨版本唯一编号）
- `ai-docs/apis/api-design.md`（累积接口总表，含"服务于 FR-xxx"列）
- `ai-docs/apis/openapi.yaml`（单一源头；breaking 时 bump `info.version` 主版本）
- `ai-docs/apis/api-contract-mapping.md`（累积映射）
- `ai-docs/apis/contracts/*`（稳定后的契约；从版本目录升级而来）

每份累积态文档顶部维护 `> Last updated: v{x.y.z} (YYYY-MM-DD) — <本次变更概括>` 行。

### 运行后产物 — 版本决策过程（按版本隔离）

- `ai-docs/architecture/versions/v{x.y.z}/README.md`（本轮 scope + 关联 ADR 清单）
- `ai-docs/architecture/versions/v{x.y.z}/requirement-analysis.md`（本次新需求 US / FR / SC / C / A）
- `ai-docs/architecture/versions/v{x.y.z}/architecture-drivers.md`（本次新驱动因素）
- `ai-docs/architecture/versions/v{x.y.z}/solution-options.md`（候选方案 + §8 / §8.5 反工程化）
- `ai-docs/architecture/versions/v{x.y.z}/delta.md`（**结构化三段**：`## 新增 / ## 修改 / ## 删除`）
- `ai-docs/architecture/versions/v{x.y.z}/adaptation-summary.md`（**仅 Brownfield**）
- `ai-docs/architecture/versions/v{x.y.z}/final-validation-report.md`（Phase 12 终审）
- `ai-docs/apis/versions/v{x.y.z}/README.md`（本轮新增/改动接口清单）
- `ai-docs/apis/versions/v{x.y.z}/delta.md`（API 三段式 + breaking 标记）
- `ai-docs/apis/versions/v{x.y.z}/contracts/*`（本轮新契约草案；稳定后升级到根级）

### 运行后产物 — 模块骨架

- `<module>/README.md`
- `<module>/docs/index.md`
- `<module>/docs/architecture.md`
- `<module>/docs/adaptation-todo-v{x.y.z}.md`（**仅 Brownfield `change_scope=modify`**，文件名绑定版本号，避免多次覆盖）

## 执行流程

### Phase 0: 输入诊断

读取用户输入，提取以下信息：

- PRD 路径或正文
- 业务背景
- 用户角色
- 系统目标
- 已知组件
- 已知语言/技术偏好
- 部署或合规约束

如果连”业务目标 + 关键场景”都无法识别，则先向用户逐步澄清，不进入后续阶段。

接下来进入 Phase 0.3——**先探测项目形态**再做任何设计决策；这是 Brownfield 和 Greenfield 分岔的基础。

### Phase 0.3: 项目形态探测（Project Mode Detection）

在进入 Constitution 和需求建模之前，先**自动判定**当前工作目录是 Greenfield（全新项目）还是 Brownfield（已有项目）。两者在后续 Phase 的行为不同，不能混跑。

**探测方法**：读 `references/project-mode-detection.md` 获取完整规则。核心信号：

- **强信号**（任一命中即 Brownfield）：
  - 构建配置文件：`package.json` / `pom.xml` / `build.gradle` / `pyproject.toml` / `go.mod` / `Cargo.toml` / `pubspec.yaml` / `Podfile` / `*.csproj` 等
  - 源码目录非空：`src/` / `app/` / `lib/` / `internal/` / `cmd/` 下有 ≥ 1 个本语言源文件
  - 容器 / CI：`Dockerfile` / `docker-compose.yml` / `.github/workflows/*.yml` / `.gitlab-ci.yml`
- **反信号**（辅证 Greenfield）：工作目录除 `.claude/` / `tests/{PRD}.md` 外基本为空

**产物**：`ai-docs/architecture/project-mode.md`（≤ 30 行），含 `mode / confidence / 信号清单 / 推断栈`。

**两种路径**：

- **Brownfield**（命中强信号）：
  - **必须同时产出** `ai-docs/architecture/baseline-architecture.md`，按 `references/project-mode-detection.md §3` 抽取现有组件 / 技术栈 / 依赖 / 运行时 / 数据面
  - Phase 0.3 仅做**表层盘点**，不做业务逻辑分析（那是 Phase 5 的事）
  - 后续 Phase 的行为分岔见下表

- **Greenfield**（完全空白 / 仅元数据）：
  - 不产出 baseline
  - Phase 6 必须与用户确认编程语言和技术栈

| Phase | Brownfield 行为 | Greenfield 行为 |
|-------|-----------------|------------------|
| 0.5 | 宪法条款必须过一遍现有代码，检出已知违反并登记豁免期 | 从零锁定 |
| 4 | 候选 A **必须**是”保留现状 + 增量改造” | 候选 A 通常是”最简 V0” |
| 5 | 组件基于 baseline 盘点，每个组件标 `change_scope ∈ {keep, modify, new, remove}` | 从 PRD 新识别 |
| 6 | **自动继承现有栈**，跳过”与用户确认编程语言”；引入新栈时才问用户 + 写 ADR | **强制**与用户确认（或给推荐让用户选）|
| 10 | **不新建 module 目录**；仅追加 `docs/` 与更新 `README.md`；变更项落到 `adaptation-todo-v{x.y.z}.md`（按版本号绑定） | 按技术栈生成最小骨架 |

**手动覆盖**：若探测误判，用户可在 Phase 0.3 结束前显式切换 mode；`project-mode.md` 显式允许并记录手动覆盖原因。

**混合项目**（仓库既有老代码又要新建独立模块）：按”新建模块目录”粒度分别判定——老模块走 Brownfield，新模块走 Greenfield。

#### Phase 0.3 末尾：创建版本目录（NEW）

`project-mode.md` 产出后，必须立即创建本次版本的**两侧目录**（架构 + API 按版本号对齐）：

```
ai-docs/architecture/versions/v{x.y.z}/
ai-docs/apis/versions/v{x.y.z}/
```

**命名规则**（参见 `README.md §7.3`）：

| 情境 | 命名约定 | 示例 |
|------|----------|------|
| 首个版本（系统首次架构） | `v0.1.0` | `v0.1.0` |
| 后续小迭代（次版本号递增） | `v0.x.0` | `v0.2.0` / `v0.3.0` |
| Bugfix / 补丁版本（修订号递增） | `v0.x.y` | `v0.1.1` |
| 主版本（含 breaking） | `vN.0.0` | `v1.0.0` |
| 预发版本 | `vX.Y.Z-{tag}` | `v0.1.0-alpha.1` / `v0.2.0-rc.1` |

**硬约束**：

- 版本号必须遵循 [SemVer](https://semver.org/lang/zh-CN/) 语义化规范，正则 `^v\d+\.\d+\.\d+(-[a-z0-9.-]+)?$`
- 两侧目录（架构 + API）**同版本号对齐**
- 若 `ai-docs/architecture/versions/v{x.y.z}/` 已存在（老版本），必须向用户提示并要求 bump 版本号（次版本 / 修订号 +1），**禁止静默覆盖**
- 一个版本可同时承载多模块决策；模块差异在 `delta.md` 内部分行表达，不再以模块切目录

**产出**：两个空目录 + 各自 `README.md`（用 `templates/version-readme.md` 填骨架，`版本状态` 标为 `Draft`）。

**Phase 0.3 未完成（mode 未判定 **或**版本目录未创建），禁止进入 Phase 0.5。**

### Phase 0.5: 项目宪法锁定（Constitution Lock）

基于输入诊断，与用户共同锁定”跨阶段不变式”——即本项目中**违反 = 必须先修订宪法**的底线原则。

产物：`ai-docs/architecture/constitution.md`（使用 `templates/constitution.md` 模板）

必须包含：

- **核心原则（NON-NEGOTIABLE）≥ 3 条、≤ 7 条**，每条含：原则陈述、理由、违反后果、可观测手段
- **质量底线**：测试类型 / SLO 自动验证范围 / Test-First 是否不可协商
- **可观测性底线**：trace_id、日志字段、关键业务指标 ≥ 5 个
- **安全底线**：鉴权方式、信任边界、数据分级、禁入日志字段
- **架构底线**：禁止的依赖方向、禁止的跨模块调用、必须经过的收敛点

判定”是否可写进宪法”的一个问题：如果有人提 PR 违反了它，reviewer 能不能凭宪法一句话拒掉？不能，就不应写进宪法（应下沉到 ADR 或评审 checklist）。

**Brownfield 模式特殊要求**：锁定宪法时必须对照 `baseline-architecture.md` 过一遍，检出现有代码**已知违反**的条款，在宪法 §0 修订历史或专设的”已知违反 + 豁免”节登记：
- 违反的条款 / 违反点位置 / 临时豁免到期日 / 修复责任人
- 不允许”发现违反就悄悄改宪法宽松化”——宽松化必须走修订流程

**Phase 0.5 未完成，禁止进入 Phase 1。**
Phase 4 候选方案必须显式说明”不违反哪些宪法条款”；Phase 9 ADR 必须列出”涉及的宪法条款”；Phase 12 终审时必须做一次 Constitution Re-check。

### Phase 1: 问题定义与约束建模

先明确系统要解决的问题，而不是直接进入技术设计。至少输出：

- 核心业务目标（编号 G-xxx）
- 关键用户 / 角色（编号 R-xxx）
- 当前痛点与替代方案
- **核心场景清单（US-xxx）**：每条含主流程 + Given/When/Then 验收场景 + 优先级
- **功能需求清单（FR-xxx）**：技术无关的”系统必须做什么”
- **成功标准（SC-xxx）**：可量化、可验证
- 已知硬约束（C-xxx）
- 待验证假设

**产出位置**：`ai-docs/architecture/versions/v{x.y.z}/requirement-analysis.md`（本次版本新增 / 修改的需求）。跨版本不变的总目标 / 角色可在首个版本沉淀后，于根级 `architecture-overview.md` 追加引用。

**编号硬约束**：
- US / FR / SC / C / R / G 编号一经对外公布（进入 Phase 4 / 7 / 9 的其他文档），禁止重用或废弃回收。
- 编号**跨版本全局唯一递增**（例如 v0.1.0 用 US-001~013，v0.2.0 从 US-014 起）。
- 下游版本 `solution-options.md`、全局 `adr/*`、根级 `risk-and-evolution.md` 必须通过这些编号做回链。
- 没有编号 = 没法被下游引用 = Phase 12 的”需求闭环”门禁过不了。

如果无法回答”谁在什么场景下因为什么问题受影响”，则停止进入架构设计。

### Phase 2: 架构驱动因素提炼

基于 Phase 1 结果，提炼影响架构的驱动因素，至少包含：

| 驱动因素 | 类型 | 描述 | 对架构的影响 |
|----------|------|------|--------------|

驱动因素至少覆盖：

- 功能驱动项
- 非功能驱动项
- 集成驱动项
- 风险驱动项

其中非功能约束必须尽量量化；无法量化时，至少分级为高/中/低并说明依据。

**产出位置**：`ai-docs/architecture/versions/v{x.y.z}/architecture-drivers.md`（本次版本的新增 / 变化的驱动因素）。

### Phase 3: 模式判定

此处的"模式"指**信息完整度**，与 Phase 0.3 的"项目形态"（Brownfield / Greenfield）是**两个独立维度**。

| 项目形态 (Phase 0.3) | 信息完整度 (Phase 3) | 组合行为 |
|---------------------|----------------------|----------|
| Greenfield | 强引导 | 全流程逐项澄清；强制问语言和栈 |
| Greenfield | 半自动 | 关键决策自行拍板 + 显式记录假设；语言栈给推荐让用户确认 |
| Brownfield | 强引导 | 大量问"老系统现状 / 哪些要改"的补充问题；栈默认继承 |
| Brownfield | 半自动 | 基于 baseline 自行推断；栈默认继承；变更项显式记录 |

判定规则：

- **强引导**（默认）：用户只给 PRD/背景；关键组件 / 约束未明。
- **半自动**：用户已给出组件清单、语言偏好、主要约束。

模式判定结果（形态 + 完整度）必须显式告知用户。

### Phase 4: 候选方案比较与推荐

在正式拆组件前，至少给出 2 套候选方案。每套方案至少说明：

- 模块划分方式
- 部署形态
- 同步/异步集成方式
- 数据边界
- 优势
- 风险
- 适用条件

必须显式比较以下维度：

- 交付复杂度
- 扩展性
- 一致性与可用性取舍
- 团队匹配度
- 成本与运维复杂度
- 风险隔离（对关键 SLO 的影响）
- 演进到生产的路径

每个方案必须声明"不违反哪些宪法条款（P-xxx）"和"可能挑战的宪法条款"（若有）。后者必须在 Phase 4 结束前决定是否修订宪法。

如果用户未指定路线，必须给出推荐方案及不推荐其他方案的原因。

**产出位置**：`ai-docs/architecture/versions/v{x.y.z}/solution-options.md`（本次版本的候选方案比较）。

**必须同步产出"反工程化审视初稿"**（写入 版本 `solution-options.md §8`）：

- 最简 V0 是什么？推荐方案比 V0 多出了哪些东西？每项多出的理由是"已有证据（FR / SC）"还是"将来可能"？
- 现在明确不做的事（Parking Lot）：每条记录原因 + 未来触发纳入的信号
- 三个追问：
  1. 为什么不直接从方案 A 起步，出了瓶颈再拆？
  2. 推荐方案里哪 3 个组件未来 6 个月内最可能被删？
  3. 如果团队只有 1 个人，能不能只做 X 子集？

反工程化审视会在 Phase 8.5 **复审**一次，根据风险与演进分析的结论决定是否调整推荐方案。

### Phase 5: 组件识别与确认

**Greenfield 模式**：基于 PRD 和业务背景，输出组件清单。

**Brownfield 模式**：以 `baseline-architecture.md §1` 为起点；**不允许重新发明**已存在的组件名；对每个组件加 `change_scope` 列。

组件表（Brownfield / Greenfield 共用，Brownfield 必填 `change_scope`）：

| 组件 | 类型 | 职责 | 上游/下游 | 复杂度 | change_scope |
|------|------|------|-----------|--------|--------------|

`change_scope` 枚举：
- `keep`：本次不动
- `modify`：本次要改（ADR 必须说清楚改什么 / 为什么 / 影响）
- `new`：本次新增
- `remove`：本次下线 / 合并

组件命名遵循业务职责，不按技术命名。例如：

- `project-admin`
- `project-bff`
- `project-worker`
- `project-mobile`
- `project-gateway`

与用户确认：

- 是否有遗漏组件
- 是否需要拆分/合并
- 是否需要区分 BFF、核心服务、Worker、网关
- **Brownfield**：`change_scope` 分布是否合理？涉及 `modify / remove` 的组件是否已登记到 ADR / `risk-and-evolution.md V-xxx`？

**产出位置**：组件清单本身**不单独成文**，而是同步写入本版本 的 `delta.md`：

- `change_scope = new` 的组件 → 版本 `delta.md §新增 · 组件` 段
- `change_scope = modify` → 版本 `delta.md §修改 · 组件行为变更` 段
- `change_scope = remove` → 版本 `delta.md §删除 · 下线组件` 段
- `change_scope = keep` → 不写入 delta（本次无变更）

Phase 10.5 Merge 时，delta 里新增的组件会被追加到根级 `logical-architecture.md §组件清单` + 组件图。

**未确认组件清单，禁止进入下一阶段。**

### Phase 6: 语言与技术栈确认

本 Phase 按项目形态（Phase 0.3）分岔。

#### Brownfield 路径（自动继承）

- **默认继承** `baseline-architecture.md §2` 记录的现有栈
- **跳过**”与用户确认编程语言”步骤——既然是老项目，语言基本已经锁死
- **例外**：若本次有 `change_scope = new` 的组件，且该组件要用**与现有栈不一致**的新语言/框架，则必须：
  1. 单独向用户确认该新组件的语言和栈
  2. 新增一份 ADR（触发清单类别 E.1 / E.3），说明为什么引入异构栈、跨栈协作的契约、团队学习成本
  3. 在 `risk-and-evolution.md §5` 登记 W-xxx（”为什么现在不做统一栈”）
- **产物**：一份简表，标注”继承 / 新增 / 微调”：

| 组件 | 现有栈 | 本次栈 | 是否变更 | 变更理由 / ADR |
|------|--------|--------|----------|---------------|

#### Greenfield 路径（强制确认）

对每个组件给出如下表格：

| 组件 | 推荐语言 | 推荐技术栈 | 备选方案 | 决策理由 |
|------|----------|------------|----------|----------|

选型依据：

1. 用户明确要求优先
2. 用户提供的组织规范；未提供时只能参考 `references/技术路线-202512.md` 的通用示例
3. 组件职责和非功能约束
4. 团队实现复杂度

第一版正式支持以下技术栈模板：

- Java + Spring Boot
- Python + FastAPI
- Vue 3 + TypeScript + Vite
- Go + Gin
- Android Kotlin
- Flutter

若半自动模式下可自行推荐，但**必须给出至少一次让用户接受/替换**的机会；不允许直接决策不通知。

如果用户选择未覆盖技术栈：

- 继续完成架构设计
- 生成通用目录结构
- 标注”缺少专用 skeleton template”

**未确认技术栈（Brownfield：未完成继承表；Greenfield：未与用户确认），禁止生成骨架。**

### Phase 7: 核心链路、数据与接口设计

在写 ADR 之前，必须先完成可执行设计上下文。至少输出：

- 3 到 5 条核心业务链路时序
- 关键组件交互关系
- 数据边界与归属
- 核心实体与状态流转
- API 风格与鉴权约定
- 外部集成点与失败策略

**产出位置划分**：

| 产物 | 位置 | 策略 |
|------|------|------|
| 组件关系图（本轮新增 / 变化）| 版本 `delta.md §新增 · 组件` | Merge 后追加到根级 `logical-architecture.md` 组件图 |
| 核心链路时序图 | 版本 `requirement-analysis.md`（本轮新链路）+ 根级 `architecture-overview.md`（累积引用）| 版本产出；Merge 后在 overview 补链接 |
| 实体关系 / 状态图（本轮新实体）| 版本 `delta.md §新增 · 领域实体` | Merge 后追加到根级 `domain-model.md` |
| DDL（本轮新增表 / 字段）| 版本 `delta.md §新增 · 数据表` + `§修改 · 数据表变更` | Merge 后追加到根级 `data-model.md` |
| 接口契约草案（本轮新契约）| `apis/versions/v{x.y.z}/contracts/*.md` | 稳定后（Phase 12 通过）升级到根级 `apis/contracts/` |
| OpenAPI 接口定义 | API 侧 `delta.md §新增 · 新增接口` | Merge 后追加到根级 `openapi.yaml paths:` |

最低要求（本版本）：

- 至少 1 个组件关系图（写入 版本 `delta.md §新增 · 组件` 段 或 版本 `solution-options.md`）
- 版本 `requirement-analysis.md` 中至少 1 个流程图或时序图
- 至少 1 个实体关系图或状态图（写入 版本 `delta.md §新增 · 领域实体` 段）
- DDL 含主键 / 唯一键 / 归属关系 / 状态字段（写入 版本 `delta.md §新增 · 数据表` 段）
- `apis/versions/v{x.y.z}/contracts/` 中至少存在关键接口契约草案

### Phase 8: 风险、容量、安全与演进设计

**产出位置**：

- **根级**：`ai-docs/architecture/risk-and-evolution.md`（使用 `templates/risk-and-evolution.md` 模板）—— 累积态，所有版本的 V / W / E 编号全局递增；每次 Merge 追加
- **版本**：本版本新增 / 变化的 V / W / E 同步写入版本 `delta.md §新增 · 风险 / 取舍 / 演进` 与 `§修改 · 风险登记更新` —— 作为 Phase 10.5 Merge 的输入

禁止把本阶段内容散落到 `architecture-drivers.md / architecture-overview.md / ADR` 等其他文档——这些文档可以在引用处做简短概述，但完整的风险登记、容量假设、演进条件必须**只在根级 `risk-and-evolution.md`**里维护。

至少覆盖：

- 脆弱点清单（≥ 3 条，编号 V-xxx）：触发条件 / 影响范围 / 监控手段 / 应对 / 关联 ADR
- 失败场景与降级：每条核心链路至少 1 条失败路径
- 容量与性能假设：区分”已量化目标”和”按经验假设”，每条写明超过后的行为和升级路径
- 安全边界与信任边界
- V1 选型理由（W-xxx）：至少 3 条”现在不做但理由充分”
- 演进触发条件（E-xxx）：量化、可测量，不接受”未来可能”
- 需要持续观察的指标
- 待确认项

如果无法说明”为什么现在不做更复杂方案，以及未来什么条件下需要升级”，则视为架构设计未完成。

### Phase 8.5: 反工程化复审（Anti-Overengineering Re-review）

这是一个**checkpoint**，不产出新文件，只做两件事：

1. 结合 Phase 8 的风险与演进分析，**复审** Phase 4 的反工程化初稿
2. 把复审结论回写到两个地方：
   - 版本 `solution-options.md §8.5 复审结论`（本版本目录）
   - 根级 `risk-and-evolution.md §6 反工程化审视`（注明"由 v{x.y.z} 复审"）

复审必须直面的问题：

- 做完风险分析后，推荐方案是否仍是”最小且必要”的？还是有组件可以砍掉？
- 哪些”为未来某情况”预留的能力，实际上是为 **V-xxx / E-xxx** 中某条风险服务的？（合理保留）
- 哪些是为**未登记在册**的假想未来服务的？（建议删除）
- 如果砍掉某个组件，会违反哪条宪法原则 / FR / SC？（检验砍哪些才是安全的）

**复审结论可以”维持原推荐”，但必须显式说明”经复审无调整”**，不允许跳过。

### Phase 9: 关键架构决策输出

**基线 4 份（必须）**：

1. `ADR-001-system-context-and-module-splitting.md`
2. `ADR-002-tech-stack-selection.md`
3. `ADR-003-data-and-integration-strategy.md`
4. `ADR-004-api-and-security-style.md`

**动态追加（按触发清单）**：

读取 `references/adr-trigger-checklist.md`，逐项过一遍 7 大类触发器。凡符合任一条件的决策必须独立成 ADR：

1. 该决策存在 ≥ 2 条合理技术路径
2. 回退代价超过"改一两处代码"
3. 与某条宪法原则相关
4. 影响 ≥ 2 个组件

典型动态追加 ADR（按场景）：

- 数据持久化策略（完整 / 摘要 / 不入库）
- 缓存策略 / 分片策略 / 跨服务事务策略
- 消息中间件选型 / 幂等键设计 / 重试死信
- 演示或兜底开关（demo-mode / feature-flag / kill-switch）
- 多租户隔离 / 敏感数据处理
- LLM 底座切换 / 输出校验链 / RAG 策略
- Trace / 告警 / 日志归档方案

**ADR 禁止压缩**：一份 ADR 只聚焦一个决策。不允许把多个独立决策塞进"备选方案"或"后续关注点"里。

**产出位置**：

- **ADR 文件本体**：`ai-docs/architecture/adr/ADR-NNN-<slug>.md`（**根级全局累积**，跨版本唯一编号递增）
- **本版本关联 ADR 清单**：版本 `README.md §3` 列出"本轮新增 ADR" + "本轮修改既有 ADR（版本号 bump）"
- **修改既有 ADR**：在原 ADR 文件追加 `## v2` / `## v3` 版本节 + 超链到本版本，不新建文件

每份 ADR 必须包含：

- 状态
- 触发原因（引用 `adr-trigger-checklist.md` 的触发项）
- **关联需求（FR / US / SC）**：回链 Phase 1 的编号
- **涉及宪法条款（P-xxx）**
- **本 ADR 在哪个版本产生**（回链 `versions/v{x.y.z}/README.md`）
- 背景
- 决策
- 备选方案（至少 2 个，含优势 + 明显劣势）
- 取舍分析
- 影响（正向 / 副作用 / 对其他 ADR 的影响）
- 后续关注点（触发重评条件 + 监控指标 + 关联 V-xxx / E-xxx）

**ADR 未完成（基线 4 份 + 触发清单勾选），禁止生成骨架。**

### Phase 10: 项目骨架生成

本 Phase 按项目形态（Phase 0.3）分岔。

#### Greenfield 路径（新建骨架）

根据用户确认的结果，按如下规则生成项目骨架：

- 默认落在仓库根目录
- 若用户要求预演或沙箱模式，落在 `scaffolds/<project-name>/`
- 每个模块至少生成：
  - 基础工程文件（构建描述文件：`pom.xml` / `build.gradle` / `pyproject.toml` / `go.mod` 等）
  - `.gitignore`
  - `README.md`
  - `docs/index.md`（以及 `docs/architecture.md`）
  - **最小启动入口**（Spring Boot 的 `@SpringBootApplication` 类 / FastAPI 的 `main.py` / Gin 的 `main.go` / Android 的 `MainActivity` 等）
  - 必要的**配置类**（`@Configuration` / `application.yml` 等）

骨架来源：

- 通用规则：`skeletons/common/`
- 技术栈专用模板：`skeletons/<stack>/`

##### ⛔ 禁止预生成业务空壳（硬约束）

架构期的骨架职责是"能编译、能启动、能跑一个 ping"，**不是**"把架构决策编进代码骨架里"。预生成业务类会把接口签名、包结构、依赖方向固化下来，让实施期的 TDD 失效、返工成本陡增。

以下 4 类代码**不得**在 Phase 10 生成，必须留到实施期（Story 阶段）按 TDD 补齐：

1. **业务 Controller / Handler / Router**（`@RestController`、FastAPI `@app.get/@router.*`、Gin `router.GET/POST` 等业务路由）
2. **业务 Service / Facade / UseCase**（`@Service`、`@Component` 的业务类、Python 的 service 类）
3. **Entity / Repository / DAO**（`@Entity`、`@Repository`、ORM 模型类）
4. **Provider / Adapter 的具体实现**（LLM Provider 的具体厂商适配、第三方 SDK 封装）

**判别法**：如果一个类的类名里含业务概念（`OrderController` / `CheckoutFacade` / `VendorProvider`），而不是基础设施概念（`WebMvcConfig` / `RestTemplateFactory`），它就属于业务壳。

**正确做法**：
- 让 `ADR-001 模块拆分` 描述"哪些业务类将来要有"——但**不要**现在就生成出来
- 让 `contracts/*.md` 描述接口签名——但**不要**把 `interface` 代码先写出来
- 让 `docs/architecture.md` 描述依赖方向与信任边界——**不要**用 `package-info.java` / 空 `impl/` 目录去锁死

**自检**：骨架生成后，在产物根目录执行：

```bash
bash <skill-dir>/scripts/check-no-business-shell.sh <project-root>
```

脚本会扫 Java/Python/Go/Kotlin 对应的业务类注解/装饰器/路由声明，发现即 FAIL。Phase 12 终审 Checklist 必须记录本脚本的通过时间戳与扫描路径。

**反面案例**（历史问题脱敏归纳）：某示例项目在骨架生成阶段提前生成多个 `*Controller.java` / `*Facade.java` / `*Provider.java`，方法体 TODO 但包结构已锁死；后续实施期 TDD 必然要重命名/移动类，返工量巨大。本 skill 从此以硬约束收口。

#### Brownfield 路径（增量适配，不重建）

**硬约束**：不允许重建已有模块目录；不允许覆盖已有源码文件；不允许修改已有构建配置（`package.json` / `pom.xml` 等）。

对每个组件按 `change_scope` 处理：

| change_scope | 动作 |
|--------------|------|
| `keep` | 仅在 `<module>/docs/` 下追加本次设计相关文档（若已有则 **追加章节**，不覆盖）；更新 `README.md` 的"相关 ADR"列表 |
| `modify` | 同 `keep` + 生成 `<module>/docs/adaptation-todo-v{x.y.z}.md`（**文件名绑定版本号**，避免多次版本覆盖）列本次改造 TODO（按 FR-xxx 分组，标注预计工作量）|
| `new` | 按 Greenfield 路径生成新模块最小骨架，但必须落到**现有仓库布局**（例如现有是 monorepo 则按 monorepo 规则放） |
| `remove` | 不动代码；仅在 `<module>/docs/index.md` 顶部加"⚠️ 本模块将在 X 版本下线，见 ADR-xxx" |

**必须同步产出** `ai-docs/architecture/versions/v{x.y.z}/adaptation-summary.md`（**本版本目录**，不再是根级），聚合所有 `modify / new / remove` 的变更矩阵：

| 模块 | change_scope | 涉及 FR | 涉及 ADR | 风险（V-xxx）| 回退方案 |
|------|--------------|---------|----------|--------------|----------|

**禁止项**：
- ❌ 在未经用户授权下修改现有代码
- ❌ 把新模块生成到会与现有目录冲突的路径
- ❌ 生成与现有构建工具冲突的配置（例如现有是 Maven，不要引入 Gradle）
- ❌ 使用无版本号后缀的 `adaptation-todo.md` 文件名（iter-4 起废弃）

### Phase 10.5: Version Merge Checkpoint（NEW）

**目的**：把版本的"决策过程"合并到累积态。版本永久冻结 / 根级持续刷新。

**执行方式**：

```bash
bash scripts/merge-version.sh v{x.y.z}
# 先 dry-run：--dry-run 列出待合并项，不写入
bash scripts/merge-version.sh v{x.y.z} --dry-run
```

脚本行为：

1. 读取 `ai-docs/architecture/versions/v{x.y.z}/delta.md` 与 `ai-docs/apis/versions/v{x.y.z}/delta.md`
2. 校验两侧 delta.md 均含完整三段（`## 新增 / ## 修改 / ## 删除`）
3. 校验 API 侧 breaking change 清单已勾选，若为 breaking 则 bump `openapi.yaml info.version` 主版本
4. 按规则合并到根级（见下表）
5. 每份被刷新的累积态文档顶部追加：`> Last updated: v{x.y.z} (YYYY-MM-DD) — <变更概括>`
6. 勾选 版本 `README.md §5 Phase 10.5 Merge 清单`

**架构侧合并规则**：

| delta 段 | 合并到根级 | 动作 |
|----------|-----------|------|
| §新增 · 组件 | `logical-architecture.md` | 组件图追加节点 + §组件清单追加行 |
| §新增 · 部署节点 | `physical-architecture.md` | 拓扑图追加 + §部署清单追加行 |
| §新增 · 领域实体 | `domain-model.md` | 追加实体定义 + 状态机 |
| §新增 · 数据表 | `data-model.md` | 追加表定义（保留原表） |
| §新增 · 能力 | `capability-model.md` | 追加能力条目 |
| §新增 · 风险 V/W/E | `risk-and-evolution.md` | 编号继续递增，附"引入于 v{x.y.z}" |
| §新增 · ADR | `adr/ADR-NNN.md` | 直接落位 |
| §修改 · 既有 ADR | `adr/ADR-xxx.md` | 追加 `## v2 / v3` 节 + 超链本版本 |
| §修改 · 组件行为 | `logical-architecture.md` 对应节 + `architecture-overview.md` 变更说明 | 字段级 patch |
| §修改 · 数据表 | `data-model.md §变更历史` | 追加 ALTER 记录 |
| §删除 · 组件 / 接口 | `logical-architecture.md` + 对应 ADR | 标 `deprecated`，一个 release 后真删 |

**API 侧合并规则**：

| delta 段 | 合并到根级 | 动作 |
|----------|-----------|------|
| §新增 · 接口 | `openapi.yaml paths:` + `api-design.md §接口总表` | 追加 path + Schema + 总表含 FR 列 |
| §新增 · Schema | `openapi.yaml components.schemas` | 追加 Schema |
| §新增 · FR↔接口映射 | `api-contract-mapping.md` | 追加映射关系 |
| §修改 · 接口（breaking）| `openapi.yaml` + `api-design.md §breaking history` | 字段级 merge + **强制 bump `info.version` 主版本** |
| §修改 · 接口（非 breaking）| `openapi.yaml` | 字段级 merge + 次版本号 +1 |
| §删除 · 接口 | `openapi.yaml` | 先标 `deprecated: true`，保留一个 release cycle |
| `contracts/*.md` 稳定 | `apis/versions/v{x.y.z}/contracts/*` → `apis/contracts/` | 稳定后升级到根级 |

**失败处理**：

- delta.md 三段缺失 → 中止，返回错误
- API 侧 breaking 检测命中但 `info.version` 主版本未 bump → 中止
- 版本 `README.md §5` 某项未勾选 → 中止

**Phase 10.5 未完成，禁止进入 Phase 11。**

### Phase 11: 架构文档生成

本 Phase 在 Phase 10.5 Merge 完成之后执行，目标是**校验累积态文档 + 版本文档的可读性**，补缺口而非重写：

**累积态文档**（根级 / 已由 Phase 10.5 自动刷新，本 Phase 补充说明）：

1. `architecture-overview.md` — 在顶部索引新增版本条目（含 scope 一句话 + 关联 ADR）
2. `logical-architecture.md` — 校验组件图的 Mermaid 渲染正确
3. `physical-architecture.md` — 校验部署拓扑图 Mermaid 渲染正确
4. `capability-model.md` — 累积能力清单
5. `domain-model.md` — 累积领域模型（含实体状态图）
6. `data-model.md` — 累积 DDL + §变更历史
7. `risk-and-evolution.md` — 累积 V / W / E 登记
8. `ai-docs/apis/api-design.md` — 累积接口总表（含"服务于 FR"列）
9. `ai-docs/apis/openapi.yaml` — 单一源头（`info.version` 已在 10.5 bump）
10. `ai-docs/apis/api-contract-mapping.md` — 累积映射

**本版本文档**（`versions/v{x.y.z}/` / 由各 Phase 直接产出）：

1. `README.md` — 本轮 scope + 关联 ADR + Merge 清单 + 终审签字
2. `requirement-analysis.md` — 本次新需求 US / FR / SC / C / A
3. `architecture-drivers.md` — 本次新驱动因素
4. `solution-options.md` — 候选方案 + §8 / §8.5 反工程化
5. `delta.md` — 三段式增删改（已冻结）
6. `adaptation-summary.md`（**仅 Brownfield**）— 变更矩阵 + Do-Not-Touch 清单
7. `final-validation-report.md` — Phase 12 终审

**项目级一次性文档**（跨版本不变）：
- `project-mode.md`（Phase 0.3 已产出）
- `constitution.md`（Phase 0.5 产出，跨版本，版本号递增）
- `baseline-architecture.md`（**仅 Brownfield**，Phase 0.3 已产出，定期刷新）

图示最低要求：

- 版本 `requirement-analysis.md`：至少 1 个流程图或时序图
- 根级 `physical-architecture.md`：至少 1 个部署拓扑图（累积）
- 根级 `logical-architecture.md`：至少 1 个组件关系图（累积）
- 根级 `domain-model.md`：至少 1 个实体关系图或状态图（累积）

统一使用 Mermaid。

### Phase 12: 最终校验

> **iter-6 强化（P0）**：终审禁止"贴 TODO / PoC 待跑 / 批次内将修复 / 后续版本 再补"作为 PASS 证据。
> 每项 checklist 必须二选一：要么 `[OK] 已完成事实`（贴 commit / PR / 测试输出 / 文件路径+行号），要么 `[OPEN] 已规划但未完成` → 后者**一律不允许 PASS**，必须收敛进 `open-decision-register.md`（见下文 P0 准入规则 §A）。

#### Phase 12 §A. PASS 准入规则（强门禁，不可绕过）

**证据级别定义**：

| 级别 | 含义 | 准入示例 |
|---|---|---|
| **L1 已完成事实** | 物理产物存在且可被旁人核验 | 文件 / commit / PR / CI 输出 / 测试报告 / 性能数据 / 配置变更截图 |
| **L2 用户/团队确认** | 关键决策已被有权方拍板 | 用户在对话中明确批准 / 团队会议纪要 / ADR 状态 = Accepted（且 ADR 自身字段齐全）|
| **L3 已规划** | 写在 TODO / 批次计划 / risk-and-evolution / adaptation-todo / 后续版本 | **不可作为 PASS 证据** |
| **L4 已写打算** | "我打算这样做" / "由 [FR-XXX.N] 修复" / "待 PoC 验证" | **不可作为 PASS 证据** |

**PASS 规则**：
1. 每条 checklist 必须填 `[OK]` 或 `[OPEN]`；不允许只填 `[X]` 或 `✅`，**必须**带证据级别（`[OK-L1]` / `[OK-L2]` / `[OPEN-L3]` / `[OPEN-L4]`）+ 一句话证据描述
2. **任意一条 `[OPEN]` 未关闭，版本状态只能为 `Draft / Requires Rework`，不允许 `Final / PASS`**
3. `[OPEN]` 项必须同步登记到 `versions/v{x.y.z}/open-decision-register.md`（不存在的话本次终审无法通过；该文件由 P1-⑤ 单独引入，过渡期可在 final-validation-report.md §4 内嵌"开放决策列表"节代替）
4. ADR 状态为 `Proposed` / `PoC Required` 的版本 **不允许** Final（必须先升 `Accepted` 或 `Deferred / Rejected`）

**禁止式样**（命中即终审 FAIL）：

- ❌ 把 KV-xxx / FR-xxx / RC-xxx 中"将在批次 N 修复"作为该违反条款的 PASS 证据
- ❌ 把"待 Phase 7 PoC 验证"作为 ADR `Accepted` 的依据
- ❌ 把"已写入 risk-and-evolution.md V-xxx 应对策略"作为脆弱点已闭环的证据（应对策略≠已闭环）
- ❌ 把"adaptation-todo 已列出 TODO"作为 modify 已完成的证据
- ❌ 把"由 [FR-xxx.N] 修复"作为 Brownfield 已知违反 KV-xxx 已修复的证据
- ❌ 把 Greenfield `check-no-business-shell.sh` 标 N/A 但未跑脚本，本节无证据时间戳

#### Phase 12 §B. 终审 Checklist（每项必须 `[OK-L1/L2]` 或 `[OPEN-L3/L4]` + 证据描述）

```text
[ ] 问题边界与核心场景已确认
[ ] project-mode.md 存在，形态（Brownfield / Greenfield）已判定且置信度合理
[ ] 版本目录（architecture + apis 两侧）已创建且按版本号对齐；命名符合 §Phase 0.3 规范
[ ] Brownfield 模式：baseline-architecture.md 存在且 §1~§5 非空
[ ] US / FR / SC / C 已编号（跨版本全局递增）且下游可回链
[ ] Constitution 已锁定，且终审 Re-check 通过（无违反 / 已登记豁免）
[ ] Brownfield 模式：Constitution 已对照 baseline 检出"已知违反"并登记豁免期
[ ] **Brownfield 已知违反 KV-xxx 已逐条修复并贴 L1 证据**（PR / commit / CI 输出）；未修复则改 版本状态为 Draft，不允许部分豁免延期作为 PASS 证据（豁免到下一版本 的项必须在 constitution.md §4 标注，并在 open-decision-register 登记 ODR）
[ ] 架构驱动因素已提炼（版本目录）
[ ] 至少 2 套候选方案已比较（Brownfield：候选 A = 保留现状 + 增量改造；版本目录）
[ ] 版本 solution-options.md §8 反工程化审视已完成（初审 + §8.5 复审回写）
[ ] 组件清单已确认（Brownfield：每个组件标 change_scope；写入 版本 delta.md）
[ ] 技术栈已确认（Brownfield：自动继承表完整；Greenfield：已与用户确认）
[ ] Brownfield 模式：引入异构新栈的组件都有对应 ADR 和 W-xxx 登记
[ ] 核心链路与数据边界已明确（写入 版本 delta.md 对应段）
[ ] 根级 risk-and-evolution.md 存在且覆盖脆弱点 / 降级 / 容量 / 安全 / V1 理由 / 演进触发
[ ] 版本 delta.md（架构侧 + API 侧）三段齐全（新增 / 修改 / 删除）
[ ] API 侧 breaking change 已正确处理：依据 templates/api-version-delta.md §Breaking Change 检测清单（任何新增 required 字段/header **默认 breaking**，要降级必须附"兼容窗口策略 + 旧客户端样本/契约证据"L1 文件路径）
[ ] **基线 4 份 ADR + 按触发清单动态追加完成**；每份含 FR/US 回链、宪法条款引用、本版本回链；ADR 状态为 `Accepted` 的必须有 L1（PoC 报告/测试/审批截图）+ L2（用户/团队确认时间）双证据；**有任意 ADR 处于 `Proposed` / `PoC Required`，版本不可 Final**
[ ] API 设计中每个接口表有"服务于 FR-xxx"列，未覆盖 FR 已解释
[ ] Brownfield 模式：版本 adaptation-summary.md 存在，覆盖所有 modify/new/remove 变更
[ ] Brownfield 模式：modify 组件的 <module>/docs/adaptation-todo-v{x.y.z}.md 已产出（文件名绑定版本号）
[ ] 目标模块目录存在（Brownfield：现有模块未被重建；新模块落在符合现有布局的路径）
[ ] 模块基础工程文件存在（Brownfield：仅追加 docs/，未覆盖现有源码 / 构建配置）
[ ] Phase 10.5 Version Merge 已完成：累积态 7 份架构文档 + openapi.yaml 已刷新
[ ] 每份被刷新的累积态文档顶部 "Last updated: v{x.y.z} (YYYY-MM-DD)" 行存在
[ ] ai-docs/architecture/ 累积态关键文档存在（project-mode / constitution / risk-and-evolution，Brownfield 额外含 baseline）
[ ] ai-docs/architecture/versions/v{x.y.z}/ 决策文档齐全（README / requirement-analysis / solution-options / delta / final-validation-report）
[ ] ai-docs/apis/ API 累积文档存在（api-design / openapi.yaml / api-contract-mapping）
[ ] ai-docs/apis/versions/v{x.y.z}/ 决策文档齐全（README / delta / contracts/）
[ ] 每个模块 README.md 存在
[ ] 每个模块 docs/index.md 存在
[ ] 关键文档包含 Mermaid 图示
[ ] **Greenfield：产物骨架通过 `bash <skill-dir>/scripts/check-no-business-shell.sh <project-root>` 自检**（必须 L1 证据：脚本扫描输出 + 时间戳 + 扫描路径写入终审报告；标 N/A 必须显式说明为 Brownfield 不重建模块）
[ ] **外部契约假设登记**：`final-validation-report.md §4` 每条 A-xxx 均有 `决策截止日 (T-N)` + `过期降级方案`；无"裸假设"；T-N 已过仍未确认的假设必须改 版本状态为 Requires Rework
[ ] 终审报告按 `templates/final-validation-report.md` 结构产出，含 Constitution Re-check / Checklist / 产物清单 / 假设登记 / 最终判定 5 节
[ ] open-decision-register.md（或 final-validation-report.md §4 开放决策内嵌节）已收敛全部 [OPEN] 项，且每项有"决策人 / 决策截止日 / 升级路径"
[ ] bash scripts/verify.sh 通过
```

#### Phase 12 §C. Constitution Re-check 实操要求

**Constitution Re-check（终审）必须实际执行**：逐条过 `constitution.md §1` 的 P-xxx，确认架构 / ADR / API / 骨架没有隐式违反；发现违反必须先修订宪法或调整设计，**不允许"标记已知违反 + 由 [FR-xxx.N] 修复"草草收尾**。

每条 P-xxx 复审证据 = L1（修复 PR/commit）+ L2（reviewer 签字）；**只允许两个降级路径**：
1. **真修了** → 贴 PR 证据通过
2. **本版本不修，正式豁免到下一版本** → 必须在 `constitution.md §4 已知违反` + `open-decision-register.md` 双登记，**且开放决策接收方明确（决策人 = 用户 / 架构负责人）**

**禁止路径**：
- ❌ "我打算修，路径是 [FR-xxx.N]"
- ❌ "由批次 N 修复"
- ❌ "本 版本终审通过，但实际未修"

#### Phase 12 §D. 报告路径与状态切换

- **PASS**：所有 checklist `[OK-L1/L2]` 全部齐全 + 0 个 `[OPEN]` 未关闭 + Constitution Re-check 全过 + verify.sh 通过 → 版本状态 Draft → **Final**（永久冻结）
- **CONDITIONAL-PASS**：仅当 ≤ 2 个 `[OPEN-L3]` 项且每项有明确决策人 + 决策截止日 + 降级方案，且不涉及客户端协议 / 数据 schema / 安全鉴权三大不可逆面 → 版本状态 Draft → **Conditional**（可启动批次 1 工程化基线但不可推进结构性重构；CONDITIONAL → Final 必须二次终审通过）
- **FAIL** / **Requires Rework**：任意一条不满足上述 → 版本状态保持 Draft，列出阻塞项；修复后重跑 Phase 12

只要有一项未完成或证据级别不足，禁止报告"已完成 / Final / PASS"。

## 模板与骨架目录

### 文档模板

- `templates/project-mode.md`（**新增**，Phase 0.3 产出）
- `templates/baseline-architecture.md`（**新增**，Brownfield 专用）
- `templates/adaptation-summary.md`（**新增**，Brownfield Phase 10 产出）
- `templates/constitution.md`（**新增**）
- `templates/architecture-overview.md`
- `templates/requirement-analysis.md`（含 US / FR / SC 编号）
- `templates/architecture-drivers.md`
- `templates/solution-options.md`（含 §8 反工程化审视）
- `templates/physical-architecture.md`
- `templates/logical-architecture.md`
- `templates/capability-model.md`
- `templates/domain-model.md`
- `templates/data-model.md`
- `templates/risk-and-evolution.md`（**新增**）
- `templates/api-design.md`（含"服务于 FR-xxx"列）
- `templates/api-contract-mapping.md`
- `templates/openapi.yaml`
- `templates/adr-template.md`（含"关联 FR / 涉及宪法条款 / 本版本回链"字段）
- `templates/module-readme.md`
- `templates/module-docs-index.md`
- `templates/module-architecture.md`
- `templates/version-readme.md`（**iter-4 新增**，版本决策入口 + 关联 ADR + Merge 清单）
- `templates/version-delta.md`（**iter-4 新增**，架构侧三段式 delta：新增 / 修改 / 删除）
- `templates/api-version-delta.md`（**iter-4 新增**，API 侧三段式 delta + breaking change 检测）
- `templates/final-validation-report.md`（**iter-5 新增**，Phase 12 终审统一结构，含外部假设 T-N 决策截止表）

### 技术栈骨架

- `skeletons/common/`
- `skeletons/java-springboot/`
- `skeletons/python-fastapi/`
- `skeletons/vue3/`
- `skeletons/go-gin/`
- `skeletons/android-kotlin/`
- `skeletons/flutter/`

### 样例输入与评测

- `examples/minimal-prd.md`
- `examples/mid-size-saas-prd.md`
- `examples/unsupported-stack-prd.md`
- `examples/brownfield-saas-prd.md`（**新增**，Brownfield 扩展场景，需配套 mock baseline 环境）
- `evals/evals.json`（**新增**，可机器执行的自动评测集，含 3 条 Greenfield + 1 条 Brownfield 场景与 54 条 assertions）
- `evals/manual-run-template.md`
- `evals/scorecard.md`

### 参考清单

- `references/技术路线-202512.md`
- `references/adr-trigger-checklist.md`（**新增**，Phase 9 使用）
- `references/project-mode-detection.md`（**新增**，Phase 0.3 使用）

### 自检与引导脚本

- `scripts/verify.sh`：校验 skill 结构与关键标记；修改 skill 后跑一次 `bash scripts/verify.sh`，应输出 `architecture skill verification passed`
- `scripts/bootstrap-brownfield-mock.sh`：一键在目标目录铺 8 个 mock baseline 文件（pom.xml / Dockerfile / docker-compose / src/ / admin-web/ / CI / README），用于 Brownfield eval 运行前的环境准备；支持 `--dry-run` / `--force` 选项
- `scripts/merge-version.sh`（**iter-4 新增**）：Phase 10.5 Version Merge checkpoint 合并脚本。解析 版本 delta.md 三段式，按规则刷新根级累积态文档与 openapi.yaml；支持 `--dry-run`（列出待合并项不写入）、`--api`（仅合并 API 侧）、`--arch`（仅合并架构侧）选项
- `scripts/check-no-business-shell.sh`（**iter-5 新增**）：产物侧骨架自检脚本，扫描 Java/Python/Go/Kotlin 代码中是否存在违反 Phase 10 禁令的业务类（`@RestController` / FastAPI 路由 / Gin router / 非入口 Activity）；Phase 12 终审必跑

## 失败降级策略

### 输入不足

- 输出待确认问题清单
- 逐项与用户确认
- 不终止流程

### 技术栈不在支持清单内

- 输出选型建议和限制
- 生成通用骨架
- 标注缺失模板

### 目录已存在

- 默认不覆盖
- 先说明已有结构
- 仅在用户明确授权后覆盖模板文件

## 触发词

### Greenfield / 通用
- 架构设计
- 技术选型
- 项目骨架
- 项目初始化
- 系统设计
- 根据 PRD 生成架构
- 设计组件和技术栈
- 初始化模块目录
- greenfield / 全新项目

### Brownfield / 存量
- 老项目 / 存量项目架构改造
- 遗留系统重构
- 对已有代码做架构设计
- 基于现有系统扩展
- 在已有项目中引入新模块
- 给老系统做架构 ADR
- 老系统模块拆分 / 合并 / 下线
- 单体拆微服务 / 技术栈迁移
- brownfield
