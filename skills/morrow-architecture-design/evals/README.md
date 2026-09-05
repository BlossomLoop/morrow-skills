# morrow-architecture-design 评测说明

本目录用于维护该 skill 的评测口径，重点覆盖两类能力：

- 关键架构问题是否被真正想透
- 交互过程是否遵循强门禁流程

## 评测维度

- 输入诊断
- 问题定义与约束建模
- 架构驱动因素提炼
- 模式判定
- 候选方案比较
- 组件确认
- 技术栈确认
- 核心链路与数据设计
- 风险与演进设计
- ADR 输出
- 骨架生成
- 文档生成
- 降级策略

## 评测目录内容

- `manual-run-template.md`：手工跑评测时使用的模板
- `scorecard.md`：评分卡与评分维度权重

## 使用方式

1. 选一份 `examples/` 下的样例 PRD 作为输入
2. 按 skill SKILL.md 的 14 个 Phase 跑一轮架构设计
3. 使用 `manual-run-template.md` 记录过程
4. 使用 `scorecard.md` 按维度打分

跑完的评测记录属于产物而非 skill 资产，请放在 `workspace/iteration-N/` 下，不要回流到本目录。

## 产物检查执行器

`scripts/evaluate.py` 执行 `evals.json` 中的检查，不调用模型，也不生成待评分产物。需先在独立项目目录运行 skill，再对产物评分：

```sh
python3 scripts/evaluate.py --project /path/to/generated-project --case greenfield-unsupported-stack-fallback --output /path/to/result.json
```

Brownfield 的 `files_unchanged` 检查必须提供运行前基线。基线 JSON 为相对路径到 SHA-256 字符串的映射，至少覆盖 `pom.xml` 和 `admin-web/package.json`；应在调用模型前保存，不得在生成产物后重建：

```sh
python3 scripts/evaluate.py --project /path/to/generated-project --case brownfield-saas-extension --baseline /path/to/baseline.json
python3 -B -m unittest discover -s scripts -p test_evaluate.py -v
```

退出码 0 表示该场景的全部产物检查通过，1 表示存在失败，2 表示参数错误。空 glob、缺少基线、未知检查类型均不会通过。编号计数使用不同匹配值，重复引用同一个编号不会增加数量。

这些检查只覆盖路径、文本模式和原文件哈希。是否绕过用户确认、是否伪造 PoC、方案是否合适，需要结合无头运行轨迹与产物内容另行评审。仅运行到形态判断或澄清阶段的测试，不按完整场景的产物清单判通过。
