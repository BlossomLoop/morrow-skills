#!/usr/bin/env node
// run-track-cases.mjs —— 跑 hook-track-delivery.mjs 的回归用例
//
// 每个用例用独立的临时状态目录，喂一次 payload，读回状态文件比对计数。
// 用例存在 JSON 里而非命令行：用例字符串含 npm publish / git commit 等，
// 写在命令行会被 PreToolUse hook 自己拦住（实测教训）。

import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = join(__dirname, '..', 'scripts', 'hook-track-delivery.mjs');
const CASES = join(__dirname, 'track-cases.json');

const data = JSON.parse(readFileSync(CASES, 'utf8'));

let pass = 0, fail = 0;
const failures = [];

for (const group of data.cases) {
  const want = group.expect;
  const wantDesc = Object.entries(want).map(([k, v]) => `${k}${v === 0 ? '=0' : '≥' + v}`).join(' ');
  console.log(`\n${group.group}  （期望 ${wantDesc}）`);

  for (const c of group.cases) {
    // 每个用例独立状态目录，互不污染
    const stateDir = mkdtempSync(join(tmpdir(), 'mg-track-'));
    const sessionId = 'T1';

    const payload = JSON.stringify({
      session_id: sessionId,
      tool_name: c.tool || 'Bash',
      tool_input: { command: c.cmd },
    });

    const r = spawnSync('node', [HOOK], {
      input: payload,
      encoding: 'utf8',
      env: { ...process.env, MORROW_GUARD_STATE_DIR: stateDir },
    });

    const stateFile = join(stateDir, `${sessionId}.json`);
    let state = { delivery: [], selfcheck: [], writes: [] };
    if (existsSync(stateFile)) {
      try { state = JSON.parse(readFileSync(stateFile, 'utf8')); } catch { /* 保持默认 */ }
    }

    const got = {
      delivery: (state.delivery || []).length,
      selfcheck: (state.selfcheck || []).length,
    };

    // 期望语义：0 表示必须为 0；正数表示至少这么多
    const ok = Object.entries(want).every(([k, v]) =>
      v === 0 ? got[k] === 0 : got[k] >= v);

    if (ok) {
      console.log(`  ✓ ${c.name}`);
      pass++;
    } else {
      const detail = Object.keys(want).map(k => `${k}: 期望${want[k] === 0 ? '=0' : '≥' + want[k]} 实得 ${got[k]}`).join('，');
      console.log(`  ✗ ${c.name} —— ${detail}`);
      fail++;
      failures.push({ name: c.name, cmd: c.cmd, want, got, exit: r.status });
    }

    rmSync(stateDir, { recursive: true, force: true });
  }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`通过 ${pass} / ${pass + fail}`);

if (fail > 0) {
  console.log('\n失败明细：');
  for (const f of failures) {
    console.log(`  ${f.name}`);
    console.log(`    cmd: ${JSON.stringify(f.cmd)}`);
    console.log(`    got: delivery=${f.got.delivery} selfcheck=${f.got.selfcheck} (exit ${f.exit})`);
  }
  process.exit(1);
}
