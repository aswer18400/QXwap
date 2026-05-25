#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SEARCH_PATHS = [
    ROOT / "data" / "hot-cache.md",
    ROOT / "AI_START_HERE.md",
    ROOT / "AGENTS.md",
    ROOT / "CLAUDE.md",
    ROOT / "docs" / "ai-context",
]


def iter_files() -> list[Path]:
    files: list[Path] = []
    for path in SEARCH_PATHS:
        if not path.exists():
            continue
        if path.is_file():
            files.append(path)
            continue
        files.extend(sorted(p for p in path.rglob("*") if p.is_file()))
    return files


def render_match(path: Path, line_no: int, line: str, pattern: re.Pattern[str]) -> str:
    relative = path.relative_to(ROOT)
    highlighted = pattern.sub(lambda match: f"\033[1;32m{match.group(0)}\033[0m", line.rstrip())
    return f"{relative}:{line_no}: {highlighted}"


def search(keyword: str) -> int:
    pattern = re.compile(re.escape(keyword), re.IGNORECASE)
    matches = 0
    for path in iter_files():
        try:
            content = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        except OSError:
            continue
        for index, line in enumerate(content, start=1):
            if pattern.search(line):
                print(render_match(path, index, line, pattern))
                matches += 1
    return matches


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Search project AI memory files.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    search_parser = subparsers.add_parser("search", help="Search AI context files for a keyword")
    search_parser.add_argument("keyword", help="Keyword or phrase to search for")

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "search":
        count = search(args.keyword)
        if count == 0:
            print(f'No matches found for "{args.keyword}"')
            return 1
        print(f"\nFound {count} match(es).")
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
