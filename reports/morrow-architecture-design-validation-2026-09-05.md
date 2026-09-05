# morrow-architecture-design 脱敏与实测

日期：2026-09-05。范围：本仓库中的 skill 副本，原始目录保持不变。

结论：脱敏检查已完成。两种工具的澄清和存量盘点行为符合本轮限定范围；完整架构场景尚未全部通过。Codex 完成生成但仅满足 6/7 项产物断言，Claude 在测试窗口内未完成；另外复现了业务代码漏检和合并成功信号不可靠的问题。当前适合作为需要复核的架构辅助流程，不能把其脚本 PASS 或模型自评当成完整验收。

## 脱敏范围

- 将内部技术路线表替换为通用参考，移除私有文档链接、组织选型等级、专有 SDK、包名和内部版本约束。文件名保留，以兼容现有引用。
- 将 7 份历史评测改为匿名问题归纳，移除实际项目、客户、供应商、设备配置、评分及个人目录路径。保留原始问题的验证方法；这些归纳不作为当前版本通过的证据。
- 修改主技能中的项目及业务类示例，采用通用名称。
- 对副本全部文件进行标识、个人路径、常见密钥模式扫描，并人工检查剩余链接和密码相关命中。未再发现原始私有标识；示例中的 `changeme` 属于隔离 mock 配置，不是实际凭据。扫描结果不等于对所有可能敏感信息的绝对保证。
- 原始目录 89 个文件的 SHA-256 和权限均与复制前基线一致。副本保留 89 个文件，另增加评分器及其测试，共 91 个文件。

## 验证方法

使用脱敏后的冻结副本，在独立临时项目中分别建立 `.claude/skills/morrow-architecture-design` 和 `.agents/skills/morrow-architecture-design` 入口。显式调用 skill，记录实际工具读取、模型输出、产物和运行前后的文件哈希；禁止模型读取 `evals/` 评分内容。

Claude Code 2.1.233 使用 `claude -p`，模型为运行日志中的 `claude-opus-5`，推理强度 medium。Codex 使用 `codex exec --ephemeral --sandbox workspace-write -m gpt-5.5 -c model_reasoning_effort="medium"`；本机 Codex CLI 0.151.0 的默认模型请求返回“需要更新客户端”，因此仅在本次命令中切换模型。

测试禁止修改全局配置、安装依赖、访问业务网络、部署或执行 Git 操作。模型服务请求仍使用本机已有登录。每个场景只运行一次，没有无 skill 对照组；结果证明本次行为，不证明稳定成功率或相对收益。澄清和存量盘点提示中已提供新建/存量的背景，因此也不是项目形态识别准确率的盲测。

冻结副本的 `SKILL.md` SHA-256：`48c34d713146c461f37410292dd4e19366de5a460117c15055d2a4674bf85516`。主技能正文与当前副本一致；后续新增评分器、评测说明及报告链接不参与模型生成。

## 无头场景结果

| 场景 | Claude Code | Codex | 验证范围 |
|---|---|---|---|
| 信息不足的全新项目 | 通过，153.7 秒 | 通过，62.7 秒 | 正确识别 Greenfield；提出澄清问题；未替用户确认技术栈或生成业务代码 |
| 存量项目盘点 | 通过，206.8 秒 | 通过，174.4 秒 | 识别 Brownfield；读取 Spring Boot/Vue/MySQL/Redis 实际配置；建议增量修改；8 个原有文件及 PRD 的哈希未变 |
| Rust/Tauri 通用骨架 | 540.2 秒超时；部分产物匹配 2/7 | 538.6 秒完成生成；产物匹配 6/7，场景未全通过 | 独立检查产物、模板降级、API、开放项与证据边界 |

前两行是限定到澄清/盘点阶段的测试，不是原有完整场景通过。强引导场景两种工具一次提出了 14–15 组问题，交互负担偏大。Claude 的存量盘点还引入了未在本轮联网核实的维护状态判断；该判断不计入通过证据。

Claude 完整场景留下 8 份草稿，无 ADR-002、模块骨架和 OpenAPI，不能判完整场景通过。机器评分的 `mode.*greenfield` 未匹配它写出的 `Greenfield`，这一项是大小写格式问题，不是形态判断错误。超时只能说明本次未在 9 分钟测试窗口内完成，不能据此断言该流程永远无法完成。

另发现资源定位错误：Claude 在 `project-mode.md` 中称 skill 目录为空、`references/project-mode-detection.md` 和 `templates/project-mode.md` 不存在。实际沿同一个项目软链接读取，两文件均存在。轨迹中使用的 `find` 没有跟随目录软链接，不能据此判定资源缺失；这是实际生成内容中的错误，需独立于超时处理。

