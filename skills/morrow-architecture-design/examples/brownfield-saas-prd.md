# Brownfield 存量 SaaS 扩展 PRD 样例

## 样例目的

验证 skill 在 **Brownfield（存量项目）** 路径下的全流程行为：Phase 0.3 形态探测、baseline 抽取、Phase 5 `change_scope` 标记、Phase 6 栈继承、Phase 10 adaptation-summary 产出，以及异构新栈引入时的 ADR 触发。

## 预设运行环境（mock baseline）

> 评测运行前，请在当前工作目录模拟以下文件结构；或在 prompt 中显式告诉 skill "假设仓库当前已有如下文件"。

```
./
├── pom.xml                      # Spring Boot 2.7.x，现有单体
├── Dockerfile                   # openjdk:17 基础镜像
├── docker-compose.yml           # mysql + redis + app
├── src/main/java/com/acme/saas/ # 现有后端代码
├── admin-web/                   # 现有 Vue 管理台
│   └── package.json             # vue: 3.x, vite: 4.x
├── .github/workflows/ci.yml     # 现有 CI
└── README.md                    # 说明"培训 SaaS 一期，单体"
```

## 业务背景

公司已上线一套单体培训 SaaS（后端 Spring Boot 单体 + Vue 管理台），目前仅支持单租户。客户侧提出多家分公司独立数据隔离的诉求，同时希望引入 AI 作文批改能力减轻讲师负担。

## 核心角色

- 平台管理员
- 租户管理员（新增）
- 讲师
- 学员

## 核心目标

- 在**不重写**现有 Spring Boot 单体的前提下，为系统引入多租户隔离
- 新增 AI 作文批改服务（独立部署，不进单体）
- 管理台扩展租户管理模块，不重写现有页面
- 保持现有 CI / 部署流程可继续使用

## 重难点

- 多租户隔离的最小侵入改造（租户字段 + 数据过滤，非分库）
- AI 批改服务与单体的异步对接（结果回调 / 失败重试）
- 管理台新老页面共存，样式与路由兼容

## 约束

- 现有单体不可重建：`src/` 结构、`pom.xml` 主要依赖不动
- 管理台不替换 Vue 版本，不切换 Vite 版本
- AI 批改服务**允许**使用 Python + FastAPI（团队有相关经验），需给出跨栈协作说明
- CI 流水线保持 GitHub Actions，不切换 CI 平台
- 数据库保持 MySQL，不引入新存储

## 期望 skill 行为

1. Phase 0.3 正确识别为 Brownfield（强信号 ≥ 3）
2. baseline-architecture.md 抽出现有组件（单体后端、Vue 管理台）、栈（Spring Boot 2.7、Vue 3、MySQL、Redis）、CI、Docker
3. Phase 4 候选 A 必须为"保留现有单体 + 增量改造"
4. Phase 5 组件表含 `change_scope`：
   - 现有单体 → `modify`
   - 现有管理台 → `modify`
   - AI 批改服务 → `new`
5. Phase 6 继承表保留 Spring Boot / Vue / MySQL / Redis；AI 批改服务显式引入 Python + FastAPI，触发 ADR
6. risk-and-evolution.md W-xxx 登记"现在不做统一栈"的理由
7. adaptation-summary.md 含完整变更矩阵 + Do-Not-Touch 清单（至少含 `pom.xml 主要依赖`、`现有数据库 schema 表结构`）
8. Phase 10 不重建任何已有目录；仅在相关模块下追加 `docs/` 与 `adaptation-todo-v{x.y.z}.md`（按版本号绑定，例如首版 `adaptation-todo-v0.1.0.md`）
