#!/usr/bin/env node
// hook-stop-selfcheck.mjs
// Stop hook：本轮有交付物动作但没有验证痕迹时，打回要求先做环节 5 自查。
//
// 契约：从 stdin 读 JSON payload。
//   exit 0 → 放行（正常结束）
//   exit 2 → 打回，stderr 内容作为反馈返回给 AI，AI 在同一轮继续работа
//
// 拦截条件（两者同时满足）：
//   1. 本轮有交付物动作（git commit / npm publish / 大批文件写入）
//   2. 本轮没有环节 5 痕迹（没跑测试、没验制品、没查闭环）
//
// 上限：单轮最多打回 1 次，避免死循环。

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = process.env.MORROW_GUARD_STATE_DIR
  || join(tmpdir(), 'morrow-guard');
const AUDIT_LOG = join(__dirname, '..', 'audit.log');

// 大批文件写入的阈值：超过这个数量视为交付物级变更
const BULK_WRITE_THRESHOLD = 10;

function readPayload() {
  try {
    const raw = readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function audit(line) {
  try {
    mkdirSync(dirname(AUDIT_LOG), { recursive: true });
    appendFileSync(AUDIT_LOG, `${new Date().toISOString()} | ${line}\n`);
  } catch {
    // 审计失败不影响主逻辑
  }
}

// 常见被 tsconfig.exclude / testPathIgnorePatterns 排除的资产目录段。
// 这些目录里的文件通常是「随包分发的资产」而非「被编译测试的源码」——
// 改它们而只跑 npm test，就是 78 模块事故里那个假证据的形状。
//
// 判据故意保守：只认明确的资产目录段，宁可漏报也不能让正常改源码被打回。
// 这是启发式，不读真实 tsconfig（hook 里做不到可靠解析，且 monorepo 有多份配置）。
const ASSET_DIR_SEGMENTS = [
  'skills', 'agents', 'template', 'templates', 'registry',
  'assets', 'fixtures', 'resources', 'static', 'public',
  'prompts', 'configs', 'docs',
];

// 源码扩展名：这些文件即便在资产目录里，也可能真被测试覆盖，不计入。
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|rb|java|kt)$/i;

function isLikelyOutsideTestSurface(p) {
  if (typeof p !== 'string' || !p) return false;
  const norm = p.replace(/\\/g, '/');
  if (SOURCE_EXT.test(norm)) return false;          // 源码 → 假定在测试面内
  const segs = norm.split('/').filter(Boolean);
  return segs.some(s => ASSET_DIR_SEGMENTS.includes(s.toLowerCase()));
}

function resetTurn(stateFile, state) {
  // 一轮结束，清空本轮累积，turn 计数 +1
  const next = {
    turn: (state.turn || 0) + 1,
    delivery: [],
    writes: [],
    selfcheck: [],
    blockedThisTurn: false,
  };
  writeFileSync(stateFile, JSON.stringify(next, null, 2));
}

function main() {
  // 全局绕过
  if (process.env.MORROW_GUARD_BYPASS === '1') {
    process.exit(0);
  }

  const payload = readPayload();
  const sessionId = payload.session_id || 'unknown-session';
  const stateFile = join(STATE_DIR, `${sessionId}.json`);

  if (!existsSync(stateFile)) {
    process.exit(0); // 无状态 = 本轮没动过工具
  }

  let state;
  try {
    state = JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    process.exit(0);
  }

  // 上限：本轮已打回过一次，直接放行
  if (state.blockedThisTurn) {
    audit(`ALLOW | session=${sessionId} | reason=already-blocked-once-this-turn`);
    resetTurn(stateFile, state);
    process.exit(0);
  }

  const delivery = state.delivery || [];
  const writes = state.writes || [];
  const selfcheck = state.selfcheck || [];

  const bulkWrite = writes.length > BULK_WRITE_THRESHOLD;
  const hasDelivery = delivery.length > 0 || bulkWrite;

  // 条件 1 不满足：本轮没有交付物动作，放行
  if (!hasDelivery) {
    resetTurn(stateFile, state);
    process.exit(0);
  }

  // 条件 2：有验证痕迹 → 但要先检查这些痕迹是否「对得上被改的东西」。
  //
  // 实测缺口（独立评审复现，也是 78 模块事故的原始机制）：
  //   改 3 个 example-infra/ 资产 + 跑 `npm test` + git commit → 放行
  // 而 tsconfig.exclude 排除了 example-infra，npm test 根本碰不到那些文件。
  // 「75/75 通过」当年就是这么产生的假证据，修完前几轮它依然能骗过门禁。
  //
  // 所以 test-run 只是「必要不充分」：当本轮改动全部落在测试排除区时，
  // 单靠通用测试运行器不构成证据，需要针对性验证（制品检查/闭环检查/专项脚本）。
  if (selfcheck.length > 0) {
    const kinds = new Set(selfcheck.map(s => s.kind));
    const onlyGenericTest = [...kinds].every(k => k === 'test-run' || k === 'typecheck');
    const offTestSurface = writes.filter(isLikelyOutsideTestSurface);

    if (!(onlyGenericTest && offTestSurface.length > 0)) {
      audit(`ALLOW | session=${sessionId} | delivery=${delivery.length} | selfcheck=${[...kinds].join(',')}`);
      resetTurn(stateFile, state);
      process.exit(0);
    }

    // 落到这里：只跑了通用测试，但改的是测试面之外的资产 → 打回并说明理由
    state.blockedThisTurn = true;
    writeFileSync(stateFile, JSON.stringify(state, null, 2));
    audit(`BLOCK | session=${sessionId} | reason=test-surface-mismatch | off=${offTestSurface.length}`);
    process.stderr.write(
      `[morrow-guard] 本轮只跑了通用测试（${[...kinds].join('、')}），` +
      `但改动的 ${offTestSurface.length} 个文件很可能在测试面之外：\n` +
      offTestSurface.slice(0, 5).map(p => `  ${p}`).join('\n') +
      (offTestSurface.length > 5 ? `\n  ...还有 ${offTestSurface.length - 5} 个` : '') +
      `\n\n这正是「测试全绿但没测到改动」的形状——78 模块事故里「75/75 通过」就是这么来的。\n` +
      `先确认 tsconfig.exclude / testPathIgnorePatterns 是否排除了上述路径。\n\n` +
      `需要针对性证据，例如：\n` +
      `  npm pack --dry-run          # 确认文件真进了交付物\n` +
      `  comm -23 期望.txt 实际.txt   # 双向闭环\n` +
      `  <专项校验脚本>               # 覆盖被改目录\n\n` +
      `确认测试面其实覆盖了，或本条不适用，说明理由后继续。\n`
    );
    process.exit(2);
  }

  // 两个条件都满足 → 打回
  const deliveryDesc = delivery.length > 0
    ? [...new Set(delivery.map(d => d.kind))].join('、')
    : `批量写入 ${writes.length} 个文件`;

  state.blockedThisTurn = true;
  writeFileSync(stateFile, JSON.stringify(state, null, 2));

  audit(`BLOCK | session=${sessionId} | delivery=${deliveryDesc} | selfcheck=none`);

  process.stderr.write(`[morrow-guard] 本轮有交付物动作（${deliveryDesc}），但没有检测到任何验证动作。

结束前先做环节 5 自查，逐条给出结论，不要只说「已完成」：

1. 双向闭环 — 注册表→文件 且 文件→注册表，两个方向都查了吗？
2. 计数一致 — 声称数 == 实际数？有没有靠改阈值让检查变绿？
3. 测试对象正确 — 跑的测试确实覆盖了这次改动的代码路径吗（查 exclude 配置）？
4. 基线可信 — 用来对比的基线没被本次操作改写吗？
5. 评审终局 — 有独立评审/子 agent 的否决结论被你自己推翻吗？
6. 反向验证 — 断言在 known-bad 上确实会失败吗？不会红的断言等于没写。

任一条不通过就不能宣布完成——那说明还没完成，不是检查太严。
发现问题时改系统，不要改检查。

详细检查项：${join(__dirname, '..', 'references', 'phase-gates.md')}
本轮不会再次打回；确实不适用请说明理由后继续。
`);

  process.exit(2);
}

try {
  main();
} catch (err) {
  // hook 自身出错绝不能卡住会话
  process.exit(0);
}
