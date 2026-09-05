# 版本 v{{x.y.z}} 终审报告（Phase 12）

**报告日期**：{{YYYY-MM-DD}}
**终审结果**：⬜ PASS / ⬜ CONDITIONAL-PASS / ⬜ FAIL / ⬜ Requires Rework
**版本状态**：Draft → **{{Final | Conditional | Requires Rework}}**（仅 PASS 时才允许 Final 永久冻结）

---

## 0. 证据级别约定（iter-6 强化 P0）

> 每条 checklist 必须填 `[OK-Lx]` 或 `[OPEN-Lx]`，并附**一句话证据描述**（贴文件路径 / commit / PR / 测试输出）。
> 不允许只打 `✅` / `[X]` 或仅写"已完成"。

| 级别 | 含义 | 是否允许作为 PASS 证据 |
|---|---|---|
| **L1** 已完成事实 | 物理产物存在且可被旁人核验（文件 + 行号 / commit / PR / CI 输出 / 测试报告 / 性能数据 / 配置变更截图） | ✅ |
| **L2** 用户/团队确认 | 关键决策已被有权方拍板（用户对话明确批准 / 团队会议纪要 / ADR 状态 = Accepted 且 Decision Record 字段齐全） | ✅ |
| **L3** 已规划 | 写在 TODO / 批次计划 / risk-and-evolution / adaptation-todo / 后续版本 | ❌ 必须收敛进 §4 开放决策 |
| **L4** 已写打算 | "我打算这样做" / "由 [FR-XXX.N] 修复" / "待 PoC 验证" | ❌ 必须收敛进 §4 开放决策 |

**任意一条 `[OPEN]` 未关闭，版本状态最高只能 `Conditional`，禁止 `Final`。**

---

## 1. Constitution Re-check（终审门禁）

逐条过 `constitution.md §1` 的 NON-NEGOTIABLE：

| 条款 | 复审结论 | 证据级别 | 证据描述 |
|---|---|---|---|
| P-001 | ⬜ PASS / ⬜ FAIL / ⬜ 已豁免 | L1 / L2 / L3 / L4 | （贴 PR / commit / 文件路径 / 豁免登记位置）|
| P-002 |  |  |  |
| P-003 |  |  |  |
| P-004 |  |  |  |
| P-005 |  |  |  |
| P-006 |  |  |  |
| P-007 |  |  |  |

**Brownfield 已知违反 KV-xxx 复审**（如适用）：

| KV ID | 违反条款 | 修复证据级别 | 修复证据 |
|---|---|---|---|
| KV-1 | P-xxx | L1 / L3 | （L1 = PR 链接；L3 = "将由 [FR-xxx] 修复"——仅允许走豁免路径，不算 PASS）|

**结论**：
- ⬜ 全部 L1/L2 通过 → 允许 Final
- ⬜ 有违反但已修订宪法 + 豁免登记完整（constitution.md §4 + open-decision-register.md 双登记） → 允许 Conditional
- ⬜ 有违反未修订也未豁免 → FAIL

**禁止路径**（命中即 FAIL）：
- ❌ "我打算修，路径是 [FR-xxx.N]"
- ❌ "由批次 N 修复"
- ❌ "本版本终审通过，但实际未修"

---

## 2. SKILL.md Phase 12 Checklist

按 `SKILL.md §Phase 12 §B` 的清单逐项核对。**每一项必须填 `[OK-Lx]` 或 `[OPEN-Lx]` + 一句话证据**，不得空填、不得只打勾。

