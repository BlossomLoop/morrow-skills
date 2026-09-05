# examples 样例 PRD

本目录承载 `morrow-architecture-design` 的样例 PRD，作为评测输入。

## 样例列表

| 样例 | 模式 | 用途 |
|------|------|------|
| `minimal-prd.md` | Greenfield · 强引导 | 极简输入，验证 skill 能否识别出组件与技术栈 |
| `mid-size-saas-prd.md` | Greenfield · 半自动 | 中型 SaaS，验证完整架构文档 + ADR 动态追加 |
| `unsupported-stack-prd.md` | Greenfield · 降级 | 未覆盖技术栈，验证通用骨架回退 |
| `brownfield-saas-prd.md` | Brownfield · 半自动 | 存量单体扩展，验证 Phase 0.3 探测 / baseline / change_scope / adaptation-summary 与异构新栈 ADR；**评测前需预先铺 mock baseline 文件**（见样例 §预设运行环境） |

跑完的评测记录请放到 `workspace/iteration-N/`；不要在本目录沉淀"期望输出清单"那类高维护成本的手写快照。
