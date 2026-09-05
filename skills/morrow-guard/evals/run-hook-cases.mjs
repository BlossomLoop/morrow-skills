#!/usr/bin/env node
// run-hook-cases.mjs —— 跑 hook-cases.json 里的回归用例
// 用例存在文件里而不是命令行：用例字符串本身含危险命令，写在命令行会被 hook 自己拦住。

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = join(__dirname, '..', 'scripts', 'hook-danger-ops.mjs');
const CASES = join(__dirname, 'hook-cases.json');

const data = JSON.parse(readFileSync(CASES, 'utf8'));

let pass = 0, fail = 0;
const failures = [];

for (const group of data.cases) {
  console.log(`\n${group.group}  （期望 exit ${group.expect}）`);
  for (const c of group.cases) {
    const payload = JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command: c.cmd },
      cwd: '/tmp',
    });
    const r = spawnSync('node', [HOOK], {
      input: payload,
      encoding: 'utf8',
      env: { ...process.env, MORROW_GUARD_BYPASS: '' },
    });
    const got = r.status;
    if (got === group.expect) {
      console.log(`  ✓ ${c.name}`);
      pass++;
    } else {
      console.log(`  ✗ ${c.name} —— 期望 ${group.expect}，实得 ${got}`);
      fail++;
      failures.push({ name: c.name, expect: group.expect, got, cmd: c.cmd });
    }
  }
}

console.log(`\n${'─'.repeat(56)}`);
console.log(`通过 ${pass} / ${pass + fail}`);

if (fail > 0) {
  console.log('\n失败明细：');
  for (const f of failures) {
    console.log(`  ${f.name}`);
    console.log(`    cmd: ${JSON.stringify(f.cmd)}`);
  }
  process.exit(1);
}
