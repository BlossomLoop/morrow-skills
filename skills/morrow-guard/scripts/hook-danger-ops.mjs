#!/usr/bin/env node
// hook-danger-ops.mjs
// PreToolUse hook：高危命令执行前拦截。
//
// 契约：从 stdin 读 JSON payload。
//   exit 0 → 放行
//   exit 2 → 阻断，stderr 内容作为反馈返回给 AI
// payload 关键字段：tool_name, tool_input, cwd
//
// 用户选择的策略：全部高危命令都阻断（不是只提示、也不是只在脏工作区拦）。

import { readFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stripDataSections } from './lib-strip-data.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIT_LOG = join(__dirname, '..', 'audit.log');
const LOCAL_PATTERNS = join(__dirname, '..', 'local-danger-patterns.json');

const DANGER_PATTERNS = [
  {
    kind: 'git-reset-hard',
    regex: /\bgit\s+(-[^\s]+\s+)*reset\s+(--\S+\s+)*--hard\b/,
    risk: '丢弃未暂存修改；未追踪文件不受保护',
    lesson: '真实案例：脏工作区执行，3 个 PNG 永久丢失',
    inspect: 'git-status',
  },
  {
    kind: 'git-add-all',
    regex: /\bgit\s+add\s+(-A|--all|\.)(\s|$)/,
    risk: '把工作区所有未追踪文件一并暂存，可能卷入他人产物',
    lesson: '真实案例：一个 124 行的 AGENTS.md（他人文件）被卷入提交',
    inspect: 'git-status',
  },
  {
    kind: 'git-clean',
    regex: /\bgit\s+clean\s+(-\S*[fF]\S*)/,
    risk: '删除未追踪文件/目录，不可恢复',
    lesson: '未追踪 ≠ 不重要，可能是尚未提交的新工作',
    inspect: 'git-status',
  },
  {
    kind: 'git-branch-delete',
    regex: /\bgit\s+branch\s+(-D|--delete\s+--force|-d\s+-f)/,
    risk: '强制删除分支，即使未合并',
    lesson: '删除前确认该分支的提交在别处仍可达',
  },
  {
    kind: 'git-push-force',
    regex: /\bgit\s+push\b[^\n]*\s(--force|-f|--force-with-lease)\b/,
    risk: '改写远端历史，影响所有协作者',
    lesson: '协作分支上等同于删除他人提交',
  },
  {
    kind: 'rm-rf',
    regex: /\brm\s+(-\w*[rR]\w*f\w*|-\w*f\w*[rR]\w*)\s/,
    risk: '递归强制删除，不进回收站',
    lesson: '先 ls 确认目标，再删',
  },
  {
    kind: 'rsync-delete',
    regex: /\brsync\b[^\n]*--delete\b/,
    risk: '目标端多余文件被删除；方向写反会销毁源',
    lesson: '真实案例：--delete 改写了唯一可信基线，只剩 ZIP 可恢复',
  },
  {
    kind: 'hardcoded-path',
    regex: /(\/Users\/[^\/\s"']+\/|\/home\/[^\/\s"']+\/|[A-Z]:\\Users\\)/,
    risk: '硬编码用户绝对路径，脚本不可复用、易误操作他人目录',
    lesson: '改用变量或参数传入',
    softer: true, // 这一类只提醒，不阻断（否则日常 cd/ls 全被拦）
  },
];

function readPayload() {
  try {
    const raw = readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadLocalPatterns() {
  if (!existsSync(LOCAL_PATTERNS)) return [];
  try {
    const data = JSON.parse(readFileSync(LOCAL_PATTERNS, 'utf8'));
    return (data.patterns || []).map(p => ({
      kind: p.kind || 'custom',
      regex: new RegExp(p.regex),
      risk: p.risk || '用户自定义高危模式',
      lesson: p.example || '',
    }));
  } catch {
    return [];
  }
}

function gitStatus(cwd) {
  try {
    const out = execFileSync('git', ['status', '--porcelain'], {
      cwd, encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'],
    });
    const lines = out.split('\n').filter(Boolean);
    return {
      inRepo: true,
      clean: lines.length === 0,
      untracked: lines.filter(l => l.startsWith('??')).length,
      modified: lines.filter(l => !l.startsWith('??')).length,
    };
  } catch {
    return { inRepo: false };
  }
}

// 白名单：明确安全的场景自动放行，避免噪音淹没真实风险
function whitelist(kind, command, cwd) {
  if (kind === 'git-reset-hard' || kind === 'git-clean' || kind === 'git-add-all') {
    const st = gitStatus(cwd);
    if (!st.inRepo) return '不在 git 仓库内';
    if (st.clean) return '工作区干净，无数据丢失风险';
  }

  if (kind === 'rm-rf') {
    // 构建产物与临时目录
    if (/\b(node_modules|dist|build|target|\.next|\.cache|coverage|__pycache__)\b/.test(command)) {
      return '删除构建产物';
    }
    // 临时目录：路径字面量，或指向临时目录的变量。
    // 允许前置引号——原先要求 /tmp/ 前是空格，导致 rm -rf "/tmp/x" 被拦。
    if (/["'\s](\/tmp\/|\/var\/folders\/|\/private\/var\/folders\/)/.test(command)) {
      return '临时目录清理';
    }
    // mktemp -d 的结果通常存进变量再删。变量名无法解析实际值，
    // 因此只放行「变量名本身表明是临时目录」的窄形态。
    //
    // 实测误报（我自己被拦）：`rm -rf "$D"`（D=$(mktemp -d)）命中 rm-rf 被阻断。
    // 白名单不认变量形态，测试脚本每次都要 BYPASS——噪音会训练人无视告警。
    // 变量名本身表明是临时目录，允许后跟子路径（"$TMPDIR/x"）。
    // 子路径中不允许 .. —— 否则 "$TMPDIR/../../work" 会被放行。
    if (/\brm\s+-[rRf]*\s+["']?\$\{?(TMPDIR|TMP|TEMP|TMPD|[A-Z_]*TMP[A-Z0-9_]*|D|DIR|WORKDIR|STATE_DIR)\}?(\/[^\s"'`;&|]*)?["']?\s*$/.test(command)
        && !/\.\./.test(command)) {
      return '临时目录变量清理';
    }
  }

  if (kind === 'hardcoded-path') {
    // 只读命令带绝对路径无害
    if (/^\s*(cd|ls|cat|head|tail|find|grep|rg|wc|stat|file|test|diff|realpath)\b/.test(command)) {
      return '只读命令';
    }
  }

  return null;
}

function audit(line) {
  try {
    appendFileSync(AUDIT_LOG, `${new Date().toISOString()} | ${line}\n`);
  } catch { /* 审计失败不影响主逻辑 */ }
}

function main() {
  if (process.env.MORROW_GUARD_BYPASS === '1') {
    process.exit(0);
  }

  const payload = readPayload();
  const toolName = payload.tool_name || '';
  if (toolName !== 'Bash') process.exit(0);

  const toolInput = payload.tool_input || {};
  const command = String(toolInput.command || '');
  const cwd = payload.cwd || toolInput.cwd || process.cwd();

  if (!command) process.exit(0);

  // 只对「会被执行的部分」做匹配；heredoc 正文与整行注释属于数据，不是命令
  const executable = stripDataSections(command);

  const patterns = [...DANGER_PATTERNS, ...loadLocalPatterns()];

  for (const p of patterns) {
    if (!p.regex.test(executable)) continue;

    const wl = whitelist(p.kind, executable, cwd);
    if (wl) {
      audit(`ALLOW | ${p.kind} | ${wl} | ${command.slice(0, 100)}`);
      process.exit(0);
    }

    let ctx = `工作目录: ${cwd}`;
    if (p.inspect === 'git-status') {
      const st = gitStatus(cwd);
      if (st.inRepo) {
        ctx += `\n工作区: 已改动 ${st.modified} 个、未追踪 ${st.untracked} 个`;
        if (st.untracked > 0) {
          ctx += `\n⚠️  ${st.untracked} 个未追踪文件不在 git 保护范围内`;
        }
      }
    }

    if (p.softer) {
      // 提醒但不阻断
      audit(`WARN | ${p.kind} | ${command.slice(0, 100)}`);
      process.stderr.write(`[morrow-guard] 注意：${p.risk}\n${p.lesson}\n`);
      process.exit(0);
    }

    audit(`BLOCK | ${p.kind} | ${command.slice(0, 100)}`);
    process.stderr.write(`[morrow-guard] 高危操作已拦截

命令: ${command.slice(0, 200)}
类型: ${p.kind}
风险: ${p.risk}
${p.lesson}

${ctx}

继续前请：
1. 说明这个操作为什么必要
2. 确认丢失的内容在别处可恢复（备份/其他分支/远端）
3. 得到用户明确同意

确认后可用: MORROW_GUARD_BYPASS=1 <命令>
`);
    process.exit(2);
  }

  process.exit(0);
}

try {
  main();
} catch {
  process.exit(0); // hook 自身出错时放行，不卡住工作
}
