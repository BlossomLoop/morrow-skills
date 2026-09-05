#!/usr/bin/env node
// hook-track-delivery.mjs
// PostToolUse hook：记录本轮的「交付物动作」，供 Stop hook 判断是否需要强制自查。
//
// 契约：从 stdin 读 JSON payload，写会话级状态文件，始终 exit 0（绝不阻断工具调用）。
// payload 关键字段：session_id, tool_name, tool_input
//
// 状态文件：<state-dir>/<session_id>.json
// {
//   turn: 12,                        // Stop hook 每次结束后 +1
//   delivery: [                      // 本轮的交付物动作
//     {tool:"Bash", kind:"git-commit", detail:"git commit -m ..."}
//   ],
//   writes: ["path/a.ts", ...],      // 本轮 Write/Edit 触及的文件（去重）
//   selfcheck: [],                   // 本轮的环节 5 痕迹
//   blockedThisTurn: false           // 本轮是否已打回过（上限 1 次）
// }

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stripDataSections } from './lib-strip-data.mjs';

const STATE_DIR = process.env.MORROW_GUARD_STATE_DIR
  || join(tmpdir(), 'morrow-guard');

// ── 交付物动作模式 ──
// 这些是「对外产生后果」的动作，出错代价高，值得在结束前强制自查。
const DELIVERY_PATTERNS = [
  { kind: 'git-commit', regex: /\bgit\s+(-[^\s]+\s+)*commit\b/ },
  { kind: 'git-push', regex: /\bgit\s+(-[^\s]+\s+)*push\b/ },
  { kind: 'git-merge', regex: /\bgit\s+(-[^\s]+\s+)*merge\b/ },
  { kind: 'git-tag', regex: /\bgit\s+tag\b/ },
  { kind: 'npm-publish', regex: /\bnpm\s+publish\b/ },
  { kind: 'npm-pack', regex: /\bnpm\s+pack\b/ },
  { kind: 'docker-push', regex: /\bdocker\s+push\b/ },
  { kind: 'branch-move', regex: /\bgit\s+branch\s+-[fMD]\b/ },
  { kind: 'reset-hard', regex: /\bgit\s+reset\s+--hard\b/ },
];

// ── 环节 5 痕迹 ──
// 命中任一即视为本轮做过验证工作，Stop hook 不再打回。
// 判据故意宽松：目的是拦住「完全没验证就宣布完成」，不是强制走完整流程。
//
// 实测漏判教训：原先只认 `npm test` / `pytest` 这类「长得像测试」的命令名，
// 结果 `node grade.mjs`、`node run-assert-self-tests.mjs`、`node run-hook-cases.mjs`
// 全部漏判——真的在跑验证，却被判成零验证痕迹。
// 这是 proxy 指标失效：用「命令名像不像测试」代替「是否真在验证」。
// 现在改为按语义识别：脚本名含 test/eval/grade/assert/check/verify/gate/lint 均计入。
const SELFCHECK_PATTERNS = [
  { kind: 'read-phase-gates', regex: /morrow-guard\/references\/phase-gates/ },
  { kind: 'read-assertion-patterns', regex: /morrow-guard\/references\/assertion-patterns/ },
  // 制品验证：npm pack / git archive，配合解包或 --dry-run。
  //
  // 实测 bug（既有，非本轮引入）：原正则是
  //   /\b(git\s+archive|npm\s+pack)\b[\s\S]*\b(tar\s+[tx]|--dry-run)\b/
  // `\b--` 永远匹配不上（`-` 是非单词字符，词边界不在那里），
  // 所以 `npm pack --dry-run` 和 `npm pack && tar tzf x.tgz` 全部漏判——
  // 最标准的制品验证手段一直不算证据。
  { kind: 'artifact-verify', regex: /\b(git\s+archive|npm\s+pack|docker\s+(build|save))\b/ },
  { kind: 'artifact-inspect', regex: /--dry-run\b|\bnpm\s+publish\s+--dry-run\b/ },
  { kind: 'tar-inspect', regex: /\btar\s+t[zjf]*\b/ },
  { kind: 'closure-check', regex: /\bcomm\s+-(23|13)\b/ },
  { kind: 'guard-script', regex: /morrow-guard\/scripts\/(verify|check)-/ },
  // 常规测试运行器
  { kind: 'test-run', regex: /\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b|\bnpx\s+(vitest|jest|mocha|ava)\b|\bpytest\b|\bgo\s+test\b|\bcargo\s+test\b|\bunittest\b/ },
  // 验证/评分/门禁类脚本：按语义关键字识别，不限定前缀位置。
  // 关键词列表是启发式的，必然有缺口——补充过 case/smoke/e2e/regress
  // （`run-hook-cases.mjs` 曾因不含任何关键词而漏判）。
  // 缺口的代价可控：Stop hook 只在「有交付物动作 且 零验证痕迹」时才打回，
  // 漏判一个模式只会在窄场景下产生一次噪音，说明理由即可继续。
  { kind: 'verify-script', regex: /\b[\w.-]*(test|spec|eval|grade|assert|check|verify|gate|audit|lint|case|smoke|e2e|regress)[\w.-]*\.(mjs|cjs|js|ts|sh|bash|py)\b/i },
  // 显式跑 self-test / 回归。
  // 必须出现在「可执行位置」——命令开头或 && / ; / | 之后，
  // 且前面是 node/bash/sh/npm/make 这类执行动词。
  //
  // 实测后门（独立评审复现）：原先是纯文本匹配 /(self-?test|回归|自测)/，
  // 于是 `echo 自测完成` 就被记为验证痕迹，一句 echo 关掉整个门禁。
  // 这是我上一轮修漏判时开的洞——与 marker-pollutes-own-detection 同形，第二次发作。
  {
    kind: 'self-test',
    regex: /(?:^|&&|;|\|)\s*(?:node|bash|sh|npm|pnpm|yarn|bun|make|python3?)\s+[^\s;&|]*(self-?test|regression|回归|自测)/i,
  },
  // 类型/编译校验
  { kind: 'typecheck', regex: /\b(tsc\s+--noEmit|mypy|ruff|eslint|flake8)\b/ },
];