Codex 生成 37 个文件：三套模块 README/docs、6 份 Proposed ADR、架构和 API 草稿。逐个检查三套模块都有 README 和 docs/index，未生成业务代码；保留 Rust/Tauri 及专用模板缺失说明；版本保持 Draft / Requires Rework，没有把 PoC 或生产审签写成完成。OpenAPI 3.1.0 可被 YAML 解析器读取，包含 7 条路径，本地 `$ref` 没有悬空；这不是完整 OpenAPI 标准符合性校验。

Codex 未通过的一项：独立风险文档没有记录团队学习成本、生态成熟度或社区风险。人工复核还发现两处自评不一致：终审表将 Phase 10.5 标成 OK，但开放项 ODR-007 仍等待实际合并或手工等价证据；38 行检查表的实际分布为 32 项 OK-L1、3 项 OK-L2、3 项 OPEN-L3，而模型摘要将 OK-L1 写成 33。上述问题说明模型自评仍需要独立复核。

## 静态检查与评分器

- `scripts/verify.sh` 通过，只证明其覆盖的文件和标记检查。
- 新增 `scripts/evaluate.py`，可执行原有 `evals.json` 的检查类型；空 glob、缺少哈希基线、未知类型和越界软链接不会通过；需求编号按不同编号计数。
- 评分器的 8 项单元测试通过，包含正例和反例。它们验证评分器，不代表 skill 的 54 个断言全部通过。
- 原有 4 个完整场景共 54 个断言。本次仅对 Rust/Tauri 产物执行对应场景的 7 个断言；其余阶段性测试使用上述范围人工核对。

复跑入口（从仓库根目录）：

```sh
bash "skills/morrow-architecture-design/scripts/verify.sh"
python3 -B -m unittest discover -s "skills/morrow-architecture-design/scripts" -p "test_evaluate.py" -v
python3 "skills/morrow-architecture-design/scripts/evaluate.py" \
  --project "<隔离产物目录>" --case 3 --output "<评分结果.json>"
```

## 发现的脚本问题

6 个确定性探针中 2 个符合预期，4 个失败。当前保留原脚本行为，未将这次脱敏和评测扩展为自动合并器重写。

| 探针 | 预期 | 实测 |
|---|---|---|
| 仅含 Java 启动类 | 退出 0 | 退出 0，通过 |
| 普通目录下的 `@RestController` | 退出 1 | 退出 1，通过 |
| 带空格目录下的 `@RestController` | 退出 1 | 退出 0，漏检 |
| 同一文件含 `@Configuration` 和 `@RestController` | 退出 1 | 退出 0，漏检 |
| API delta 新增 `/v1/items` | 合并后存在新接口 | 退出 0，但 OpenAPI 没有新增接口 |
| delta 声明 breaking，OpenAPI 主版本未升级 | 中止检查 | 退出 0，版本未变 |

### 业务代码漏检

位置：`scripts/check-no-business-shell.sh` 的 `scan_java`。`for dir in $(find ...)` 会拆分包含空格的目录；后续 `grep -L` 又会把混合配置与业务注解的文件整体排除。

复现：在临时项目创建 `server with space/src/main/java/Example.java`，内容为 `@RestController class Example {}`，运行检查脚本。另一个探针在普通目录的同一个 Java 文件同时写入 `@Configuration`、`@RestController`。两者当前均错误返回 0。

影响：脚本 PASS 不能作为“没有预生成业务代码”的充分证据。后续应采用保留路径边界的遍历，并按业务注解判断，而非根据同文件配置注解整体豁免。

### 合并结果与成功信号不一致

位置：`scripts/merge-version.sh` 的 API 分支，以及 `SKILL.md` Phase 10.5。脚本只增加更新时间和历史记录，明确要求模型手工合并 paths/schemas；发现 breaking 也只是提示手工升级。

复现：准备 `ai-docs/apis/openapi.yaml`，含 `openapi: 3.1.0`、`info.version: 1.0.0`、`paths: {}`；准备 `ai-docs/apis/versions/v0.1.0/delta.md`，含 `## 新增`、`## 修改`、`## 删除` 三段。分别在新增段填写 `/v1/items`、在修改段填写 `breaking: 新增必填 header`，从产物根目录运行 `bash "<skill>/scripts/merge-version.sh" v0.1.0 --api`。两次均返回 0，而 paths/版本保持不变。

影响：与主技能要求的结构化合并和“主版本未升级即中止”不一致。后续需要明确脚本只是辅助步骤，并为真实合并结果增加独立检查，或实现结构化合并与版本门禁；不能仅凭退出码推进终审。

## 证据与限制

原始无头事件日志、临时产物及含本机路径的运行记录保留在本地临时目录，未加入仓库。仓库仅保留这份脱敏报告和可复用评分器。6 次运行均未改动各自的原始输入文件；冻结 skill 的文件哈希也均未改变。

这次没有真实构建、PoC、性能测试、外部接口验证或生产审签；也没有验证全局自动触发。临时项目入口可加载，与每次对话都会执行所有 skill 是不同的结论。
