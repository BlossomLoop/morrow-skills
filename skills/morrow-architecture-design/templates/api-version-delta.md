# 版本 v{x.y.z} Delta — API 侧

> **本文件是 Phase 10.5 Merge 的机器可读输入**。必须严格遵守三段式结构：`## 新增 / ## 修改 / ## 删除`。
> Merge 脚本按段落类型自动刷新 `ai-docs/apis/` 根级累积文档（`openapi.yaml` / `api-design.md` / `api-contract-mapping.md` / `contracts/*`）。
> 一旦 Phase 12 终审通过，本文件**永不修改**。

---

## 元数据

| 字段 | 值 |
|------|------|
| 版本 | `v{x.y.z}` |
| 架构侧对应 delta | `architecture/versions/v{x.y.z}/delta.md` |
| 涉及模块 | `<module-1>` / `<module-2>` / ...（一个版本可同时承载多模块） |
| 上一版 OpenAPI 版本 | `<x.y.z>` |
| 本次产出后 OpenAPI 版本 | `<x.y.z>`（breaking 则主版本 +1） |
| 是否含 breaking 变更 | 是 / 否 |
| 产出时间 | YYYY-MM-DD |

---

## 新增

> 本版本新增的接口 / Schema / 契约草案。Merge 时追加到根级 `openapi.yaml` 与 `api-design.md §接口总表`。
> 多模块共享一份 delta.md：每条接口可在"服务于 FR"列附带模块归属（如 `FR-002 (module-payment)`）。

### 新增接口

| Method | Path | 简述 | 服务于 FR | 鉴权 | 合并到 |
|--------|------|------|-----------|------|--------|
| POST | `/v1/<path>` | <接口功能> | FR-xxx | access_token | `openapi.yaml paths:` + `api-design.md §3 接口总表` |
| GET  | `/v1/<path>` | ... | FR-yyy | access_token | 同上 |

### 新增 Request / Response Schema

```yaml
# 合并到 openapi.yaml components.schemas
components:
  schemas:
    <SchemaName>:
      type: object
      properties:
        field1:
          type: string
```

### 新增契约草案

| 契约文件 | 路径 | 用途 | 合并到 |
|----------|------|------|--------|
| `<契约>.md` | `apis/versions/v{x.y.z}/contracts/<契约>.md` | <场景> | 稳定后升级到 `apis/contracts/` |

### 新增 FR ↔ 接口映射

| FR | 接口 | 合并到 |
|----|------|--------|
| FR-xxx | POST /v1/... | `api-contract-mapping.md` |

---

## 修改

> 修改既有接口 / Schema。Merge 时字段级 patch；breaking 强制 bump `info.version` 主版本。

### 接口变更（非 breaking）

| Method | Path | 变更内容 | 合并到 |
|--------|------|----------|--------|
| POST | `/v1/<path>` | 新增可选字段 `foo`（向后兼容） | `openapi.yaml` 对应 path；`info.version` 次版本 +1 |

### 接口变更（breaking）

| Method | Path | 变更内容 | 迁移方案 | 合并到 |
|--------|------|----------|----------|--------|
| POST | `/v1/<path>` | `bar` 字段由 optional 改为 required | 先发 v2 路径 `/v2/<path>` 并发运行 N 周期 | `openapi.yaml`；`info.version` **主版本 +1** |

**所有 breaking change 必须同步**：
1. `openapi.yaml info.version` 主版本 +1
2. 架构侧 delta 有对应 ADR 说明迁移方案
3. `api-design.md §breaking history` 记录变更日期 + 迁移截止日

### Schema 变更

| Schema | 变更类型 | 字段 | 是否 breaking | 合并到 |
|--------|----------|------|--------------|--------|
| `<Schema>` | add / rename / restrict | `<field>` | 是 / 否 | `openapi.yaml components.schemas` |

---

## 删除

> 废弃接口 / Schema。Merge 时先标 `deprecated: true`，保留一个 release cycle 后真删。

### 废弃接口

| Method | Path | 废弃原因 | 推荐替代 | 最后保留到 | 合并到 |
|--------|------|----------|----------|------------|--------|
| GET | `/v1/<old>` | <原因> | GET /v2/<new> | `v<next-release>` | `openapi.yaml` 标 `deprecated: true` + `api-design.md §废弃清单` |

### 废弃 Schema

| Schema | 废弃原因 | 合并到 |
|--------|----------|--------|
| `<OldSchema>` | 被 `<NewSchema>` 替代 | `openapi.yaml` 标注 + `api-design.md §废弃清单` |

---

## Merge 后刷新标记

Merge 完成后，`openapi.yaml` 与 `api-design.md` 顶部（或 `info.description` / 文档首段）必须追加：

