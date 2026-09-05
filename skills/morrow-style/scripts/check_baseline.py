#!/usr/bin/env python3
"""Positive baseline check: does the text match MorRow's sentence-rhythm baseline?"""
import re, sys, json, statistics
from pathlib import Path

# Baseline computed from MorRow's authored tech-sharing articles (2026-08-22)
BASELINE = {
    "avg_len": 43.2,        # average sentence length in chars
    "pct_long_ge50": 37.6,  # % sentences >= 50 chars
    "pct_short_le15": 24.5, # % sentences <= 15 chars
    "cv_len": 0.76,         # coefficient of variation (rhythm)
}

# tolerance bands: within these = like MorRow; outside = flag
BANDS = {
    "avg_len": (30, 55),
    "pct_long_ge50": (15, 55),
    "pct_short_le15": (10, 40),
    "cv_len": (0.5, 1.0),
}

FENCE = re.compile(r"^\s*(`{3,}|~{3,})")

def strip_code_fences(text):
    lines = []
    in_fence = False
    for line in text.splitlines():
        if FENCE.match(line):
            in_fence = not in_fence
            continue
        if not in_fence:
            lines.append(line)
    return "\n".join(lines)

def metrics(path):
    raw = Path(path).read_text(encoding="utf-8")
    text = strip_code_fences(raw)
    sents = [s.strip() for s in re.split(r"[。！？；\n]", text) if s.strip()]
    lens = [len(s) for s in sents]
    n = len(lens)
    if n == 0:
        return None
    mean = statistics.mean(lens)
    return {
        "sentences": n,
        "avg_len": round(mean, 1),
        "pct_long_ge50": round(100 * sum(1 for l in lens if l >= 50) / n, 1),
        "pct_short_le15": round(100 * sum(1 for l in lens if l <= 15) / n, 1),
        "cv_len": round(statistics.pstdev(lens) / mean, 2),
    }

def check(path):
    m = metrics(path)
    if m is None:
        print(f"{path}: no sentences found")
        return 1
    print(f"{path}:")
    problems = []
    for k, (lo, hi) in BANDS.items():
        v = m[k]
        mark = "OK " if lo <= v <= hi else "FAIL"
        if mark == "FAIL":
            problems.append(k)
        print(f"  [{mark}] {k:>18} = {v}  (基线 {BASELINE[k]}, 容差 {lo}-{hi})")
    if problems:
        print(f"  => 不符合基线的项: {', '.join(problems)}")
        print(f"  => 提示: 你的风格是长句主导、长短交错(CV高)、节奏有起伏，别写成一水的短句")
        return 1
    print("  => 节奏符合本人基线")
    return 0

if __name__ == "__main__":
    code = 0
    for p in sys.argv[1:]:
        code |= check(p)
    raise SystemExit(code)
