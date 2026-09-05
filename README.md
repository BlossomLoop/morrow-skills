# morrow-skills

个人维护的 Agent Skills，供 Claude Code 和 Codex 使用。

| Skill | 用途 |
| --- | --- |
| [morrow-guard](skills/morrow-guard/SKILL.md) | 编码任务的检查、失败复盘和经验记录 |
| [morrow-style](skills/morrow-style/SKILL.md) | 中文写作、改写与个人风格检查 |
| [morrow-style-tuner](skills/morrow-style-tuner/SKILL.md) | 更新 morrow-style 的写作规则 |

## 本地使用

真实文件保存在本仓库的 `skills/` 中，通过目录软链接接入工具：

| 工具 | 全局入口 |
| --- | --- |
| Claude Code | `~/.claude/skills/<skill-name>` |
| Codex | `~/.agents/skills/<skill-name>` |

每个入口链接到本仓库对应的 `skills/<skill-name>`。已有同名目录时，先核对并备份，避免覆盖。克隆到其他电脑后，需要重新建立软链接。

Skill 按任务内容或显式指令调用，不会在每次对话中全部执行。修改规则后，建议在新会话中验证。

`morrow-style-tuner` 当前通过 `~/.claude/skills/morrow-style` 定位目标，因此只使用 Codex 时也需要保留这个链接。tuner 中部分扫描说明仍使用旧的 grep 表述，当前第一条扫描实际位于 `skills/morrow-style/scripts/scan_style.py`。

`morrow-guard` 的 Hook 需要单独安装；仓库中的安装脚本面向 Claude Code，不代表 Codex 已具备相同的强制拦截行为。安装前可从该 skill 目录运行 `node scripts/install-hook.mjs --dry-run` 查看配置变更。

## 验证

在仓库根目录运行已有的风格扫描回归测试：

```sh
python3 -B -m unittest discover -s "skills/morrow-style/scripts" -p "test_scan_style.py" -v
```

## 文件范围

运行日志、Python 缓存和隔离区文件不纳入版本管理。历史案例中的真实项目、仓库路径和提交标识已替换为示例值；原始坏样本未包含在本仓库中。
