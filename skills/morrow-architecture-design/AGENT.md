[项目说明](../../README.md) > [skills](../) > **morrow-architecture-design**

# morrow-architecture-design -- 决策优先的架构设计与项目骨架初始化技能

## 模块职责

基于用户提供的 PRD、业务背景和约束条件，通过交互确认完成问题建模、架构驱动因素提炼、候选方案比较、组件识别、技术选型、关键架构决策沉淀、项目骨架生成和架构文档产出。

## 入口与启动

- **技能定义文件**：`SKILL.md`
- **触发方式**：用户提到“架构设计”“技术选型”“项目骨架”“项目初始化”“系统设计”“根据 PRD 生成架构”等场景
- **输入要求**：
  - 至少提供 PRD、业务背景、项目目标三者之一
  - 若提供组件和语言偏好，可自动进入半自动模式

## 执行流程概览

| 阶段 | 名称 | 说明 |
|------|------|------|
| Phase 0 | 输入诊断 | 检查 PRD、背景、约束和角色是否足够 |
| Phase 0.3 | **项目形态探测** | **自动判定 Brownfield / Greenfield**；Brownfield 额外产出 `baseline-architecture.md` |
| Phase 0.5 | 项目宪法锁定 | 产出 `constitution.md`；Brownfield 需登记"已知违反 + 豁免" |
| Phase 1 | 问题定义与约束建模 | 明确目标、角色、痛点、场景、约束、假设；**强制 US/FR/SC/C 编号** |
| Phase 2 | 架构驱动因素提炼 | 提炼功能、非功能、集成和风险驱动项 |
| Phase 3 | 模式判定 | 形态（B/G）× 信息完整度（强引导 / 半自动）二维 |
| Phase 4 | 候选方案比较 | 至少两套；Brownfield 候选 A 必须是"保留现状 + 增量"；**产出反工程化审视** |
| Phase 5 | 组件识别与确认 | 明确组件、职责、边界、关系；**Brownfield 每个组件标 change_scope** |
| Phase 6 | 语言与技术栈确认 | **Brownfield 自动继承**现有栈；**Greenfield 与用户确认** |
| Phase 7 | 核心链路、数据与接口设计 | 产出时序、边界、数据和契约；**API 表回链 FR-xxx** |
| Phase 8 | 风险、容量、安全与演进设计 | **独立产出 `risk-and-evolution.md`** |
| Phase 8.5 | 反工程化复审 | 回写到 `solution-options §8.5` 与 `risk-and-evolution §6` |
| Phase 9 | ADR 输出 | **基线 4 份 + 按触发清单动态追加**；每份回链 FR 与宪法条款 |
| Phase 10 | 项目骨架生成 | **Brownfield 仅增量适配 + 产出 版本 adaptation-summary.md**；**Greenfield 新建骨架** |
| Phase 10.5 | **Version Merge Checkpoint** | **iter-4 新增**：解析 版本 `delta.md` 三段式（新增/修改/删除），按规则合并到根级累积态文档与 `openapi.yaml`；失败拒绝进入 Phase 11 |
| Phase 11 | 架构文档生成 | 核查累积态（根级）+ 版本目录文档齐全；图示 Mermaid 渲染正确 |
| Phase 12 | 最终校验 | 验证决策 / 目录 / 文档 / 图示 / 契约 / 编号闭环 / **Constitution Re-check** / **Phase 10.5 Merge 完成** / **Brownfield 未破坏现有代码** |

## 对外输入输出

### 输入

- PRD 文档路径或正文
- 业务背景
- 角色与核心场景
- 组件列表（可选）
- 语言或技术偏好（可选）
- 部署、合规、性能约束（可选）

### 输出（iter-4 起按 **累积态 + 版本决策过程** 双层组织）

#### 累积态（根级，每次版本 Merge 后刷新）

- `ai-docs/architecture/project-mode.md`（Phase 0.3 产出，一次性）
- `ai-docs/architecture/baseline-architecture.md`（仅 Brownfield，Phase 0.3 产出）
- `ai-docs/architecture/constitution.md`（跨版本，版本号递增）
- `ai-docs/architecture/architecture-overview.md`（含版本索引）
- `ai-docs/architecture/logical-architecture.md` / `physical-architecture.md` / `capability-model.md` / `domain-model.md` / `data-model.md` / `risk-and-evolution.md`
- `ai-docs/architecture/adr/ADR-*.md`（全局 ADR，跨版本唯一编号）
- `ai-docs/apis/api-design.md` / `openapi.yaml` / `api-contract-mapping.md` / `contracts/*`

