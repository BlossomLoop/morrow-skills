#!/usr/bin/env node
// install-hook.mjs
// 安装 morrow-guard 的 L4 强制层到 ~/.claude/settings.json
//
// 装三个 hook：
//   PreToolUse   → hook-danger-ops.mjs      高危命令拦截
//   PostToolUse  → hook-track-delivery.mjs  记录交付物动作
//   Stop         → hook-stop-selfcheck.mjs  有交付物但无验证时打回
//
// 配置格式（Claude Code 契约）：
//   { matcher: "<ToolName|正则|空=全部>", hooks: [{ type: "command", command: "...", timeout: N }] }
// hook 是外部命令，从 stdin 读 JSON payload，用 exit code 表态（0 放行 / 2 阻断）。
//
// 安装是幂等的：重复运行不会产生重复条目。既有其他 hook 一律保留。

import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETTINGS = join(homedir(), '.claude', 'settings.json');

const SPECS = [
  {
    event: 'PreToolUse',
    matcher: 'Bash',
    script: 'hook-danger-ops.mjs',
    timeout: 10,
    desc: '高危命令拦截（git reset --hard / add -A / rm -rf / rsync --delete ...）',
  },
  {
    event: 'PostToolUse',
    matcher: '',
    script: 'hook-track-delivery.mjs',
    timeout: 10,
    desc: '记录交付物动作与验证痕迹',
  },
  {
    event: 'Stop',
    matcher: '',
    script: 'hook-stop-selfcheck.mjs',
    timeout: 15,
    desc: '有交付物动作但无验证时，打回要求环节 5 自查（单轮上限 1 次）',
  },
];

function cmdFor(script) {
  return `node "${join(__dirname, script)}"`;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!existsSync(SETTINGS)) {
    console.error(`✗ 未找到 ${SETTINGS}`);
    console.error('  请先运行一次 Claude Code 以生成配置文件');
    process.exit(1);
  }

  const original = readFileSync(SETTINGS, 'utf8');
  let settings;
  try {
    settings = JSON.parse(original);
  } catch (err) {
    console.error(`✗ ${SETTINGS} 不是合法 JSON：${err.message}`);
    console.error('  已中止，未做任何修改');
    process.exit(1);
  }

  settings.hooks ||= {};

  const added = [];
  const skipped = [];
  const removed = [];

  // 先全局清理历史遗留的错误格式条目（旧版 install-hook 写入的 {enabled, source}）。
  // 必须扫全部事件，不能只扫 SPECS 涉及的——旧版把条目写进了 PermissionRequest，
  // 而新版不再使用该事件，只扫 SPECS 会漏掉它。
  for (const [event, list] of Object.entries(settings.hooks)) {
    if (!Array.isArray(list)) continue;
    for (let i = list.length - 1; i >= 0; i--) {
      const entry = list[i];
      if (entry && entry.source && String(entry.source).includes('morrow-guard')) {
        list.splice(i, 1);
        removed.push(`${event}: 旧格式条目 {enabled, source}`);
      }
    }
  }

  for (const spec of SPECS) {
    const command = cmdFor(spec.script);
    settings.hooks[spec.event] ||= [];
    const list = settings.hooks[spec.event];

    // 幂等：已存在同 command 就跳过
    const exists = list.some(e =>
      Array.isArray(e?.hooks) && e.hooks.some(h => h?.command === command));

    if (exists) {
      skipped.push(`${spec.event} → ${spec.script}`);
      continue;
    }

    const entry = { hooks: [{ type: 'command', command, timeout: spec.timeout }] };
    if (spec.matcher) entry.matcher = spec.matcher;
    list.push(entry);
    added.push({ ...spec, command });
  }

  // 确保 hook 脚本可执行
  for (const spec of SPECS) {
    try {
      chmodSync(join(__dirname, spec.script), 0o755);
    } catch { /* 权限设置失败不阻断安装 */ }
  }

  if (dryRun) {
    console.log('=== dry-run：不写入任何文件 ===\n');
    console.log(JSON.stringify(settings.hooks, null, 2));
    return;
  }

  if (added.length === 0 && removed.length === 0) {
    console.log('✓ 已是最新，无需改动');
    skipped.forEach(s => console.log(`  已存在: ${s}`));
    return;
  }

  // 备份后写入
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${SETTINGS}.bak-morrow-guard-${stamp}`;
  writeFileSync(backup, original);

  writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n');

  console.log(`✓ 已备份原配置 → ${backup}`);

  if (removed.length) {
    console.log('\n清理的历史错误条目：');
    removed.forEach(r => console.log(`  - ${r}`));
    console.log('  （旧版写入的 {enabled, source} 格式不被 Claude Code 识别，从未生效）');
  }

  if (added.length) {
    console.log('\n已安装：');
    added.forEach(a => {
      console.log(`  ${a.event}${a.matcher ? ` [${a.matcher}]` : ''} → ${a.script}`);
      console.log(`    ${a.desc}`);
    });
  }

  if (skipped.length) {
    console.log('\n已存在（跳过）：');
    skipped.forEach(s => console.log(`  ${s}`));
  }

  console.log(`
生效需要重启会话（hook 配置在会话启动时读取）。

绕过：MORROW_GUARD_BYPASS=1 <命令>
卸载：node ${join(__dirname, 'uninstall-hook.mjs')}
审计：${join(__dirname, '..', 'audit.log')}`);
}

main();
