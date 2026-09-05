# 版本 v{x.y.z} Delta — 架构侧

> **本文件是 Phase 10.5 Merge 的机器可读输入**。必须严格遵守三段式结构：`## 新增 / ## 修改 / ## 删除`。
> Merge 脚本按段落类型自动刷新 `ai-docs/architecture/` 根级累积文档（`logical-architecture.md` / `data-model.md` / `risk-and-evolution.md` / `adr/*` 等）。
> 一旦 Phase 12 终审通过，本文件**永不修改**。

---

## 元数据

| 字段 | 值 |
|------|------|
| 版本 | `v{x.y.z}` |
| 上一版累积态基线 | `v{x'.y'.z'}`（或 `baseline-architecture.md` for 首次） |
| 涉及模块 | `<module-1>` / `<module-2>` / ...（一个版本可同时承载多模块） |
| 产出时间 | YYYY-MM-DD |
| 是否含 breaking 变更 | 是 / 否 |

---

## 新增

> 相对上一累积态，**本次新增**的全部架构元素。Merge 时追加到根级对应文档。
> 多模块共享一份 delta.md：每条记录通过"落地模块"列标明归属。

### 组件

| 组件名 | 职责 | 上游 / 下游 | 落地模块 | 合并到 |
|--------|------|------------|----------|--------|
| `<component>` | <一句话职责> | 上游: ... / 下游: ... | `<module-path>` | `logical-architecture.md §组件清单` + 组件图追加节点 |

### 部署节点

| 节点 | 角色 | 资源规格 | 落地模块 | 合并到 |
|------|------|----------|----------|--------|
| `<node>` | <deployment / stateful-set / daemon> | <cpu/mem/磁盘> | `<module-path>` | `physical-architecture.md §部署清单` + 拓扑图 |

### 领域实体

| 实体 | 状态机 | 关键字段 | 落地模块 | 合并到 |
|------|--------|----------|----------|--------|
| `<Entity>` | <state-diagram 引用> | ... | `<module-path>` | `domain-model.md §实体` |

### 数据表（DDL）

```sql
-- 合并到 data-model.md §表清单（新增节）
CREATE TABLE <table_name> (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ...
);
```

### 能力

| 能力 ID | 描述 | 归属组件 | 合并到 |
|---------|------|----------|--------|
| C-xxx | ... | `<component>` | `capability-model.md §能力清单` |

### 风险 / 取舍 / 演进（V / W / E）

| 编号 | 类型 | 描述 | 合并到 |
|------|------|------|--------|
| V-xxx | 脆弱点 | ... | `risk-and-evolution.md §脆弱点` |
| W-xxx | V1 选型理由 | ... | `risk-and-evolution.md §V1 理由` |
| E-xxx | 演进触发 | 当 <量化条件> 时升级 | `risk-and-evolution.md §演进触发` |

### ADR（新增）

| ADR 编号 | 标题 | 触发类别 | 合并到 |
|----------|------|----------|--------|
| ADR-NNN | <标题> | A / B / C / D / E / F / G | `adr/ADR-NNN-<slug>.md`（新文件） |

---

## 修改

> 相对上一累积态，**本次改动既有元素的行为 / 字段 / 契约**。Merge 时按字段级 patch 刷新。

### 组件行为变更

| 组件名 | 变更内容 | 是否 breaking | 落地模块 | 合并到 |
|--------|----------|--------------|----------|--------|
| `<component>` | <例如：新增异步回调路径 / 调整限流策略> | 否 | `<module-path>` | `logical-architecture.md` 对应节 + `architecture-overview.md` 变更说明 |

### 数据表变更

```sql
-- 合并到 data-model.md §表变更历史
ALTER TABLE <table> ADD COLUMN <col> <type>;
```

| 表名 | 变更类型 | 字段 | 是否 breaking | 合并到 |
|------|----------|------|--------------|--------|
| `<table>` | add-column / rename / alter-type | ... | ... | `data-model.md §变更历史` |

### 风险登记更新

| 编号 | 变更内容 | 合并到 |
|------|----------|--------|
| V-xxx | 监控指标从 ... 改为 ... | `risk-and-evolution.md §脆弱点` 对应行 |

### ADR 版本号 bump

| ADR 编号 | 变更内容 | 版本号变化 | 合并到 |
|----------|----------|------------|--------|
| ADR-xxx | 新增 v2 节：<变更点> | v1 → v2 | `adr/ADR-xxx-<slug>.md` 追加 `## v2` 节 + 超链本版本 |

---

## 删除

> 相对上一累积态，**本次下线 / 废弃的元素**。Merge 时标记 `deprecated`，保留一个 release cycle 后真删。

### 下线组件

| 组件名 | 下线原因 | 最后保留到 | 合并到 |
|--------|----------|------------|--------|
| `<component>` | <原因> | `v<next-release>` | `logical-architecture.md` 标 deprecated + ADR |

### 废弃数据表 / 字段

| 对象 | 类型 | 废弃原因 | 合并到 |
|------|------|----------|--------|
| `<table.column>` | 字段 | <原因> | `data-model.md §废弃清单` |

### 合并 ADR

| 保留 ADR | 合并来的 ADR | 合并原因 | 合并到 |
|----------|-------------|----------|--------|
| ADR-xxx | ADR-yyy | 决策重叠 | `adr/ADR-yyy` 标 Superseded + 指向 ADR-xxx |

---

## Merge 后刷新标记

Merge 完成后，根级对应文档顶部必须追加：

```markdown
> Last updated: v{x.y.z} (YYYY-MM-DD) — <本次变更概括：新增 X 组件 / 改 Y 表 / 下线 Z>
```

> 判定 delta.md 是否合格：`bash scripts/merge-version.sh v{x.y.z} --dry-run` 能无错解析三段结构，列出所有待合并项。