每份累积态文档顶部由 Phase 10.5 自动写入 `> Last updated: v{x.y.z} (YYYY-MM-DD) — <变更概括>` 行。

#### 版本决策过程（`versions/v{x.y.z}/`，终审通过后永不修改）

- `ai-docs/architecture/versions/v{x.y.z}/README.md`（scope + 关联 ADR + Merge 清单）
- `ai-docs/architecture/versions/v{x.y.z}/requirement-analysis.md`
- `ai-docs/architecture/versions/v{x.y.z}/architecture-drivers.md`
- `ai-docs/architecture/versions/v{x.y.z}/solution-options.md`（含 §8 反工程化 + §8.5 复审）
- `ai-docs/architecture/versions/v{x.y.z}/delta.md`（三段式：新增 / 修改 / 删除）
- `ai-docs/architecture/versions/v{x.y.z}/adaptation-summary.md`（仅 Brownfield）
- `ai-docs/architecture/versions/v{x.y.z}/final-validation-report.md`
- `ai-docs/apis/versions/v{x.y.z}/README.md`
- `ai-docs/apis/versions/v{x.y.z}/delta.md`（含 breaking change 清单）
- `ai-docs/apis/versions/v{x.y.z}/contracts/*`（稳定后升级到根级）

#### 模块骨架

- 目标模块目录与基础工程文件
- 各模块 `README.md`、`docs/index.md` 与 `docs/architecture.md`
- `<module>/docs/adaptation-todo-v{x.y.z}.md`（Brownfield `modify` 组件独有，文件名绑定版本号）

## 关键依赖与参考

| 文件 | 用途 |
|------|------|
| `references/技术路线-202512.md` | 技术栈选型建议来源 |
| `references/adr-trigger-checklist.md` | Phase 9 ADR 动态追加触发器 |
| `references/project-mode-detection.md` | Phase 0.3 Brownfield / Greenfield 探测规则 |
| `templates/project-mode.md` | Phase 0.3 项目形态判定结论模板 |
| `templates/baseline-architecture.md` | Phase 0.3 Brownfield 现状盘点模板 |
| `templates/adaptation-summary.md` | Phase 10 Brownfield 变更矩阵模板 |
| `templates/constitution.md` | Phase 0.5 项目宪法模板 |
| `templates/risk-and-evolution.md` | Phase 8 独立风险与演进文档模板 |
| `templates/version-readme.md` | **iter-4 新增** 版本决策入口模板（含关联 ADR + Merge 清单）|
| `templates/version-delta.md` | **iter-4 新增** 架构侧三段式 delta 模板（新增 / 修改 / 删除）|
| `templates/api-version-delta.md` | **iter-4 新增** API 侧三段式 delta + breaking change 检测清单 |
| `templates/*.md` | 其余架构与模块文档模板 |
| `skeletons/*` | 技术栈最小工程骨架模板（仅 Greenfield 使用）|
| `scripts/verify.sh` | skill 结构自检脚本；修改 skill 后跑一次 |
| `scripts/bootstrap-brownfield-mock.sh` | 为 Brownfield eval 铺 mock baseline 文件 |
| `scripts/merge-version.sh` | **iter-4 新增** Phase 10.5 Version Merge checkpoint；解析 版本 delta.md 三段式并刷新累积态 |

## 第一版正式支持技术栈

| 技术栈 | 适用场景 |
|--------|----------|
| Java + Spring Boot | 核心服务、BFF、集成服务、Worker |
| Python + FastAPI | AI 服务、轻量 API、数据处理 |
| Vue 3 + TypeScript + Vite | 管理台、门户、运营台 |
| Go + Gin | 网关、轻量 API、高并发中间服务 |
| Android Kotlin | 原生 Android 客户端 |
| Flutter | 跨端移动端 |

## 关键产物约束

