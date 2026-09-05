#!/usr/bin/env node
// lesson-stats.mjs
// 教训命中统计与待复核清单

import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = join(__dirname, '..', 'lessons');

// 简单 YAML 解析器（仅支持本 schema 的子集，无外部依赖）
function parseSimpleYAML(text) {
  const obj = {};
  let currentKey = null;
  let currentNest = null;
  let currentList = null;

  text.split('\n').forEach(line => {
    // 跳过注释与空行
    if (line.trim().startsWith('#') || !line.trim()) return;

    // 顶层键（无缩进）
    if (/^[a-z_]+:/.test(line) && !line.startsWith(' ')) {
      const match = line.match(/^([a-z_]+):\s*(.*)$/);
      currentKey = match[1];
      const value = match[2];

      if (value) {
        obj[currentKey] = isNaN(value) ? value : parseInt(value, 10);
      } else {
        obj[currentKey] = {};
        currentNest = obj[currentKey];
      }
      currentList = null;
      return;
    }

    // 二级键（2 空格缩进）
    if (/^  [a-z_]+:/.test(line) && currentNest) {
      const match = line.match(/^  ([a-z_]+):\s*(.*)$/);
      const key = match[1];
      const value = match[2];

      if (value) {
        currentNest[key] = isNaN(value) ? value : parseInt(value, 10);
      } else {
        currentNest[key] = {};
      }
      currentList = null;
      return;
    }

    // 列表项
    if (/^  - /.test(line)) {
      if (!currentList) {
        currentList = [];
        if (currentNest) {
          const lastKey = Object.keys(currentNest).pop();
          currentNest[lastKey] = currentList;
        }
      }
      currentList.push(line.replace(/^  - /, '').trim());
    }
  });

  return obj;
}

// lesson 的必需字段。缺任一即视为结构损坏，不计入统计。
const REQUIRED = ['id', 'slug', 'status', 'title', 'category', 'severity',
                  'source', 'problem', 'solution', 'reusable', 'evolution'];

