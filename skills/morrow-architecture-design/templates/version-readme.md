# 版本 v{x.y.z} — 架构设计

> **版本目录**：`ai-docs/architecture/versions/v{x.y.z}/`
> **产出时间**：YYYY-MM-DD
> **项目形态**：Greenfield / Brownfield
> **状态**：Draft / In Review / Final（Phase 12 终审通过后锁定为 Final，此后**永不修改**）

> 本文件是本次版本的**决策入口**。它不是累积态文档——系统当前全貌请看根级 `architecture/*.md` 与 `apis/openapi.yaml`。

---

## 1. 本轮 scope

### 1.1 一句话概括

> 本版本要解决什么问题 / 新增什么能力 / 改造哪些模块（≤ 50 字）。

### 1.2 涉及组件

| 组件 | change_scope | 简述 |
|------|--------------|------|
| `<component-1>` | new / modify / keep / remove | 本次做什么 |
| `<component-2>` | ... | ... |

> Greenfield 首次架构（`v0.1.0`）也请填本表：change_scope 统一填 `new`。
> 一个版本可同时承载多模块决策；不同模块在本表中分行表达。

### 1.3 关联需求

- **US**：US-xxx、US-yyy（从 `requirement-analysis.md` 回链）
- **FR**：FR-xxx、FR-yyy
- **SC**：SC-xxx（成功标准）
- **C**：C-xxx（硬约束）

---

## 2. 本版本产出物清单

| 产物 | 路径 | 说明 |
|------|------|------|
| 本 README | `versions/v{x.y.z}/README.md` | 本文件 |
| 需求分析 | `versions/v{x.y.z}/requirement-analysis.md` | 本次新需求的 US / FR / SC / C / A |
| 架构驱动因素 | `versions/v{x.y.z}/architecture-drivers.md` | 本次新驱动因素 |
| 候选方案 | `versions/v{x.y.z}/solution-options.md` | 候选 + §8 / §8.5 反工程化 |
| Delta（架构侧） | `versions/v{x.y.z}/delta.md` | 三段式：新增 / 修改 / 删除 |
| Adaptation Summary | `versions/v{x.y.z}/adaptation-summary.md` | Brownfield 独有 |
| 终审报告 | `versions/v{x.y.z}/final-validation-report.md` | Phase 12 终审 |

API 侧对应目录：`ai-docs/apis/versions/v{x.y.z}/`（含 README / delta.md / contracts/）

---

## 3. 本轮关联 ADR

### 3.1 新增 ADR

| ADR 编号 | 标题 | 触发类别（adr-trigger-checklist） |
|----------|------|-----------------------------------|
| ADR-NNN | <标题> | A / B / C / D / E / F / G |
| ... | ... | ... |

### 3.2 修改既有 ADR

| ADR 编号 | 变更内容 | 版本号 |
|----------|----------|--------|
| ADR-xxx | 新增 v2 节，加入... | v1 → v2 |

> ADR 文件始终落在全局 `ai-docs/architecture/adr/`（跨版本累积编号），本节只做清单引用。

---

## 4. 本版本引用的宪法条款

- P-xxx：<条款简述>（本版本如何遵守）
- P-yyy：<条款简述>
- 若本版本挑战了某条宪法 → 必须先修订宪法（见 `constitution.md §0 修订历史`）

---

## 5. Phase 10.5 Merge 清单

> 本节在 Phase 10.5 Merge checkpoint 完成后由 Claude 填写。

- [ ] `logical-architecture.md` 已追加本轮新增组件节点
- [ ] `physical-architecture.md` 已追加本轮新增部署节点
- [ ] `domain-model.md` 已追加本轮新增实体
- [ ] `data-model.md` 已追加本轮新增 DDL
- [ ] `capability-model.md` 已追加本轮新增能力
- [ ] `risk-and-evolution.md` 已追加本轮 V / W / E 编号
- [ ] `adr/ADR-NNN.md` 已落位（新增 ADR）/ 已 bump 版本节（修改既有 ADR）
- [ ] API 侧：`openapi.yaml` 已合并本轮接口变更；breaking 已 bump `info.version`
- [ ] API 侧：`api-design.md §接口总表` 已追加本轮接口行
- [ ] 根级 7 份累积态文档顶部 `Last updated: v{x.y.z} (YYYY-MM-DD)` 已刷新

合并脚本：`bash scripts/merge-version.sh v{x.y.z}`

---

## 6. 终审签字

- **Phase 12 终审**：✅ PASS / ❌ FAIL（见 `final-validation-report.md`）
- **终审日期**：YYYY-MM-DD
- **签字人**：<架构负责人 / 用户>

---

## 7. 与其他版本的关系

- **上一版本**：v{x'.y'.z'}（累积态的起点；首个版本此处填 baseline 或留空）
- **后续可能的版本**：v{x''.y''.z''}（已在 `risk-and-evolution.md §7` 登记为 E-xxx 触发）

---

> **判定本版本是否真正完成**：
> 6 个月后再有新版本来复用本轮决策时，能不能从本 README 5 分钟内理解当时为啥这么做？不能就说明 scope / 关联 ADR / Merge 清单没写全。
