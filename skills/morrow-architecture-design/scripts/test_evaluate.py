"""防止架构产物评分因空输入、重复编号或错误基线而误通过。"""

import hashlib
import tempfile
import unittest
from pathlib import Path

from evaluate import check_assertion


class EvaluationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        return path

    def check(self, spec, baseline=None):
        return check_assertion(spec, self.root, baseline)[0]

    def test_empty_glob_never_passes_all_contain(self):
        self.assertFalse(self.check({'check': 'glob_all_contain', 'glob': 'adr/*.md', 'patterns': ['需求']}))

    def test_brace_glob_requires_each_branch(self):
        spec = {'check': 'glob_all_contain', 'glob': '{architecture,apis}/delta.md', 'patterns': ['新增', '修改', '删除']}
        self.write('architecture/delta.md', '新增 修改 删除')
        self.assertFalse(self.check(spec))
        self.write('apis/delta.md', '新增 修改 删除')
        self.assertTrue(self.check(spec))
        self.write('apis/delta.md', '新增')
        self.assertFalse(self.check(spec))

    def test_repeated_requirement_id_cannot_inflate_count(self):
        spec = {'check': 'file_count_matches', 'path': 'requirements.md', 'pattern': r'US-\d{3}', 'min': 3}
        self.write('requirements.md', 'US-001 US-001 US-001')
        self.assertFalse(self.check(spec))
        self.write('requirements.md', 'US-001 US-002 US-003')
        self.assertTrue(self.check(spec))

    def test_unchanged_requires_baseline_and_detects_changes(self):
        path = self.write('pom.xml', '<project/>')
        spec = {'check': 'files_unchanged', 'paths': ['pom.xml']}
        self.assertFalse(self.check(spec))
        baseline = {'pom.xml': hashlib.sha256(path.read_bytes()).hexdigest()}
        self.assertTrue(self.check(spec, baseline))
        path.write_text('<project>changed</project>')
        self.assertFalse(self.check(spec, baseline))
        path.unlink()
        self.assertFalse(self.check(spec, baseline))

    def test_missing_file_and_unknown_check_fail(self):
        self.assertFalse(self.check({'check': 'file_contains', 'path': 'missing.md', 'pattern': '.*'}))
        self.assertFalse(self.check({'check': 'unknown'}))

    def test_symlink_cannot_escape_project(self):
        with tempfile.TemporaryDirectory() as directory:
            other = Path(directory) / 'outside.md'
            other.write_text('PASS')
            (self.root / 'linked.md').symlink_to(other)
            self.assertFalse(self.check({'check': 'file_contains', 'path': 'linked.md', 'pattern': 'PASS'}))

    def test_files_not_exist_checks_every_path(self):
        spec = {'check': 'files_not_exist_any', 'paths': ['pom.xml', 'build.gradle']}
        self.assertTrue(self.check(spec))
        self.write('build.gradle', '')
        self.assertFalse(self.check(spec))

    def test_remaining_contract_types(self):
        self.write('adr/ADR-001-python.md', '关联需求 US-001\n涉及宪法条款 P-001\nRust Tauri')
        specs = [
            {'check': 'file_exists', 'path': 'adr/ADR-001-python.md'},
            {'check': 'files_exist', 'paths': ['adr', 'adr/ADR-001-python.md']},
            {'check': 'file_contains', 'path': 'adr/ADR-001-python.md', 'pattern': r'US-\d{3}'},
            {'check': 'file_contains_all', 'path': 'adr/ADR-001-python.md', 'patterns': ['Rust', 'Tauri']},
            {'check': 'file_contains_any', 'path': 'adr/ADR-001-python.md', 'patterns': ['absent', 'Tauri']},
            {'check': 'glob_exists', 'globs': ['adr/*.md']},
            {'check': 'glob_count_min', 'glob': 'adr/*.md', 'min': 1},
            {'check': 'glob_any_name_matches', 'glob': 'adr/*.md', 'patterns': ['python', 'fastapi']},
        ]
        for spec in specs:
            with self.subTest(check=spec['check']):
                self.assertTrue(self.check(spec))
        self.assertFalse(self.check({'check': 'glob_exists', 'globs': ['adr/*.md', 'missing/*.md']}))
        self.assertFalse(self.check({'check': 'glob_count_min', 'glob': 'adr/*.md', 'min': 2}))


if __name__ == '__main__':
    unittest.main()
