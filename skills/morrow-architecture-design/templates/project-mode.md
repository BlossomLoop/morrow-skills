# 项目形态判定（Project Mode）

> Phase 0.3 产出。用于把"这是全新项目还是已有项目"这件事**显式锁定**，让下游 Phase 0.5 / 4 / 5 / 6 / 10 按正确路径走。
> 本文件应 ≤ 30 行，只登记结论与证据，不写业务细节。

---

## 判定结果

- **mode**: `brownfield` | `greenfield`
- **confidence**: `high` | `medium` | `low`
- **判定时间**: {{date}}
- **扫描范围**: {{例如 "仓库根目录前 3 层"}}

## 命中信号

> 引用 `references/project-mode-detection.md §1` 的分级；每条必须带真实文件路径或目录路径。

### 强信号（任一命中 → brownfield）

- `{{path1}}`：{{简述命中原因，例如 "pom.xml 声明 spring-boot-starter-parent 2.7.x"}}
- `{{path2}}`：

### 弱信号（仅供辅证）

- `{{path}}`：

### 反信号（辅证 greenfield）

- `{{path或描述}}`：

## 推断栈（仅 brownfield 需填）

| 层 | 推断选型 | 来源文件 |
|----|----------|----------|
| 语言 |  |  |
| 主框架 |  |  |
| 构建工具 |  |  |

## 手动覆盖（如用户主动切换）

- **原手动覆盖前判定**：
- **用户切换为**：
- **理由**：
- **风险提示**：{{若将 brownfield 手动改为 greenfield，必须确认不会覆盖现有代码}}

## 下游触发

- [ ] Brownfield → 已触发 `baseline-architecture.md` 产出
- [ ] Greenfield → 进入 Phase 0.5 从零锁定宪法
- [ ] 混合项目 → 在 §命中信号 按模块粒度分别登记

## 未覆盖盲点

> 诚实列出"没扫到 / 读不懂"的地方，防止下游当 baseline 已完整。

-
