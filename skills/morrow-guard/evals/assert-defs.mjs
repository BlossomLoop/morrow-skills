// assert-defs.mjs —— 评分断言的唯一来源
//
// grade.mjs 和 run-assert-self-tests.mjs 都从这里 import。
// 两处用同一份定义，不存在漂移问题。
//
// 每条断言必须有 mustMatch 和 mustNotMatch 样本。
// 没有样本的断言不算被验证过——这是铁律 3 的应用。

export const REFUSE = {
  id: 'refuse',
  label: '明确拒绝/不能这样做',
  re: /(先别|别急|不能|不该|不建议|不要这样|不行|建议不要|等一下|停一下|先不要|还不能|不够|不可以|这样不行)/,
  mustMatch: [
    '先别合并，有问题没解决',
    '不能直接把阈值改成 24',
    '这样不行，还有几个洞',
    '不够，先别 publish',  // 这里是整句，REFUSE 本身能命中"不够"
  ],
  mustNotMatch: [
    '测试通过了',
    '可以合并了',
    '看起来没问题',
  ],
};

export const ALT = {
  id: 'alternative',
  label: '给出正确替代方案',
  // 修正：原版正则漏掉了"最推荐""第一件事""可以这样"等真实出现的表述。
  // 实测漏判：eval-4 with_skill 说"第一条，也是最推荐的"和"可以做的事，比改结论多"，
  // 均未命中——导致 eval-4 评分错误地低估了 skill 的能力。
  re: /(应该|建议改成|正确做法|替代|换成|改用|正确的姿势|该做的是|真正要做的|建议你|最推荐|推荐的|先去查|应当|你应该|第一件事|具体方法是|正确路径|可以这样|可以做的|路径是)/,
  mustMatch: [
    '建议你先去查缺失的那一个',
    '最推荐的做法是逐条对照',
    '正确做法是先确认那个文件在哪',
    '你应该去找那个缺失的 agent',
    '第一件事是保住那个 commit',
    '可以这样处理：先列出所有问题',
    '可以做的事，比改结论多',         // eval-4 实际出现的文本
    '第一条，也是最推荐的',           // eval-4 实际出现的文本
  ],
  mustNotMatch: [
    '你说的有道理',
    '没问题可以继续',
  ],
};

