# 高危操作清单与拦截配置

## 用户选择的拦截策略

**全部高危命令都阻断**（不是只提示、也不是只在脏工作区拦）。

所有列在本文的命令，执行前都会被 `~/.claude/settings.json` 的 `PermissionRequest` hook 拦截，显示风险提示并要求明确确认。

## 高危命令清单

| 命令 | 风险 | 真实案例 |
|------|------|---------|
| `git reset --hard` | 丢失未追踪文件和未暂存修改 | 脏工作区执行，3 个 PNG 丢失 |
| `git add -A` | 把工作区所有未追踪文件提交，包括他人产物 | 一个 124 行的 `AGENTS.md` 被卷入 |
| `git clean -f` `-fd` `-fx` | 删除未追踪文件/目录 | 本地调试产物被清理 |
| `git branch -D` | 强制删除分支，即使未合并 | 删错分支后无法恢复 |
| `git push --force` `-f` | 改写远端历史，影响协作者 | 强推后他人无法 pull |
| `rm -rf` | 递归删除，不可逆 | `rm -rf /` 类经典灾难 |
| `rsync --delete` | 目标目录多余文件被删 | 唯一可信基线被改写 |
| 硬编码绝对路径 | 脚本不可复用、可能误操作 | `/Users/xxx/Downloads/` 依赖本机路径 |

## Hook 安装

运行 `scripts/install-hook.mjs` 安装 L4 拦截层。它会：

1. 读取 `~/.claude/settings.json` 现有配置
2. 合并（不覆盖）`PermissionRequest` hook
3. 备份原配置到 `~/.claude/settings.json.bak-morrow-guard-<timestamp>`

**卸载**：`scripts/uninstall-hook.mjs` 或手动恢复备份。

## 拦截规则

```javascript
// 注入到 ~/.claude/settings.json 的 hooks.PermissionRequest
{
  "hooks": {
    "PermissionRequest": [
      {
        "enabled": true,
        "source": "~/.claude/skills/morrow-guard/scripts/hook-danger-ops.mjs"
      }
    ]
  }
}
```

`hook-danger-ops.mjs` 检查 `Bash` tool 的 `command` 参数，匹配到高危模式时返回：

```javascript
{
  "action": "block",
  "message": `⚠️  高危操作: git reset --hard

风险: 丢失未追踪文件和未暂存修改
真实案例: 脏工作区执行导致 3 个 PNG 丢失

工作区状态:
  改动文件: 2 个
  未追踪文件: 5 个

确认要继续吗？输入 'yes' 明确确认。`,
  "requireExplicitApproval": true
}
```

## 绕过机制

某些情况下高危操作是必要的（如确认过备份的清理）。绕过方式：

**临时绕过**（本次命令）：
```bash
MORROW_GUARD_BYPASS=1 git reset --hard
```

**会话绕过**（当前终端）：
```bash
export MORROW_GUARD_BYPASS=1
# 后续命令都不拦截，直到关闭终端
```

绕过时 hook 仍会打印警告，但不阻断。

## 白名单场景

某些安全场景自动放行：

| 场景 | 检测条件 | 原因 |
|------|---------|------|
| `git reset --hard` 在干净工作区 | `git status --porcelain` 为空 | 无数据丢失风险 |
| `git clean` 在临时目录 | cwd 在 `/tmp` 或 `$TMPDIR` | 临时文件清理 |
| `rm -rf` 删除构建产物 | 路径匹配 `node_modules/` `dist/` `.cache/` | 常规清理 |

白名单规则见 `scripts/hook-danger-ops.mjs` 的 `isWhitelisted()` 函数。

## 扩展拦截规则

用户可扩展拦截清单：

```javascript
// ~/.claude/skills/morrow-guard/local-danger-patterns.json
{
  "patterns": [
    {
      "regex": "docker system prune -a",
      "risk": "删除所有未使用的镜像与容器",
      "example": "误删正在使用的镜像导致服务无法启动"
    }
  ]
}
```

`install-hook.mjs` 会合并用户自定义规则。

## 审计日志

所有被拦截的命令（无论放行还是阻断）记录到：

```
~/.claude/skills/morrow-guard/audit.log
```

格式：
```
2026-07-29T11:35:22Z | BLOCK | git reset --hard | cwd=/path/to/repo | dirty=true
2026-07-29T11:36:10Z | ALLOW | git reset --hard | cwd=/path/to/repo | dirty=false | bypass=true
```

用 `scripts/audit-report.mjs` 查看统计。

## 已知限制

1. **只拦截通过 Claude 执行的命令**，用户在终端手动跑的命令拦不住
2. **复杂命令可能绕过正则**：如 `sh -c 'rm -rf /tmp/xxx'` 嵌套在字符串里
3. **性能**：每个 Bash 调用都走 hook，大批量脚本会有延迟（约 10-50ms/次）

限制 1 是设计如此——本 skill 约束的是 AI coding 过程，不是替代系统级权限管理。限制 2 可通过改进正则缓解。限制 3 可通过 `MORROW_GUARD_BYPASS=1` 对性能敏感脚本临时绕过。
