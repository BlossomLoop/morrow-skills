#!/usr/bin/env python3
"""Regression tests for scan_style.py."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scan_style import scan_path


class ScanStyleTests(unittest.TestCase):
    def scan(self, text: str) -> list[tuple[int, str, str]]:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample.md"
            path.write_text(text, encoding="utf-8")
            return scan_path(path)

    def test_detects_false_contrast_variants(self) -> None:
        text = "\n".join(
            (
                "问题不在于速度，而在于交接。",
                "关键不在于模型，而在于输入。",
                "真正要检查的不是提交数量，而是候选身份。",
                "与其说模型失败，不如说材料不完整。",
                "这不仅仅是代码问题，而是交付问题。",
            )
        )
        findings = self.scan(text)
        self.assertEqual(5, len(findings))
        self.assertTrue(all("FALSE-CONTRAST" in item[1] for item in findings))

    def test_allows_direct_technical_statements(self) -> None:
        self.assertEqual(
            [],
            self.scan("不同检查回答不同问题。编译通过只覆盖工程检查。"),
        )

    def test_skips_fenced_code(self) -> None:
        text = "```text\n问题不在于速度，而在于交接。\n```\n普通正文。"
        self.assertEqual([], self.scan(text))

    def test_detects_existing_absolute_terms(self) -> None:
        findings = self.scan("这套方案用于赋能团队。")
        self.assertEqual("ABS-LEXICON", findings[0][1])


if __name__ == "__main__":
    unittest.main()