| # | 项 | 状态 | 证据级别 | 证据描述（文件 / PR / commit / 测试输出 / 决策时间） |
|---|---|---|---|---|
| 1 | 问题边界与核心场景已确认 | OK / OPEN | L1-L4 |  |
| 2 | `project-mode.md` 存在 / 形态判定合理 | OK / OPEN | L1-L4 |  |
| 3 | 版本目录两侧已创建且按版本号对齐 |  |  |  |
| 4 | Brownfield: `baseline-architecture.md` §1-§5 非空 |  |  |  |
| 5 | US/FR/SC/C 已编号且下游可回链 |  |  |  |
| 6 | Constitution 已锁定，终审 Re-check 通过 |  |  |  |
| 7 | Brownfield: Constitution 已检出已知违反并登记豁免 |  |  |  |
| 8 | **Brownfield 已知违反 KV-xxx 已逐条修复**（L1）或正式豁免登记（L1+L2）|  |  |  |
| 9 | 架构驱动因素已提炼 |  |  |  |
| 10 | 至少 2 套候选方案已比较；Brownfield A=保留+增量 |  |  |  |
| 11 | 版本 `solution-options.md §8` 反工程化（初审 + §8.5 复审）|  |  |  |
| 12 | 组件清单已确认；Brownfield 标 `change_scope` |  |  |  |
| 13 | 技术栈已确认 |  |  |  |
| 14 | Brownfield 异构新栈有 ADR + W-xxx |  |  |  |
| 15 | 核心链路 / 数据边界已明确 |  |  |  |
| 16 | 根级 `risk-and-evolution.md` 覆盖完整 |  |  |  |
| 17 | 版本 delta.md 三段齐全（架构 + API）|  |  |  |
| 18 | API 侧 breaking change 已正确处理（**任何新增 required 字段/header 默认 breaking**；要降级必须 L1 兼容窗口策略 + 旧客户端样本/契约证据）|  |  |  |
| 19 | 基线 4 ADR + 触发清单动态追加完成；每份含 FR/US 回链、宪法引用、本版本回链；**所有 `Accepted` ADR 必须 L1（PoC/测试）+ L2（用户/团队确认）双证据**；**任何 `Proposed`/`PoC Required` ADR 阻塞 Final** |  |  |  |
| 20 | API 设计接口表有"服务于 FR-xxx"列 |  |  |  |
| 21 | Brownfield: `adaptation-summary.md` 覆盖完整 |  |  |  |
| 22 | Brownfield: modify 模块 `adaptation-todo-v{{x.y.z}}.md` 产出 |  |  |  |
| 23 | 目标模块目录存在；Brownfield 现有模块未被重建 |  |  |  |
| 24 | 模块基础工程文件存在；Brownfield 仅追加 docs/ |  |  |  |
| 25 | Phase 10.5 Version Merge 已完成 |  |  |  |
| 26 | 每份累积态文档顶部含 Last updated 行 |  |  |  |
| 27 | `ai-docs/architecture/` 累积态关键文档存在 |  |  |  |
| 28 | 版本目录决策文档齐全 |  |  |  |
| 29 | `ai-docs/apis/` 累积文档存在 |  |  |  |
| 30 | 版本 API 决策文档齐全 |  |  |  |
| 31 | 每个模块 README.md 存在 |  |  |  |
| 32 | 每个模块 docs/index.md 存在 |  |  |  |
| 33 | 关键文档含 Mermaid 图示 |  |  |  |
| 34 | **Greenfield 骨架自检**（`check-no-business-shell.sh`）— 必须 L1：脚本输出 + 时间戳 + 路径；标 N/A 须说明 Brownfield 模式 |  |  |  |
| 35 | 外部契约假设表 §4：每条 A-xxx 有决策截止日（T-N）+ 过期降级方案；**T-N 已过仍未确认 → Requires Rework** |  |  |  |
| 36 | 终审报告按本模板结构产出（含 §1~§6） |  |  |  |
| 37 | **open-decision-register.md（或本文件 §4 内嵌开放决策节）已收敛全部 `[OPEN]` 项**，每项有决策人 + 截止日 + 升级路径 |  |  |  |
| 38 | `bash scripts/verify.sh` 通过 |  |  |  |

**统计**：
- `[OK-L1]` × ____
- `[OK-L2]` × ____
- `[OPEN-L3]` × ____（必须同步登记到 §4）
- `[OPEN-L4]` × ____（必须同步登记到 §4）

**自动判定**：
- 全部 OK 且 0 个 OPEN → **可进入 §6 PASS 路径**
- ≤ 2 个 `[OPEN-L3]` 且不涉及客户端协议/数据 schema/安全鉴权 → **可进入 §6 CONDITIONAL 路径**
- 其他 → **必须进入 §6 FAIL / Requires Rework 路径**

---

## 3. 产物清单汇总

### 版本决策过程（PASS 后永久冻结）

```
ai-docs/architecture/versions/v{{x.y.z}}/
├── README.md
├── requirement-analysis.md
├── architecture-drivers.md
├── solution-options.md
├── delta.md
├── adaptation-summary.md       # 仅 Brownfield
├── tech-stack-inheritance.md   # 仅 Brownfield
├── open-decision-register.md   # iter-6 新增（P0 强化要求）
└── final-validation-report.md  # 本文件
```

### 累积态