// 不该出现在 lesson 文件里的内容特征。
// 实测教训：一个 361 行的 markdown 工作流文档（含未闭合的工具调用标记）
// 被误写成 .yaml，本脚本照样报告「共 9 条」而不报错——
// 因为解析器只找 slug: 不校验结构。宽松解析让损坏数据静默通过。
const CONTAMINATION = [
  { pattern: /<function_calls>|<invoke name=|<parameter name=/, desc: '工具调用标记' },
  { pattern: /^#\s+\S/m, desc: 'markdown 标题（lesson 应为纯 YAML）' },
];

function loadAllLessons() {
  const broken = [];
  let lessons = [];

  try {
    const files = readdirSync(LESSONS_DIR).filter(f => f.endsWith('.yaml'));

    for (const f of files) {
      const content = readFileSync(join(LESSONS_DIR, f), 'utf8');

      const contam = CONTAMINATION.find(c => c.pattern.test(content));
      if (contam) {
        broken.push({ file: f, reason: `含${contam.desc}` });
        continue;
      }

      const parsed = parseSimpleYAML(content);
      const missing = REQUIRED.filter(k => !(k in parsed));
      if (missing.length) {
        broken.push({ file: f, reason: `缺字段: ${missing.join(', ')}` });
        continue;
      }

      lessons.push(parsed);
    }
  } catch {
    return { lessons: [], broken: [] };
  }

  return { lessons, broken };
}

function daysSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function main() {
  const args = process.argv.slice(2);
  const showNeedsReview = args.includes('--needs-review');
  const showAll = args.includes('--all');

  const { lessons, broken } = loadAllLessons();

  // 损坏文件必须显式报出，不能静默跳过——静默跳过等于「统计通过但数据是坏的」
  if (broken.length) {
    console.log(`\n⚠️  ${broken.length} 个文件结构损坏，已排除在统计外：`);
    broken.forEach(b => console.log(`  ✗ ${b.file} — ${b.reason}`));
    console.log('  修好或移出 lessons/ 目录后重跑。');
  }

  if (lessons.length === 0) {
    console.log('\n📭 无有效教训（lessons/ 为空或全部损坏）');
    return;
  }

  console.log(`\n📊 教训统计（共 ${lessons.length} 条有效）\n`);

  // 按状态分组
  const byStatus = {
    active: lessons.filter(l => l.status === 'active'),
    archived: lessons.filter(l => l.status === 'archived'),
    'needs-review': lessons.filter(l => l.status === 'needs-review'),
  };

  console.log('状态分布:');
  console.log(`  active:        ${byStatus.active.length} 条`);
  console.log(`  archived:      ${byStatus.archived.length} 条`);
  console.log(`  needs-review:  ${byStatus['needs-review'].length} 条`);

  // 按强度分组
  console.log('\n强度分布:');
  const byStrength = {};
  lessons.forEach(l => {
    const strength = l.solution?.strength || 'unknown';
    byStrength[strength] = (byStrength[strength] || 0) + 1;
  });
  Object.entries(byStrength).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
    console.log(`  ${s}: ${c} 条`);
  });

  // 命中次数统计
  console.log('\n命中次数:');
  const totalHits = lessons.reduce((sum, l) => sum + (l.evolution?.hits || 0), 0);
  console.log(`  总命中: ${totalHits} 次`);

  const topHit = lessons
    .filter(l => l.evolution?.hits > 0)
    .sort((a, b) => (b.evolution?.hits || 0) - (a.evolution?.hits || 0))
    .slice(0, 5);

  if (topHit.length > 0) {
    console.log('  高频 Top 5:');
    topHit.forEach(l => {
      console.log(`    ${l.evolution.hits}× ${l.title} (${l.slug})`);
    });
  }

  const neverHit = lessons.filter(l => (l.evolution?.hits || 0) === 0);
  console.log(`  从未命中: ${neverHit.length} 条`);

  // 误报/漏报
  const withIssues = lessons.filter(l =>
    (l.evolution?.false_positives || 0) > 0 ||
    (l.evolution?.false_negatives || 0) > 0
  );

  if (withIssues.length > 0) {
    console.log('\n⚠️  断言质量问题:');
    withIssues.forEach(l => {
      const fp = l.evolution?.false_positives || 0;
      const fn = l.evolution?.false_negatives || 0;
      console.log(`  ${l.slug}: 误报 ${fp} 次, 漏报 ${fn} 次`);
    });
  }

  // needs-review 详情
  if (showNeedsReview || byStatus['needs-review'].length > 0) {
    console.log('\n🔍 待复核教训:');

    const autoMarked = lessons.filter(l => {
      const hits = l.evolution?.hits || 0;
      const age = daysSince(l.created);
      return hits === 0 && age > 90 && l.status !== 'needs-review';
    });

    if (autoMarked.length > 0) {
      console.log(`\n  ${autoMarked.length} 条符合自动标记条件（创建 90 天未命中）:`);
      autoMarked.forEach(l => {
        console.log(`    ${l.slug} (${daysSince(l.created)} 天前创建)`);
      });
    }

    if (byStatus['needs-review'].length > 0) {
      console.log(`\n  ${byStatus['needs-review'].length} 条已标记 needs-review:`);
      byStatus['needs-review'].forEach(l => {
        const reason = l.review_reason || '(无原因记录)';
        console.log(`    ${l.slug}: ${reason}`);
      });
    }

    if (autoMarked.length === 0 && byStatus['needs-review'].length === 0) {
      console.log('  (无)');
    }
  }

  // 归档候选
  console.log('\n📦 归档候选（已上 L4 门禁且经过验证）:');
  const archivable = byStatus.active.filter(l =>
    l.solution?.strength === 'L4' &&
    (l.evolution?.hits || 0) > 3 &&
    (l.evolution?.false_positives || 0) === 0
  );

  if (archivable.length > 0) {
    archivable.forEach(l => {
      console.log(`  ${l.slug} (命中 ${l.evolution.hits} 次, 无误报)`);
    });
  } else {
    console.log('  (无)');
  }

  // 全量列表
  if (showAll) {
    console.log('\n📋 全量教训清单:\n');
    lessons.forEach(l => {
      const hits = l.evolution?.hits || 0;
      const strength = l.solution?.strength || '?';
      const verified = l.solution?.verified_with_fixture ? '✓' : '✗';
      console.log(`[${l.status}] ${l.slug}`);
      console.log(`  ${l.title}`);
      console.log(`  强度: ${strength} | 反验: ${verified} | 命中: ${hits}×`);
      if (l.evolution?.last_hit) {
        console.log(`  最近命中: ${l.evolution.last_hit.slice(0, 10)}`);
      }
      console.log('');
    });
  }

  console.log('\n用法:');
  console.log('  node scripts/lesson-stats.mjs --needs-review  # 查看待复核清单');
  console.log('  node scripts/lesson-stats.mjs --all          # 显示全量教训');
}

main();
