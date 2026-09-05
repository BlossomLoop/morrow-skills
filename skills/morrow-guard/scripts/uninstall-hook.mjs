#!/usr/bin/env node
// uninstall-hook.mjs
// 从 ~/.claude/settings.json 移除 morrow-guard 的所有 hook。
// 只删自己的条目，其他 hook 一律保留。

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SETTINGS = join(homedir(), '.claude', 'settings.json');

function main() {
  if (!existsSync(SETTINGS)) {
    console.error(`✗ 未找到 ${SETTINGS}`);
    process.exit(1);
  }

  const original = readFileSync(SETTINGS, 'utf8');
  let settings;
  try {
    settings = JSON.parse(original);
  } catch (err) {
    console.error(`✗ ${SETTINGS} 不是合法 JSON：${err.message}`);
    process.exit(1);
  }

  const hooks = settings.hooks || {};
  const removed = [];

  for (const [event, list] of Object.entries(hooks)) {
    if (!Array.isArray(list)) continue;

    for (let i = list.length - 1; i >= 0; i--) {
      const entry = list[i];
      let isOurs = false;

      // 正确格式：{ hooks: [{ command }] }
      if (Array.isArray(entry?.hooks)) {
        const before = entry.hooks.length;
        entry.hooks = entry.hooks.filter(h => !String(h?.command || '').includes('morrow-guard'));
        if (entry.hooks.length !== before) {
          removed.push(`${event}: ${before - entry.hooks.length} 个命令`);
        }
        if (entry.hooks.length === 0) isOurs = true;
      }

      // 旧版错误格式：{ enabled, source }
      if (entry?.source && String(entry.source).includes('morrow-guard')) {
        isOurs = true;
        removed.push(`${event}: 旧格式条目`);
      }

      if (isOurs) list.splice(i, 1);
    }

    if (list.length === 0) delete hooks[event];
  }

  if (removed.length === 0) {
    console.log('✓ 未发现 morrow-guard hook，无需改动');
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${SETTINGS}.bak-morrow-guard-uninstall-${stamp}`;
  writeFileSync(backup, original);
  writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n');

  console.log(`✓ 已备份 → ${backup}`);
  console.log('\n已移除：');
  removed.forEach(r => console.log(`  - ${r}`));
  console.log('\n重启会话后生效。');
}

main();