- **Phase 0.3 项目形态探测必须产出 `project-mode.md`**；Brownfield 额外产出 `baseline-architecture.md`；**Phase 0.3 末尾必须创建 `versions/v{x.y.z}/` 目录**（架构 + API 两侧按版本号对齐）
- **Brownfield 模式下**：现有模块禁止重建；技术栈默认继承；组件清单标 `change_scope`；必须产出 版本目录的 `adaptation-summary.md`
- **Greenfield 模式下**：技术栈必须与用户确认（或推荐 + 让用户签字）
- **项目宪法（Constitution）必须在 Phase 0.5 锁定**，包含 NON-NEGOTIABLE 原则 ≥ 3 条；Brownfield 需登记"已知违反 + 豁免"
- **需求编号闭环**：US / FR / SC / C 必须编号且**跨版本全局递增**；API 表、ADR 必须回链
- 架构设计文档中必须包含决策与取舍章节
- 候选方案比较至少 2 套，且必须给出推荐理由和不推荐其他方案的原因
- **反工程化审视必须在 版本 `solution-options.md §8` 完成**，Phase 8.5 复审回写
- 核心业务链路至少 3 条，并显式说明跨组件交互
- **风险与演进独立文档（根级 `risk-and-evolution.md`）必须存在**，内容不得散落；本版本 新增 V/W/E 先写入 版本 `delta.md`，Phase 10.5 Merge 到累积态
- ADR 基线 4 份 + 按 `adr-trigger-checklist.md` 动态追加；ADR 文件始终落全局 `ai-docs/architecture/adr/`；每份含"关联 FR"、"涉及宪法条款"和"本版本回链"
- **版本 delta.md 必须含完整三段**（`## 新增 / ## 修改 / ## 删除`），作为 Phase 10.5 Merge 的机器可读输入
- **Phase 10.5 Version Merge 未完成，禁止进入 Phase 11**；合并后每份累积态文档顶部必须含 `Last updated: v{x.y.z}` 行
- **API 侧 breaking change 必须 bump `openapi.yaml info.version` 主版本**（由 `merge-version.sh` 检测并提示）
- 需求分析、物理架构、逻辑架构、领域模型必须包含 Mermaid 图示
- 目录存在时默认不覆盖已有工程文件
- 默认输出到仓库根目录；用户要求预演时输出到 `scaffolds/`
- Phase 12 Constitution Re-check 必须实际执行，禁止草草收尾

## Brownfield / Greenfield 行为矩阵

| Phase | Brownfield | Greenfield |
|-------|-----------|-----------|
| 0.3 探测 | 读构建文件 / 源码目录 / CI 判 Brownfield；产出 baseline | 探测为空目录判 Greenfield |
| 0.5 宪法 | 过一遍现有代码检"已知违反"并登记豁免 | 从零锁定 |
| 4 方案 | 候选 A = 保留 + 增量改造 | 候选 A = 最简 V0 |
| 5 组件 | 以 baseline §1 为起点，标 `change_scope` | 从 PRD 识别 |
| 6 技术栈 | **自动继承**，**跳过与用户确认** | **强制与用户确认** |
| 10 骨架 | **不重建**已有模块，仅追加 `docs/`，产出 `adaptation-summary.md` | 按栈生成最小骨架 |

## 常见问题

- **Q: 用户只给一句业务背景怎么办？**
  A: 进入强引导模式，先补问题定义、角色、关键场景和约束，再进入架构设计。

- **Q: 用户已给出组件和语言，还需要确认吗？**
  A: 需要，只是可直接进入半自动模式，减少澄清轮次；但候选方案比较和关键决策不能省略。

- **Q: 技术栈没有对应 skeleton 怎么办？**
  A: 输出选型建议和通用目录，明确标注缺少专用骨架模板。

- **Q: 已有目录和生成目录冲突怎么办？**
  A: 默认不覆盖，先识别现状并提示追加、补齐或在用户授权后覆盖。

- **Q: skill 怎么知道是在老项目里跑？**
  A: Phase 0.3 自动扫 `package.json / pom.xml / go.mod / pyproject.toml / Dockerfile` 等强信号文件，命中即判 Brownfield；判定结果写入 `project-mode.md`，用户可手动覆盖。详见 `references/project-mode-detection.md`。

- **Q: Brownfield 模式下还会问用户选语言吗？**
  A: 默认**不会**——继承 baseline 中的现有栈。仅在有 `change_scope = new` 且要引入异构新栈时才问用户，并必须配套 ADR。