function readPayload() {
  try {
    const raw = readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadState(file) {
  if (!existsSync(file)) {
    return { turn: 0, delivery: [], writes: [], selfcheck: [], blockedThisTurn: false };
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return { turn: 0, delivery: [], writes: [], selfcheck: [], blockedThisTurn: false };
  }
}

function main() {
  const payload = readPayload();
  const sessionId = payload.session_id || 'unknown-session';
  const toolName = payload.tool_name || '';
  const toolInput = payload.tool_input || {};

  mkdirSync(STATE_DIR, { recursive: true });
  const stateFile = join(STATE_DIR, `${sessionId}.json`);
  const state = loadState(stateFile);

  if (toolName === 'Bash') {
    const raw = String(toolInput.command || '');
    // 只看会被执行的部分：heredoc 正文与整行注释是数据，不是命令。
    // 实测误报：写入文件的自测样本 '先别 npm publish' 被记成真的 npm publish。
    const command = stripDataSections(raw);

    for (const p of DELIVERY_PATTERNS) {
      if (p.regex.test(command)) {
        state.delivery.push({
          tool: 'Bash',
          kind: p.kind,
          detail: command.slice(0, 200),
          at: new Date().toISOString(),
        });
        break; // 一条命令只记一次，取最先匹配的类型
      }
    }

    for (const p of SELFCHECK_PATTERNS) {
      if (p.regex.test(command)) {
        state.selfcheck.push({ kind: p.kind, at: new Date().toISOString() });
        break;
      }
    }
  }

  if (toolName === 'Read') {
    const path = String(toolInput.file_path || '');
    for (const p of SELFCHECK_PATTERNS) {
      if (p.regex.test(path)) {
        state.selfcheck.push({ kind: p.kind, at: new Date().toISOString() });
        break;
      }
    }
  }

  if (toolName === 'Write' || toolName === 'Edit' || toolName === 'NotebookEdit') {
    const path = String(toolInput.file_path || toolInput.notebook_path || '');
    if (path && !state.writes.includes(path)) {
      state.writes.push(path);
    }
  }

  writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

try {
  main();
} catch {
  // 追踪失败绝不能影响正常工具调用
}
process.exit(0);
