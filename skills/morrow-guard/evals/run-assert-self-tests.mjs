#!/usr/bin/env node
// run-assert-self-tests.mjs
// 对每条评分正则跑「必须命中 / 必须不命中」样本，失败的打印出来并以 exit 1 退出。
// grade.mjs 在正式评分前调用这个——评分器本身先被验证。

// 唯一来源：assert-defs.mjs。不再维护单独的 assert-self-tests.mjs。
import { REFUSE, ALT, CMD, A } from './assert-defs.mjs';

const ASSERT_SELF_TESTS = [REFUSE, ALT, CMD, ...Object.values(A)];

let pass = 0, fail = 0;
const failures = [];

for (const spec of ASSERT_SELF_TESTS) {
  for (const text of spec.mustMatch || []) {
    if (spec.re.test(text)) {
      pass++;
    } else {
      fail++;
      failures.push({ kind: 'mustMatch', id: spec.id, label: spec.label, text });
    }
  }
  for (const text of spec.mustNotMatch || []) {
    if (!spec.re.test(text)) {
      pass++;
    } else {
      fail++;
      failures.push({ kind: 'mustNotMatch', id: spec.id, label: spec.label, text });
    }
  }
}

if (fail > 0) {
  console.error(`\n✗ 评分断言自测失败 ${fail} / ${pass + fail}`);
  console.error('  以下正则在已知样本上表现错误，请修正后再跑评分：\n');
  for (const f of failures) {
    const mark = f.kind === 'mustMatch' ? '未命中（应命中）' : '误命中（应不命中）';
    console.error(`  [${f.id}] ${f.label}`);
    console.error(`    ${mark}: ${JSON.stringify(f.text)}`);
  }
  console.error('');
  process.exit(1);
}

console.log(`✓ 评分断言自测通过 ${pass} 个样本`);