```
ai-docs/architecture/
├── project-mode.md
├── constitution.md
├── baseline-architecture.md   # 仅 Brownfield
├── architecture-overview.md
├── logical-architecture.md
├── physical-architecture.md
├── capability-model.md
├── domain-model.md
├── data-model.md
├── risk-and-evolution.md
└── adr/ADR-NNN-*.md × {{n}}

ai-docs/apis/
├── api-design.md
├── openapi.yaml
└── api-contract-mapping.md
```

---

## 4. 开放决策与外部契约假设登记（PASS 准入硬要求）

> 本节是 P0 强化后的核心：**所有 `[OPEN-L3/L4]` 项 + 所有 A-xxx 假设必须在此收敛**。
> 若已单独产出 `open-decision-register.md`，本节可改为引用，但不得空缺。

### 4.1 开放决策清单（来自 §2 中 `[OPEN]` 项 + ADR 中 `Proposed` / `PoC Required` 项）

| # | 决策项 | 当前状态 | 建议状态 | 决策人 | 决策截止日 | 必须补齐的证据 / 动作 | 升级路径 |
|---|---|---|---|---|---|---|---|
| ODR-001 |  | Proposed / PoC Required / Deferred | Accepted / Deferred / Rejected | 用户 / 架构负责人 / 后端 |  |  | 升级至 Accepted 后回填证据级别 → 进入 Final |

### 4.2 外部契约假设登记（T-N 决策截止）

> T-N 参考值：
> - 展会 / 硬截止发布：T-7（给兜底代码留一周）
> - 互联网常规迭代：T-3
> - 企业级上线：T-14

| # | 假设描述 | 责任方 | 决策截止日（T-N）| 过期降级方案 | 影响范围 | 关联 V-xxx |
|---|---|---|---|---|---|---|
| A-001 |  | 用户 / 上游 | T-7（{{YYYY-MM-DD}}） |  |  |  |

**交付前最后复核**：在 {{交付日-7}} 之前由 {{责任人}} 逐条确认；未按期确认的假设当天启动对应"过期降级方案"，不等不拖。

---

## 5. 关键遗留任务（交接给实施阶段）

> **注意**：以下任务**不可作为 §1/§2 的 PASS 证据**——它们是 PASS 之后的实施工单，不是终审证据。

- [ ] 项目骨架 TDD 补齐（Brownfield 不预生成业务空壳）
- [ ] Greenfield 跑 `bash scripts/check-no-business-shell.sh <产物根>`（结果 L1 已贴在 §2 #34）
- [ ] 外部契约假设表 T-N 兜底代码预埋（demo-mode、feature-flag、kill-switch）
- [ ] 契约测试落地（OpenAPI → Pact / Spring Cloud Contract / RestAssured）
- [ ] 监控看板 + 告警规则对齐 `risk-and-evolution.md §8`
- [ ] 各 ODR 升级路径执行

---

## 6. 最终判定

### 6.1 路径自动选择

```
IF §2 全部 [OK-L1/L2] 且 0 个 [OPEN] 且 §1 全过 且 verify.sh 通过:
    → PASS（版本状态 Final，永久冻结）

ELIF §2 中 ≤ 2 个 [OPEN-L3]
     且 不涉及（客户端协议 / 数据 schema / 安全鉴权）三大不可逆面
     且 每个 OPEN 在 §4 有决策人 + 截止日 + 降级方案:
    → CONDITIONAL-PASS（版本状态 Conditional；
                        允许启动工程化基线批次，但不可推进结构性重构；
                        所有 OPEN 关闭后必须二次终审才能 Final）

ELSE:
    → FAIL / Requires Rework（版本状态保持 Draft；
                              列出阻塞项；修复后重跑 Phase 12）
```

### 6.2 本次判定

⬜ **PASS**

⬜ **CONDITIONAL-PASS**：允许在以下条件下继续推进（每条必须有解除条件的验证方式）：
- 条件 1：
- 条件 2：

⬜ **FAIL / Requires Rework**：阻塞项列表
- 阻塞 1：
- 阻塞 2：

### 6.3 签字

- 架构负责人 / 用户：
- 终审日期：
- 版本状态切换：Draft → **{{Final | Conditional | Requires Rework}}**

仅 PASS 时版本目录锁定为 Final；后续变更须通过新版本（次版本号 / 修订号 +1，例如 `v0.2.0`）走完整流程。
CONDITIONAL / Requires Rework 状态下，版本目录保持 Draft，需在条件解除后二次终审。
