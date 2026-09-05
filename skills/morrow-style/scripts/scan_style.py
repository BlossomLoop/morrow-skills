#!/usr/bin/env python3
"""Scan Markdown prose for hard morrow-style violations."""

from __future__ import annotations

import re
import sys
from pathlib import Path


RULES = (
    (
        "ABS-LEXICON",
        re.compile(
            r"赋能|多维|全域|纵深|提质|增效|抓手|基石|内核|底色|范式|图景|"
            r"新赛道|破局|突围|深耕|聚力|焕新|价值重塑|底层逻辑|顶层设计|"
            r"生态布局|差异化优势|可持续路径|价值增量|资源整合|绘就.{0,4}蓝图|"
            r"注入.{0,6}动能|一体化体系|全链路闭环|高质量发展|双重价值|"
            r"由此可见|不难看出|总而言之|综上所述|浪潮之下|全新可能性|"
            r"全新内涵|相辅相成|相得益彰|为依托|为导向|不可否认|毋庸置疑|"
            r"此外|深入探讨|不容忽视|彰显|凸显|标志着|见证了|里程碑|新篇章|——"
        ),
    ),
    (
        "ABS-FALSE-CONTRAST-FOCUS",
        re.compile(
            r"(?:问题|关键|重点|核心|难点|目标)(?:并)?不在于"
            r"[^。！？\n]{1,120}(?:而在于|而是)"
        ),
    ),
    (
        "ABS-FALSE-CONTRAST-NOT-BUT",
        re.compile(
            r"(?:真正[^。！？\n]{0,24})?(?:不是|并非)"
            r"[^。！？\n]{1,120}(?:而是|反而是)"
        ),
    ),
    (
        "ABS-FALSE-CONTRAST-NOT-ONLY",
        re.compile(
            r"(?:不只是|不仅是|不仅仅是|不单是)"
            r"[^。！？\n]{1,120}(?:而是|还|更)"
        ),
    ),
    (
        "ABS-FALSE-CONTRAST-RATHER",
        re.compile(r"与其(?:说)?[^。！？\n]{1,120}不如(?:说)?"),
    ),
)

FENCE = re.compile(r"^\s*(`{3,}|~{3,})")


def scan_path(path: Path) -> list[tuple[int, str, str]]:
    findings: list[tuple[int, str, str]] = []
    in_fence = False
    fence_char = ""
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        fence = FENCE.match(line)
        if fence:
            marker = fence.group(1)[0]
            if not in_fence:
                in_fence = True
                fence_char = marker
            elif marker == fence_char:
                in_fence = False
                fence_char = ""
            continue
        if in_fence:
            continue
        for rule_id, pattern in RULES:
            match = pattern.search(line)
            if match:
                findings.append((line_number, rule_id, match.group(0)))
    return findings


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(f"usage: {Path(argv[0]).name} FILE [FILE ...]", file=sys.stderr)
        return 2

    found = False
    for raw_path in argv[1:]:
        path = Path(raw_path)
        if not path.is_file():
            print(f"{path}: not a regular file", file=sys.stderr)
            return 2
        for line_number, rule_id, text in scan_path(path):
            found = True
            print(f"{path}:{line_number}:{rule_id}:{text}")
    return 1 if found else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