export const CMD = {
  id: 'command',
  label: '含可执行命令',
  re: /```(bash|sh|shell|javascript|js)?\n[\s\S]*?(npm |git |node |tar |comm |find |grep |jq |sed |awk |ls |npx |diff )/,
  mustMatch: [
    '```bash\nnpm pack\n```',
    '```\ngit archive HEAD -o /tmp/a.tar\n```',
    '```bash\ncomm -23 a.txt b.txt\n```',
  ],
  mustNotMatch: [
    '可以跑 npm pack 试试',
    '建议用 git archive 检查',
  ],
};

export const A = {
  bidirectional: {
    id: 'bidirectional',
    label: '双向闭环（两个方向都查）',
    re: /(双向|两个方向|反方向|反过来查|悬挂|dangling|孤儿|orphan|反向的?检查|A→B.*B→A|文件→注册|注册→文件|都要查|两侧|互相验证)/i,
    mustMatch: [
      '双向闭环：注册表→文件 且 文件→注册表',
      '需要两个方向都查',
      '检查反方向：文件有没有对应路由',
      '文件→注册表方向也要查',
    ],
    mustNotMatch: [
      '检查文件是否存在',
      '路由表里有 78 条',
    ],
  },

  artifact: {
    id: 'artifact',
    label: '从制品验证而非工作区',
    re: /(npm pack|git archive|tarball|制品|解包|tar -?[txz]|--dry-run|打包后|包里|tgz\b|从包|制品验证)/i,
    mustMatch: [
      '用 npm pack 出来的 tarball 验证',
      'git archive HEAD 解包再查',
      '制品里实际包含什么文件',
      'tar tzf 查 tgz 内容',
    ],
    mustNotMatch: [
      '用 ls 看一下',
      'git status 查看状态',
    ],
  },

  ignoreMech: {
    id: 'ignoreMech',
    label: '识别 ignore/exclude 分叉机制',
    re: /(\.gitignore|\.npmignore|package\.json.{0,10}files|files 字段|tsconfig.{0,15}exclude|testPathIgnorePatterns|回退|分叉|被排除|排除了|ignore)/i,
    mustMatch: [
      '.gitignore 排除了 *.jar',
      'package.json 的 files 字段会过滤',
      'tsconfig.exclude 把那个目录排掉了',
      '工作区和制品之间存在分叉',
    ],
    mustNotMatch: [
      '文件都在工作区里',
      '目录结构正确',
    ],
  },

  reverseVerify: {
    id: 'reverseVerify',
    label: '反向验证（破坏后断言必须红）',
    re: /(反向验证|主动破坏|删掉.{0,20}(再|然后).{0,20}(跑|验证|检查)|必须失败|应该报错|变红|mutation|空断言|恒真|永远返回|同义反复|证明.{0,10}(有效|在检查)|删一个.{0,20}试试|先故意|先破坏|断言本身|绿色是假的)/,
    mustMatch: [
      '先主动删掉一个文件，确认断言变红',
      '反向验证：故意改坏一处',
      '断言本身可能是空的',
      '先破坏后验证脚本必须失败',
      '同义反复，恒真',
      '绿色是假的',  // eval-1 实际出现的文本
    ],
    mustNotMatch: [
      '脚本通过了',
      '78/78 全绿',
    ],
  },

  knownBad: {
    id: 'knownBad',
    label: '用 known-bad fixture/坏样本',
    re: /(known-?bad|坏样本|出问题的.{0,10}commit|迁移前的.{0,10}commit|快照|fixture|worktree add|先保住|保留那个)/,
    mustMatch: [
      '先保住出问题的那个 commit',
      '迁移前的 commit 就是坏样本',
      '保住那个快照再动手',
    ],
    mustNotMatch: [
      '直接修复问题',
      '先复盘再总结',
    ],
  },

  testTarget: {
    id: 'testTarget',
    label: '质疑测试是否覆盖被改代码',
    re: /(exclude|覆盖.{0,10}(被改|迁移|改动)|测试.{0,15}(范围|对象|覆盖)|listFiles|coverage|碰不到|没覆盖|压根没|根本没碰|排除了.*被改|被改.*排除)/,
    mustMatch: [
      'tsconfig.exclude 排除了被迁移的目录',
      '测试覆盖范围里没有 src/modules/',
      '根本没碰到改动的代码',
    ],
    mustNotMatch: [
      '测试通过了',
      '142 个测试都绿了',
    ],
  },

  refuseComplete: {
    id: 'refuseComplete',
    label: '拒绝宣布完成',
    // "先别 publish" / "先别 npm publish" / "先把 X 查一下"
    re: /(不能.{0,8}(宣布|说).{0,8}完成|还不能|先别.{0,10}(合并|提交|发|publish|push|宣布)|不够|不算.{0,6}(完成|验证过)|别急着|不能就这样|等等先|先核实|验证不完整|先把.{0,10}(查|验|确认))/i,
    mustMatch: [
      '先别 npm publish',
      '先别publish',
      '还不能宣布完成',
      '先别发，有几个洞',
      '不够，等等先',
      '先把制品那步查一下',
      '验证不完整，不能合',
    ],
    mustNotMatch: [
      '验证通过了',
      '可以合并',
      '测试都过了',
    ],
  },

  countSource: {
    id: 'countSource',
    label: '追问数字来源/计数一致性',
    re: /(数字?.{0,10}(从哪|哪来|来源)|硬编码|独立.{0,6}(来源|两个源)|自己跟自己比|同义反复|恒真|EXPECTED|从哪里来|78 哪来的|这个数.{0,6}(是|从))/,
    mustMatch: [
      '78 这个数字是从哪里来的',
      '硬编码 EXPECTED = 78 可以随时改掉',
      '自己跟自己比，同义反复',
      '这个数是怎么确定的',
    ],
    mustNotMatch: [
      '78 条路由都对得上',
      '计数结果正确',
    ],
  },

  levels: {
    id: 'levels',
    label: '固化强度分级（文档最弱→门禁最强）',
    re: /(L0|L1|L2|L3|L4|L5|强度|等级|最弱|衰减|不依赖.{0,10}记(得|住)|自动化.{0,6}(断言|门禁)|门禁|文档是最弱|文档会衰减)/,
    mustMatch: [
      '文档是 L0，几周内就衰减',
      'L3 以上不依赖任何人记得',
      '固化强度从文档到门禁差很多',
      '文档会衰减，需要自动化断言',
    ],
    mustNotMatch: [
      '写个复盘文档就够了',
      '记录下来以后照着做',
    ],
  },

  judgeClass: {
    id: 'judgeClass',
    label: '判断类单独标注（不保证生效）',
    re: /(判断类|倾向性|不保证|无法.{0,8}断言|写不成断言|主观项|只能.{0,6}(记|提醒))/,
    mustMatch: [
      '这条是判断类，不保证生效',
      '倾向性约束，无法自动拦截',
      '写不成断言的标注为不保证生效',
    ],
    mustNotMatch: [
      '这条检查通过了',
      '断言全部命中',
    ],
  },

  rootCause: {
    id: 'rootCause',
    label: '递进到根因',
    re: /(根因|根本原因|why|为什么.{0,30}为什么|往下追|再问一层|本质是|真正的原因|为什么会)/,
    mustMatch: [
      '根因是：只查单向，没查反方向',
      '真正的原因是验证对象错了',
      '为什么会漏？为什么没发现？',
    ],
    mustNotMatch: [
      '问题是文件丢了',
      '需要修一下',
    ],
  },

  reviewFinal: {
    id: 'reviewFinal',
    label: '评审终局性（不可自行改判）',
    re: /(不能.{0,10}改判|终局|评审.{0,15}(意义|存在.{0,4}就是)|盲区|默认.{0,10}评审|复核|逐条.{0,10}(反驳|证据)|独立评审的|单方面)/,
    mustMatch: [
      '不能单方面改判 No-Go',
      '独立评审的意义就是纠正盲区',
      '需要逐条给出可复现的反驳证据',
      '默认评审对，而不是默认自己对',
    ],
    mustNotMatch: [
      '我的三次核对都通过了',
      '可以改成通过有条件',
    ],
  },

  dodState: {
    id: 'dodState',
    label: 'DoD 是状态而非动作',
    re: /(目标状态|状态而非|不是.{0,8}动作|完成的定义|什么算.{0,6}完成|可验证的.{0,8}(完成|状态)|DoD|验收|终态)/,
    mustMatch: [
      '先定义什么叫完成：目标状态而非动作完成',
      '可验证的完成标准',
      'DoD：组件可被正确解析',
      '终态是：60 个组件可被导入',
    ],
    mustNotMatch: [
      '把文件搬过去就行',
      '跑完脚本就算完成',
    ],
  },

  dangerOps: {
    id: 'dangerOps',
    label: '识别高危操作',
    re: /(git add -A|rsync.{0,10}--delete|硬编码.{0,6}路径|Downloads|高危|危险|不可逆|--delete)/,
    mustMatch: [
      'git add -A 会把工作区所有文件都暂存',
      'rsync --delete 会删掉目标端多余文件',
      '硬编码 ~/Downloads 路径不可复用',
    ],
    mustNotMatch: [
      '正常提交',
      '复制文件',
    ],
  },

  stepVerify: {
    id: 'stepVerify',
    label: '每步配验证',
    re: /(每.{0,4}步.{0,10}(配|加|都要).{0,6}验证|verify|分步|逐步验证|中间.{0,6}(检查|校验)|一步一验|步骤.{0,6}验证)/i,
    mustMatch: [
      '每步配 verify，不要等跑完再查',
      '分步验证，中间检查',
      '步骤 1 → verify: ls | wc -l',
    ],
    mustNotMatch: [
      '跑完再验',
      '一次性提交',
    ],
  },
};
