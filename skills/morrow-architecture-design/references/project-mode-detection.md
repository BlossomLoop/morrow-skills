# 项目形态探测规则（Phase 0.3 使用）

> 目的：在进入架构设计前，**自动判定**当前工作目录是 Greenfield（全新项目）还是 Brownfield（已有项目），决定后续 Phase 的行为分岔。
> 探测必须给出**明确结论 + 证据**，不允许"大概是 Brownfield"。

---

## 1. 信号分级

### 1.1 强信号（任一命中即判定 Brownfield）

- **构建配置文件**（工作目录 ≤ 3 层内）：
  - `package.json` / `yarn.lock` / `pnpm-lock.yaml`（Node/Web）
  - `pom.xml` / `build.gradle` / `build.gradle.kts` / `settings.gradle`（Java/Kotlin/Android）
  - `pyproject.toml` / `setup.py` / `requirements.txt` / `Pipfile`（Python）
  - `go.mod` / `go.sum`（Go）
  - `Cargo.toml`（Rust）
  - `pubspec.yaml`（Flutter / Dart）
  - `composer.json`（PHP）
  - `Gemfile`（Ruby）
  - `*.csproj` / `*.sln`（.NET）
  - `Podfile` / `*.xcodeproj`（iOS）
- **已有源码目录且非空**：`src/` / `app/` / `lib/` / `internal/` / `pkg/` / `cmd/` 下存在 ≥ 1 个本语言源文件
- **CI / 容器配置**：`Dockerfile` / `docker-compose.yml` / `.github/workflows/*.yml` / `Jenkinsfile` / `.gitlab-ci.yml`
- **README 明确声明"已有系统"或"二期"**（需人读判定）

### 1.2 弱信号（只看弱信号时需人工确认）

- `.git` 目录存在但无源码（只提交过 README / docs）
- 仅有 `docs/` / `ai-docs/` / `tests/` 等元数据目录
- 有 `.editorconfig` / `.gitignore` 但无源码
- README 只写了产品概念，无实现

### 1.3 反信号（判定 Greenfield 的辅证）

- 工作目录除 `.claude/` / `tests/{PRD}.md` 外完全空
- 仅有 skill 自身的 `ai-docs/architecture/` 输出（说明 skill 跑过几次但项目还没建）
- 有 `prd.md` / `*prd*.md` 但无任何构建配置

---

## 2. 判定流程

```
1) 扫描 CWD 前 3 层文件树，收集：构建文件 / 源码目录 / CI / README
2) 命中任一强信号 → mode = brownfield；停止
3) 只有弱信号 → 输出"候选 brownfield"，向用户一句话确认
4) 无强 / 弱信号 + 命中反信号 → mode = greenfield
5) 模糊不清 → 默认 greenfield，但在 project-mode.md 记录"低置信度"
```

## 3. Brownfield 下必须进一步抽取的信息

| 信号文件 | 必须从中抽取 | 写到 |
|---------|--------------|------|
| `package.json` | `name / dependencies / devDependencies / scripts` 前 20 项 | `baseline-architecture.md §2 技术栈` |
| `pom.xml` / `build.gradle` | 主要依赖坐标 + 版本 | 同上 |
| `pyproject.toml` / `requirements.txt` | 顶层依赖名 + 版本 | 同上 |
| `go.mod` | `module` + `require` 列表 | 同上 |
| 现有源码目录结构 | 顶层包 / 模块名；不抓业务实现 | `baseline-architecture.md §1 组件清单` |
| `Dockerfile` / compose | 基础镜像 + 暴露端口 | `baseline-architecture.md §3 运行时` |
| README 第一段 | 项目定位 | `baseline-architecture.md §4 业务概要` |

**不做的事**：不读业务代码、不做静态分析、不抓 call graph。Phase 0.3 只做"表层盘点"。深度拆解留给 Phase 5 组件识别。

---

## 4. 探测产物

只产出一份：`ai-docs/architecture/project-mode.md`（≤ 30 行），含：

- `mode: brownfield | greenfield`
- `confidence: high | low`
- 探测到的信号清单（带路径）
- 推断出的主要技术栈（如适用）
- 如果是 Brownfield，同时触发 `baseline-architecture.md` 产出

## 5. 分岔行为

| Phase | Brownfield 行为 | Greenfield 行为 |
|-------|-----------------|------------------|
| 0.5 Constitution | 锁定原则时**必须**检查现有代码是否已违反（记为已知违反 + 豁免日期）| 从零锁定原则 |
| 4 候选方案 | 必须把"保留现状 + 增量改造"作为候选 A | 候选 A 是"最简 V0"|
| 5 组件识别 | 基于 `baseline-architecture.md` 盘点；每个组件加 `change_scope ∈ {keep, modify, new, remove}` | 从 PRD 新识别 |
| 6 技术栈 | **跳过"与用户确认"**，默认继承现有栈；引入新栈时才问 | **强制**向用户确认（或给出推荐 + 让用户选）|
| 10 骨架生成 | 不新建 module 目录；仅追加 `docs/` / `README.md`；变更项落到 `adaptation-todo-v{x.y.z}.md`（按版本号绑定） | 按技术栈生成最小骨架 |

## 6. 降级策略

- **探测误判**：用户有权在 Phase 0.3 结束前手动切换 mode（`project-mode.md` 显式允许手动覆盖）
- **混合项目**（仓库里既有老代码又要新建独立模块）：按"新建模块目录"的粒度分别判定——老模块走 Brownfield，新模块走 Greenfield
- **只读老代码情况**：如果用户在只读沙箱里跑 skill，探测正常；只是 Phase 10 骨架生成要落到 `scaffolds/` 而非根目录

---

## 7. 反模式（禁止）

- ❌ 看到 `.git` 就判 Brownfield——空仓库也有 `.git`
- ❌ 看到 `README.md` 就判 Brownfield
- ❌ 强信号命中后仍问用户"这是不是老项目"——探测已经给出证据
- ❌ Greenfield 场景下跳过技术栈确认（必须让用户选或显式推荐）
- ❌ Brownfield 场景下大改现有栈而不经过 ADR 说明迁移路径
