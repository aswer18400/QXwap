#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
HOT_CACHE_PATH = ROOT / "data" / "hot-cache.md"
SEARCH_PATHS = [
    HOT_CACHE_PATH,
    ROOT / "AI_START_HERE.md",
    ROOT / "AGENTS.md",
    ROOT / "CLAUDE.md",
    ROOT / "docs" / "ai-context",
]
SESSION_UPDATES_PLACEHOLDER = "- Add short time-stamped sprint notes here"


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


def now_label() -> str:
    return datetime.now().astimezone().strftime("%Y-%m-%d %H:%M %Z")


def today_label() -> str:
    return datetime.now().astimezone().strftime("%Y-%m-%d")


def ensure_hot_cache() -> None:
    HOT_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if HOT_CACHE_PATH.exists():
        return
    HOT_CACHE_PATH.write_text(
        "\n".join(
            [
                "# QXwap Hot Cache",
                "",
                f"Last updated: {today_label()}",
                "",
                "## Current Project State",
                "",
                "- Canonical source: `origin/main`",
                "",
                "## Current Focus",
                "",
                "- Add current sprint context here",
                "",
                "## Latest Known Good",
                "",
                "- Add known-good state here",
                "",
                "## Active Blockers / Risks",
                "",
                "- Add active blockers here",
                "",
                "## Recent Decisions",
                "",
                "- Add recent decisions here",
                "",
                "## Session Updates",
                "",
                "- Add short time-stamped sprint notes here",
                "",
                "## Next Recommended Sprint",
                "",
                "- Add next sprint here",
                "",
            ]
        ),
        encoding="utf-8",
    )


def read_hot_cache() -> str:
    ensure_hot_cache()
    return HOT_CACHE_PATH.read_text(encoding="utf-8")


def write_hot_cache(content: str) -> None:
    HOT_CACHE_PATH.write_text(content.rstrip() + "\n", encoding="utf-8")


def set_section(content: str, heading: str, body_lines: list[str]) -> str:
    pattern = re.compile(rf"(?ms)^## {re.escape(heading)}\n.*?(?=^## |\Z)")
    block = f"## {heading}\n\n" + "\n".join(body_lines).rstrip() + "\n\n"
    if pattern.search(content):
        return pattern.sub(block, content, count=1)
    return content.rstrip() + "\n\n" + block


def get_section_lines(content: str, heading: str) -> list[str]:
    pattern = re.compile(rf"(?ms)^## {re.escape(heading)}\n(.*?)(?=^## |\Z)")
    match = pattern.search(content)
    if not match:
        return []
    return [
        line
        for line in match.group(1).strip().splitlines()
        if line.strip() and line.strip() != SESSION_UPDATES_PLACEHOLDER
    ]


def replace_last_updated(content: str, value: str) -> str:
    if re.search(r"(?m)^Last updated: .*$", content):
        return re.sub(r"(?m)^Last updated: .*$", f"Last updated: {value}", content, count=1)
    return content.rstrip() + f"\n\nLast updated: {value}\n"


def bulletize(items: list[str], fallback: str) -> list[str]:
    cleaned = [f"- {item.strip()}" for item in items if item and item.strip()]
    return cleaned or [f"- {fallback}"]


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


def append_note(section: str, note: str) -> None:
    content = read_hot_cache()
    pattern = re.compile(rf"(?ms)^## {re.escape(section)}\n(.*?)(?=^## |\Z)")
    entry = f"- {now_label()} — {note.strip()}"
    match = pattern.search(content)
    if match:
        lines = [line for line in match.group(1).splitlines() if line.strip() and line.strip() != SESSION_UPDATES_PLACEHOLDER]
        section_body = "\n".join(lines).strip("\n")
        updated_body = section_body + ("\n" if section_body else "") + entry
        updated = set_section(content, section, updated_body.splitlines())
    else:
        updated = set_section(content, section, [entry])
    updated = replace_last_updated(updated, today_label())
    write_hot_cache(updated)


def snapshot(
    branch: str,
    pr: str,
    focus: list[str],
    blockers: list[str],
    decisions: list[str],
    next_steps: list[str],
    known_good: list[str],
) -> None:
    content = read_hot_cache()
    existing_session_updates = get_section_lines(content, "Session Updates")
    current_state = [
        "- Canonical source: `origin/main`",
        f"- Active sprint branch: `{branch}`" if branch else "- Active sprint branch: _(not set)_",
        f"- Draft PR: {pr}" if pr else "- Draft PR: _(not set)_",
        "- Deploy rule: deploy from `main` only after review/merge",
    ]
    content = replace_last_updated(content, today_label())
    content = set_section(content, "Current Project State", current_state)
    content = set_section(content, "Current Focus", bulletize(focus, "Add current sprint focus here"))
    content = set_section(content, "Latest Known Good", bulletize(known_good, "Add known-good state here"))
    content = set_section(content, "Active Blockers / Risks", bulletize(blockers, "Add active blockers here"))
    content = set_section(content, "Recent Decisions", bulletize(decisions, "Add recent decisions here"))
    content = set_section(content, "Next Recommended Sprint", bulletize(next_steps, "Add next sprint here"))
    content = set_section(content, "Session Updates", existing_session_updates or [SESSION_UPDATES_PLACEHOLDER])
    write_hot_cache(content)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Search project AI memory files.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    search_parser = subparsers.add_parser("search", help="Search AI context files for a keyword")
    search_parser.add_argument("keyword", help="Keyword or phrase to search for")

    append_parser = subparsers.add_parser("append", help="Append a time-stamped note into hot-cache")
    append_parser.add_argument("note", help="Short note to append")
    append_parser.add_argument("--section", default="Session Updates", help="Section heading to append into")

    snapshot_parser = subparsers.add_parser("snapshot", help="Write a structured sprint snapshot into hot-cache")
    snapshot_parser.add_argument("--branch", default="", help="Active branch name")
    snapshot_parser.add_argument("--pr", default="", help="Draft PR link or identifier")
    snapshot_parser.add_argument("--focus", action="append", default=[], help="Current focus item")
    snapshot_parser.add_argument("--blocker", action="append", default=[], help="Active blocker or risk")
    snapshot_parser.add_argument("--decision", action="append", default=[], help="Recent decision")
    snapshot_parser.add_argument("--next", action="append", default=[], help="Next recommended sprint item")
    snapshot_parser.add_argument("--good", action="append", default=[], help="Known-good state item")

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
    if args.command == "append":
        append_note(args.section, args.note)
        print(f'Appended note to "{args.section}" in {HOT_CACHE_PATH.relative_to(ROOT)}')
        return 0
    if args.command == "snapshot":
        snapshot(args.branch, args.pr, args.focus, args.blocker, args.decision, args.next, args.good)
        print(f'Updated structured snapshot in {HOT_CACHE_PATH.relative_to(ROOT)}')
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
