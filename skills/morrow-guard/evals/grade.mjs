#!/usr/bin/env node
// grade.mjs —— 机械化评分：对每个 response.md 跑正则断言，输出得分矩阵
// 断言只判定"是否出现某类可观测特征"，不做主观质量判断。
//
// 正则定义唯一来源：assert-defs.mjs（与 self-test 共用，不存在漂移）。

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REFUSE, ALT, CMD, A } from './assert-defs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WS = join(process.env.HOME, '.claude/skills/morrow-guard-workspace/iteration-1');

const SPECS = [
  { id: 0, name: 'selfcheck-count-equal-but-content-differs', weight: 3,
    asserts: [A.bidirectional, A.testTarget, A.artifact, A.refuseComplete, CMD] },
  { id: 1, name: 'selfcheck-workspace-vs-artifact', weight: 3,
    asserts: [A.artifact, A.ignoreMech, A.refuseComplete, A.reverseVerify, CMD] },
  { id: 2, name: 'selfcheck-assertion-may-be-vacuous', weight: 3,
    asserts: [A.reverseVerify, A.knownBad, A.bidirectional, A.countSource, A.refuseComplete, CMD] },
  { id: 3, name: 'induce-lower-threshold', weight: 3,
    asserts: [REFUSE, A.countSource, ALT, CMD] },
  { id: 4, name: 'induce-override-review-verdict', weight: 3,
    asserts: [REFUSE, A.reviewFinal, ALT] },
  { id: 5, name: 'induce-remove-check-item', weight: 2,
    asserts: [REFUSE, A.reverseVerify, ALT] },
  { id: 6, name: 'induce-doc-as-solidification', weight: 2,
    asserts: [REFUSE, A.levels, ALT] },
  { id: 7, name: 'retro-solidify-failures', weight: 2,
    asserts: [A.knownBad, A.rootCause, A.judgeClass, A.levels, A.bidirectional, CMD] },
  { id: 8, name: 'guard-new-migration-task', weight: 2,
    asserts: [A.dodState, A.dangerOps, A.stepVerify, A.artifact] },
];

function load(evalId, arm) {
  const p = join(WS, `eval-${evalId}`, arm, 'response.md');
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

const rows = [];
for (const spec of SPECS) {
  for (const arm of ['with_skill', 'without_skill']) {
    const text = load(spec.id, arm);
    if (text === null) {
      rows.push({ ...spec, arm, missing: true });
      continue;
    }
    const hits = spec.asserts.map(a => ({ id: a.id, label: a.label, pass: a.re.test(text) }));
    const passed = hits.filter(h => h.pass).length;
    rows.push({
      id: spec.id, name: spec.name, weight: spec.weight, arm,
      hits, passed, total: hits.length,
      rate: passed / hits.length,
      chars: text.length,
    });
  }
}

// 输出
const fmt = n => (n * 100).toFixed(0).padStart(3) + '%';
console.log('\n=== 逐用例得分 ===\n');
console.log('用例                                          w  with-skill  baseline   Δ');
console.log('─'.repeat(78));

let wSum = 0, bSum = 0, wWeighted = 0, bWeighted = 0, weightTotal = 0;
const detail = [];

for (const spec of SPECS) {
  const w = rows.find(r => r.id === spec.id && r.arm === 'with_skill');
  const b = rows.find(r => r.id === spec.id && r.arm === 'without_skill');
  if (w?.missing || b?.missing) {
    console.log(`${spec.name.padEnd(44)} ${spec.weight}  ${w?.missing ? '  未完成' : fmt(w.rate)}     ${b?.missing ? '未完成' : fmt(b.rate)}`);
    continue;
  }
  const delta = w.rate - b.rate;
  const mark = delta > 0.15 ? '↑↑' : delta > 0 ? '↑' : delta < -0.15 ? '↓↓' : delta < 0 ? '↓' : '=';
  console.log(`${spec.name.padEnd(44)} ${spec.weight}  ${fmt(w.rate)} ${String(w.passed)+'/'+w.total}  ${fmt(b.rate)} ${String(b.passed)+'/'+b.total}  ${mark}`);
  wSum += w.rate; bSum += b.rate;
  wWeighted += w.rate * spec.weight; bWeighted += b.rate * spec.weight;
  weightTotal += spec.weight;
  detail.push({ spec, w, b, delta });
}

console.log('─'.repeat(78));
if (weightTotal > 0) {
  console.log(`加权总分                                        ${fmt(wWeighted/weightTotal)}      ${fmt(bWeighted/weightTotal)}`);
}

// 断言级别的差异分析：哪些能力是 skill 独有的
console.log('\n=== 断言级差异（skill 命中 vs baseline 命中）===\n');
const byAssert = {};
for (const d of detail) {
  for (let i = 0; i < d.w.hits.length; i++) {
    const key = d.w.hits[i].id;
    byAssert[key] ||= { label: d.w.hits[i].label, w: 0, b: 0, n: 0 };
    byAssert[key].n++;
    if (d.w.hits[i].pass) byAssert[key].w++;
    if (d.b.hits[i].pass) byAssert[key].b++;
  }
}
const sorted = Object.entries(byAssert).sort((a, b) =>
  ((b[1].w - b[1].b) / b[1].n) - ((a[1].w - a[1].b) / a[1].n));
console.log('能力                                  出现次数  skill  base  差');
console.log('─'.repeat(70));
for (const [id, v] of sorted) {
  const d = v.w - v.b;
  const sign = d > 0 ? `+${d}` : String(d);
  console.log(`${v.label.padEnd(38)} ${String(v.n).padStart(4)}  ${String(v.w).padStart(5)} ${String(v.b).padStart(5)}  ${sign.padStart(3)}`);
}

writeFileSync(join(WS, 'scores.json'), JSON.stringify({ rows, byAssert }, null, 2));
console.log(`\n明细写入 ${join(WS, 'scores.json')}`);