```markdown
> Last updated: v{x.y.z} (YYYY-MM-DD) — 新增 X 接口 / 改 Y Schema / 废弃 Z
```

---

## Breaking Change 检测清单（iter-6 强化 P0）

> **核心规则**：本清单**任一项命中**即默认视为 breaking，强制 `info.version` 主版本 +1。
> **唯一例外**：要把命中项**降级**为非 breaking，必须同时满足下文 §"降级条件"——靠"我评估觉得不算"、"客户端实际一直在传"、"应该没人用旧版"这类**主观判断一律不准**。

### A. 检测项（命中即默认 breaking）

- [ ] 删除既有接口（即使是 deprecated）
- [ ] 删除 / 重命名 Path 或 HTTP method
- [ ] 删除 Response 字段（含嵌套字段）
- [ ] **Request 新增 required 字段（含 header / query / body 任一位置）**
- [ ] **既有 optional 字段改 required**
- [ ] 字段类型变更（string → int / object → array 等）
- [ ] 字段 enum 值**收窄**（去掉一个枚举值）
- [ ] 字段长度 / 范围约束**收紧**（如 maxLength 200 → 100）
- [ ] 鉴权方式变更（含从 default 假鉴权改为强制 header 必填）
- [ ] 错误码重新编号 / 错误响应 Schema 变更
- [ ] SSE / WebSocket 事件类型集合收窄（删事件 / 改 event 名）
- [ ] SSE / WebSocket 事件字段顺序变更（如客户端按字节序解析）
- [ ] HTTP 状态码语义变更（同样路径同样请求改返不同 2xx/4xx/5xx）

### B. 降级条件（必须**同时**满足三项才能把上述命中项降级为非 breaking）

要把任一 [A] 命中项降级为非 breaking，**必须**在 `delta.md §修改 / 接口变更（非 breaking）` 表格的对应行附上下列三项 L1 证据（缺一项即维持 breaking）：

1. **兼容窗口策略书面化**（L1）：
   - 缺失 / 不符合新规则的旧请求在过渡期如何处理（不能 401/400 直接拒；应给默认值 / 生成 anonymous 上下文 / 打 WARN 指标）
   - 过渡期长度（如"≥ 1 个 release cycle"）+ 过渡期结束的硬性条件（如旧客户端比例 < 1% 持续 2 周）
   - 过渡期内的客户端可见行为差异说明
2. **旧客户端真实样本 / 契约证据**（L1）：
   - 抓取近 N 天生产真实请求样本说明该字段的传入率分布（不能只说"我以为客户端都传"）
   - 或者已有契约测试 / 集成测试覆盖"缺失字段 / 旧版字段"场景且通过
3. **OpenAPI 兼容期标注**（L1）：
   - `info.description` 或对应 path 的 `description` 中显式标注"过渡期 N 个 release cycle"
   - 不允许在 OpenAPI 文档中出现"零 breaking"等绝对表述

**满足 §B 三项**：该项可记入 §修改 / 接口变更（非 breaking）；**版本号仍 bump 次版本号**，记入 `api-design.md §breaking history` 注明"本可视为 breaking，但通过兼容窗口降级"。

**未满足 §B 三项**：维持 breaking，强制 bump 主版本，并在架构侧 ADR 说明迁移方案。

### C. 禁止式样（命中即终审 FAIL）

- ❌ "我评估觉得这不算 breaking"——主观判断不算证据
- ❌ "客户端实际一直在传这个字段，所以非 breaking"——必须有抓样证据
- ❌ "新版客户端会兼容"——必须有"旧版客户端兼容窗口策略"，不是"新版客户端怎么处理"
- ❌ "字段从 default 改成必填，不算改协议"——这就是新增 required，明确视为 breaking
- ❌ "这条争议先标非 breaking，等联调再说"——争议项默认 breaking，要降级走 §B
- ❌ "OpenAPI 写零 breaking"——禁止出现"零 breaking / zero-breaking"绝对表述；必须改为"过渡期内字节级兼容 + 过渡期结束条件"

### D. 与终审的耦合

终审 Phase 12 §B Checklist 第 18 项（"API 侧 breaking change 已正确处理"）要求：
- §A 检测清单逐项核对，**每项必须填 [OK-L1] 已检查 + 证据描述**（不允许打勾不填证据）
- §A 命中项若降级到 §修改 / 非 breaking，**必须**贴 §B 三项 L1 证据的文件路径
- 任一命中项无法满足 §B 三项 → 必须 bump 主版本，否则该版本不允许 Final

> 判定 delta.md 是否合格：`bash scripts/merge-version.sh v{x.y.z} --api --dry-run` 能无错解析三段结构 + 正确检测 breaking + 验证 §B 降级证据存在。
