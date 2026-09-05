#!/usr/bin/env python3
"""执行 evals.json 的产物检查；不把结构匹配解释为架构语义正确。"""

import argparse
import hashlib
import json
import re
from pathlib import Path


def expand_braces(pattern):
    match = re.search(r'\{([^{}]+)\}', pattern)
    if not match:
        return [pattern]
    return [expanded for option in match.group(1).split(',')
            for expanded in expand_braces(pattern[:match.start()] + option + pattern[match.end():])]


def check_assertion(spec, project, baseline=None):
    root = Path(project).resolve()

    def resolve(name):
        path = (root / name).resolve()
        if path != root and root not in path.parents:
            raise ValueError('路径超出项目范围')
        return path

    def matches(pattern):
        groups = []
        for expanded in expand_braces(pattern):
            if Path(expanded).is_absolute() or '..' in Path(expanded).parts:
                raise ValueError('glob 超出项目范围')
            group = sorted({resolve(str(p.relative_to(root))) for p in root.glob(expanded)})
            groups.append(group)
        return groups

    try:
        kind = spec['check']
        if kind == 'file_exists':
            passed = resolve(spec['path']).is_file()
        elif kind == 'files_exist':
            passed = bool(spec['paths']) and all(resolve(p).exists() for p in spec['paths'])
        elif kind == 'files_not_exist_any':
            passed = bool(spec['paths']) and all(not resolve(p).exists() for p in spec['paths'])
        elif kind == 'files_unchanged':
            if not baseline:
                return False, '缺少运行前哈希基线'
            passed = bool(spec['paths']) and all(
                p in baseline and resolve(p).is_file()
                and hashlib.sha256(resolve(p).read_bytes()).hexdigest() == baseline[p]
                for p in spec['paths'])
        elif kind in ('file_contains', 'file_contains_all', 'file_contains_any', 'file_count_matches'):
            text = resolve(spec['path']).read_text()
            if kind == 'file_count_matches':
                count = len({m.group(0) for m in re.finditer(spec['pattern'], text, re.MULTILINE)})
                return count >= spec['min'], '不同匹配值数量：' + str(count)
            patterns = [spec['pattern']] if kind == 'file_contains' else spec['patterns']
            found = [bool(re.search(p, text, re.MULTILINE)) for p in patterns]
            passed = bool(found) and (any(found) if kind == 'file_contains_any' else all(found))
        elif kind == 'glob_exists':
            passed = bool(spec['globs']) and all(all(matches(p)) for p in spec['globs'])
        elif kind in ('glob_all_contain', 'glob_count_min', 'glob_any_name_matches'):
            groups = matches(spec['glob'])
            paths = sorted({p for group in groups for p in group})
            if not groups or not all(groups):
                return False, '至少一个 glob 分支没有匹配文件'
            if kind == 'glob_count_min':
                passed = len(paths) >= spec['min']
            elif kind == 'glob_any_name_matches':
                passed = any(re.search(pattern, p.name) for p in paths for pattern in spec['patterns'])
            else:
                passed = bool(spec['patterns']) and all(
                    p.is_file() and all(re.search(pattern, p.read_text(), re.MULTILINE)
                                        for pattern in spec['patterns']) for p in paths)
        else:
            return False, '未知检查类型：' + kind
        return bool(passed), '满足检查' if passed else '文件、模式或基线不满足要求'
    except (KeyError, OSError, ValueError, TypeError, re.error) as error:
        return False, type(error).__name__ + ': ' + str(error)


def grade_case(case, project, baseline=None):
    results = []
    for spec in case['assertions']:
        passed, detail = check_assertion(spec, project, baseline)
        results.append({'name': spec['name'], 'check': spec['check'], 'passed': passed, 'detail': detail})
    return {'case': case['name'], 'passed': bool(results) and all(r['passed'] for r in results),
            'passing': sum(r['passed'] for r in results), 'total': len(results), 'results': results}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', type=Path, required=True)
    parser.add_argument('--case', required=True, help='eval 名称或数字 id')
    parser.add_argument('--baseline', type=Path, help='运行前的相对路径到 SHA-256 字符串映射')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if not args.project.is_dir():
        parser.error('项目目录不存在')
    config = json.loads((Path(__file__).resolve().parent.parent / 'evals/evals.json').read_text())
    case = next((case for case in config['evals'] if args.case in (case['name'], str(case['id']))), None)
    if case is None:
        parser.error('未知 eval')
    baseline = json.loads(args.baseline.read_text()) if args.baseline else None
    report = grade_case(case, args.project, baseline)
    text = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(text + '\n')
    print(text)
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
