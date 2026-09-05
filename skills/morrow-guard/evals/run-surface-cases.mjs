#!/usr/bin/env node
// run-surface-cases.mjs
// 回归 Stop hook 的「测试面 vs 改动面」校验。
//
// 存在理由：78 模块事故的机制是「改资产 + 跑 npm test + 宣布完成」——
// npm test 因 tsconfig.exclude 碰不到资产目录，却被记为有效验证。
// 独立评审实测复现了这个缺口（当时仍放行），本文件锁住修复。
//
// 每条用例都必须明确期望 exit code：0 放行 / 2 打回。
// 只测「打回」不测「放行」会让判据过严的回归悄悄溜过。

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts');
const TRACK = join(SCRIPTS, 'hook-track-delivery.mjs');
const STOP = join(SCRIPTS, 'hook-stop-selfcheck.mjs');

const CASES = [
  {
    name: '改资产 + 只跑 npm test → 打回（78 模块事故机制）',
    writes: ['example-infra/skills/test/skills/a/SKILL.md', 'example-infra/skills/test/skills/b/SKILL.md'],
    cmds: ['npm test', 'git commit -m "feat: 迁移完成"'],
    expect: 2,
  },
  {
    name: '改 template 资产 + tsc → 打回',
    writes: ['template/.claude/settings.json'],
    cmds: ['tsc --noEmit', 'git commit -m x'],
    expect: 2,
  },
  {
    name: '改源码 + npm test → 放行（不误伤正常开发）',
    writes: ['core/registry.ts', 'cli.ts'],
    cmds: ['npm test', 'git commit -m fix'],
    expect: 0,
  },
  {
    name: '资产目录下的 .ts 源码 + npm test → 放行（源码假定在测试面内）',
    writes: ['example-infra/skills/x/scripts/helper.ts'],
    cmds: ['npm test', 'git commit -m x'],
    expect: 0,
  },
  {
    name: '改资产 + npm pack --dry-run → 放行（针对性证据）',
    writes: ['example-infra/skills/x/SKILL.md'],
    cmds: ['npm pack --dry-run', 'git commit -m x'],
    expect: 0,
  },
  {
    name: '改资产 + 双向闭环检查 → 放行',
    writes: ['registry/skills.yaml'],
    cmds: ['comm -23 want.txt got.txt', 'git commit -m x'],
    expect: 0,
  },
  {
    name: '改资产 + 专项校验脚本 → 放行',
    writes: ['example-infra/agents/x/AGENT.md'],
    cmds: ['node scripts/check-registry.mjs', 'git commit -m x'],
    expect: 0,
  },
  {
    name: '改资产但无交付物动作 → 放行（没宣布完成）',
    writes: ['example-infra/skills/x/SKILL.md'],
    cmds: ['npm test'],
    expect: 0,
  },
  {
    name: '零验证 + 提交 → 打回（原有行为不能回退）',
    writes: [],
    cmds: ['git commit -m x'],
    expect: 2,
  },
];

const stateDir = mkdtempSync(join(tmpdir(), 'mg-surface-'));
const env = { ...process.env, MORROW_GUARD_STATE_DIR: stateDir };
const stateFile = join(stateDir, 'S.json');

function feed(payload) {
  execFileSync('node', [TRACK], { input: JSON.stringify(payload), env, encoding: 'utf8' });
}

function runStop() {
  try {
    execFileSync('node', [STOP], {
      input: JSON.stringify({ session_id: 'S' }), env, encoding: 'utf8', stdio: 'pipe',
    });
    return 0;
  } catch (e) {
    return e.status ?? -1;
  }
}

let pass = 0;
const failures = [];

for (const c of CASES) {
  if (existsSync(stateFile)) unlinkSync(stateFile);
  for (const p of c.writes) {
    feed({ session_id: 'S', tool_name: 'Write', tool_input: { file_path: `/repo/${p}` } });
  }
  for (const cmd of c.cmds) {
    feed({ session_id: 'S', tool_name: 'Bash', tool_input: { command: cmd } });
  }
  const got = runStop();
  if (got === c.expect) {
    console.log(`  ✓ ${c.name}`);
    pass++;
  } else {
    console.log(`  ✗ ${c.name}`);
    console.log(`      期望 exit=${c.expect}，实得 exit=${got}`);
    failures.push(c.name);
  }
}

rmSync(stateDir, { recursive: true, force: true });

console.log('\n' + '─'.repeat(60));
console.log(`通过 ${pass} / ${CASES.length}`);
if (failures.length) {
  console.log('\n失败用例:');
  failures.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
}
