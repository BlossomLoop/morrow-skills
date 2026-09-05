# {{project_name}} API 双产物映射约定

## 1. 映射目标

确保 `api-design.md` 与 `openapi.yaml` 表达的是同一套接口契约，只是面向不同读者：

- `api-design.md`：偏产品与架构说明，强调语义、边界、错误语义和调用约束
- `openapi.yaml`：偏结构化契约，强调路径、方法、Schema、安全定义和响应码

## 2. 章节映射

| api-design.md | openapi.yaml | 说明 |
|---------------|--------------|------|
| API 设计原则 | `info.description` / 顶层约束 | 记录统一设计原则 |
| 接口域划分 | `tags` | 每个接口域对应至少一个 tag |
| 核心接口清单 | `paths` | 每个核心接口要落到具体 path + method |
| 请求与响应模型 | `components.schemas` | 请求体、响应体、公共对象统一建模 |
| 错误码与错误语义 | `responses` / `components.responses` | 错误码含义要和文档一致 |
| 鉴权与安全要求 | `components.securitySchemes` / `security` | 鉴权方式必须同步 |
| API 风格与兼容性决策 | `servers` / 版本策略 | 版本与环境约束同步描述 |

## 3. 维护规则

- 新增接口时，必须同时更新 `api-design.md` 与 `openapi.yaml`
- 调整字段语义时，先更新 `api-design.md` 的语义说明，再同步到 `openapi.yaml`
- 删除接口时，同时更新接口域说明、paths 和错误语义

## 4. 校验清单

- `api-design.md` 中列出的核心接口，在 `openapi.yaml` 中都能找到
- `openapi.yaml` 中定义的核心业务接口，在 `api-design.md` 中都有语义说明
- 错误码、鉴权方式、版本策略三者保持一致
