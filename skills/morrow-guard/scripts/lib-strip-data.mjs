// lib-strip-data.mjs —— 剥掉 shell 命令里的「数据段」，只留真正会被执行的部分
//
// 为什么单独成文件：hook-danger-ops.mjs 和 hook-track-delivery.mjs 都需要它。
// 之前只在 danger-ops 里实现，track 没有，导致 heredoc 正文里的字样被当成真命令
// ——同一个 bug 在姊妹文件里重现。共用一份是唯一可靠的做法。
//
// 剥离对象：
//   1. heredoc 正文（写入文件或给人看的文本，不是待执行命令）
//   2. 整行注释
//
// 实测教训（两次）：
//   - `cat > f <<'EOF'` 正文里有 `# 不要加 --delete`，被误判为要执行 rsync --delete
//   - `assert-defs.mjs` 的自测样本 `'先别 npm publish'` 被误判为真的 npm publish

// 占位符不能含 `<<`：否则它自己会被「未闭合 heredoc」规则再次识别，
// 把后续真实命令一并吞掉。实测漏洞：修误报时开了放行漏洞。
const PLACEHOLDER = ' /*heredoc-stripped*/ ';

export function stripDataSections(command) {
  let s = String(command || '');

  // 闭合的 heredoc：<<EOF / <<-EOF / <<'EOF' / <<"EOF" … 到独占一行的结束标记
  s = s.replace(
    /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[^\n]*\n([\s\S]*?)\n[ \t]*\2[ \t]*(?=\n|$)/g,
    PLACEHOLDER,
  );

  // 未闭合的 heredoc（命令被截断时）才剥到结尾。
  // 先确认确实没有结束标记，否则会误吞已闭合 heredoc 之后的真实命令。
  const open = s.match(/<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[^\n]*\n/);
  if (open) {
    const marker = open[2];
    const after = s.slice(open.index + open[0].length);
    const closed = new RegExp(`^[ \\t]*${marker}[ \\t]*$`, 'm').test(after);
    if (!closed) s = s.slice(0, open.index) + PLACEHOLDER;
  }

  // 整行注释（行首可有空白）。不动行尾注释，避免误伤含 # 的字符串
  s = s.replace(/^\s*#[^\n]*$/gm, '');

  return s;
}