- **Q: Brownfield 模式会改我的老代码吗？**
  A: 不会。Phase 10 仅追加 `docs/` 目录和更新 README 中"相关 ADR"列表；变更项落到 `adaptation-summary.md` + `<module>/docs/adaptation-todo-v{x.y.z}.md`（按版本号绑定）。现有源码 / 构建配置 / CI 一律不触碰。

- **Q: 混合项目（仓库有老代码也要新建独立模块）怎么办？**
  A: 按新建模块的目录粒度分别判定——老模块走 Brownfield，新模块走 Greenfield。在 `project-mode.md` 里显式登记两段。

- **Q: 什么时候算架构设计真正完成？**
  A: 不是文档齐全就算完成，必须同时满足关键场景、驱动因素、候选方案、核心链路、数据边界、风险和演进策略都已说明；且 Phase 10.5 Version Merge 刷新累积态 + Phase 12 Constitution Re-check 双双通过。

- **Q: 每次架构设计的产物放哪？为什么要按版本组织？**
  A: iter-4 起采用 **累积态 + 版本决策过程** 双层组织：根级（如 `architecture/logical-architecture.md`、`apis/openapi.yaml`）永远回答"系统现在长啥样"，版本目录（`versions/v{x.y.z}/`）永远回答"这次为啥这么改"。每次版本终审通过后 Phase 10.5 自动 merge 刷新根级，版本目录永久冻结。对标 git main + feature PR 的组织思路。详见 `README.md §7`。

- **Q: 版本怎么命名？同一模块两次迭代怎么办？**
  A: 版本号遵循 SemVer 语义化规范，格式 `v{x.y.z}`（可选预发标签 `-alpha.1` / `-rc.1`）。同一模块的多次迭代由不同版本号承载（次版本号或修订号 +1），不再以模块切目录。两侧（架构 + API）目录按版本号对齐。Phase 0.3 检测到目录冲突必须提示用户 bump 版本号，禁止静默覆盖。

- **Q: Phase 10.5 Version Merge 具体做什么？**
  A: 读 版本 `delta.md` 三段（`## 新增 / ## 修改 / ## 删除`），按规则把组件 / DDL / 风险 / ADR / 接口追加到根级累积态文档与 `openapi.yaml`；API breaking change 强制 bump 主版本；每份累积态文档顶部追加 `Last updated: v{x.y.z}` 行。执行：`bash scripts/merge-version.sh v{x.y.z}`，支持 `--dry-run` / `--arch` / `--api` 选项。

- **Q: delta.md 三段式为啥是硬约束？**
  A: 机器可读 = 能自动合并 = 避免每次架构迭代靠人手工改 10+ 份文档出错。三段对应增删改三类操作，merge 脚本按段落类型刷不同累积文档。缺段则 merge 脚本拒绝运行。

- **Q: 首次整体架构也按版本组织吗？**
  A: 是。首个版本默认为 `v0.1.0`，`delta.md §新增` 段包含所有新组件 / 表 / 接口；`§修改 / §删除` 段留空。Merge 进空白根级 = 累积态的起点。后续迭代规则完全一致。

## 相关文件清单

- `skills/morrow-architecture-design/SKILL.md`
- `skills/morrow-architecture-design/AGENT.md`
- `skills/morrow-architecture-design/README.md`
- `skills/morrow-architecture-design/examples/README.md`
- `skills/morrow-architecture-design/examples/brownfield-saas-prd.md`
- `skills/morrow-architecture-design/evals/README.md`
- `skills/morrow-architecture-design/evals/evals.json`
- `skills/morrow-architecture-design/evals/manual-run-template.md`
- `skills/morrow-architecture-design/evals/scorecard.md`
- `skills/morrow-architecture-design/references/技术路线-202512.md`
- `skills/morrow-architecture-design/references/adr-trigger-checklist.md`
- `skills/morrow-architecture-design/references/project-mode-detection.md`
- `skills/morrow-architecture-design/templates/project-mode.md`
- `skills/morrow-architecture-design/templates/baseline-architecture.md`
- `skills/morrow-architecture-design/templates/adaptation-summary.md`
- `skills/morrow-architecture-design/templates/constitution.md`
- `skills/morrow-architecture-design/templates/risk-and-evolution.md`
- `skills/morrow-architecture-design/templates/`
- `skills/morrow-architecture-design/skeletons/`
- `skills/morrow-architecture-design/scripts/verify.sh`
- `skills/morrow-architecture-design/scripts/bootstrap-brownfield-mock.sh`
