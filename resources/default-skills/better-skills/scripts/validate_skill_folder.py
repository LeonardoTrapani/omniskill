#!/usr/bin/env python3

"""Validate a better-skills local skill folder before create/update.

Checks:
- SKILL.md exists
- frontmatter contains name + description
- each [[skill:new:...]] / [[resource:new:...]] path exists locally
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


NEW_MENTION_RE = re.compile(
    r"(?<!\\)\[\[(skill|resource):new:([^\]\n]+)\]\]", re.IGNORECASE
)


def normalize_path(path: str) -> str:
    normalized = path.strip().replace("\\", "/")

    if normalized.startswith("./"):
        normalized = normalized[2:]

    if "#" in normalized:
        normalized = normalized.split("#", 1)[0]

    if "?" in normalized:
        normalized = normalized.split("?", 1)[0]

    while normalized.startswith("/"):
        normalized = normalized[1:]

    return normalized


def split_frontmatter(skill_md: str) -> tuple[str | None, str]:
    if not skill_md.startswith("---\n"):
        return None, skill_md

    lines = skill_md.splitlines()
    end_idx = None

    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end_idx = i
            break

    if end_idx is None:
        return None, skill_md

    frontmatter = "\n".join(lines[1:end_idx])
    body = "\n".join(lines[end_idx + 1 :])
    return frontmatter, body


def has_frontmatter_field(frontmatter: str, field: str) -> bool:
    pattern = re.compile(rf"(?m)^{re.escape(field)}:\s*(.*)$")
    return bool(pattern.search(frontmatter))


def collect_local_resources(folder: Path) -> set[str]:
    paths: set[str] = set()

    for root in ("references", "scripts", "assets"):
        root_dir = folder / root
        if not root_dir.exists() or not root_dir.is_dir():
            continue

        for file_path in root_dir.rglob("*"):
            if file_path.is_file():
                rel = file_path.relative_to(folder).as_posix()
                paths.add(normalize_path(rel))

    return paths


def collect_new_mention_paths(markdown: str) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []

    in_fence = False
    fence_marker: str | None = None

    for line in markdown.splitlines():
        stripped = line.lstrip()
        fence_match = re.match(r"(```+|~~~+)", stripped)

        if fence_match:
            marker = fence_match.group(1)[0]
            if not in_fence:
                in_fence = True
                fence_marker = marker
            elif fence_marker == marker:
                in_fence = False
                fence_marker = None
            continue

        if in_fence:
            continue

        parts = re.split(r"(`[^`]*`)", line)
        for part in parts:
            if len(part) >= 2 and part.startswith("`") and part.endswith("`"):
                continue

            for match in NEW_MENTION_RE.finditer(part):
                path = normalize_path(match.group(2))
                if path not in seen:
                    seen.add(path)
                    result.append(path)

    return result


def validate(folder: Path) -> int:
    errors: list[str] = []
    warnings: list[str] = []

    skill_file = folder / "SKILL.md"
    if not skill_file.exists() or not skill_file.is_file():
        print("error: SKILL.md not found")
        return 1

    content = skill_file.read_text(encoding="utf-8")
    frontmatter, body = split_frontmatter(content)

    if frontmatter is None:
        errors.append("SKILL.md must start with YAML frontmatter delimited by ---")
    else:
        if not has_frontmatter_field(frontmatter, "name"):
            errors.append("frontmatter missing required field: name")
        if not has_frontmatter_field(frontmatter, "description"):
            errors.append("frontmatter missing required field: description")

    local_resources = collect_local_resources(folder)
    mention_paths = collect_new_mention_paths(body)

    missing = [path for path in mention_paths if path not in local_resources]
    if missing:
        errors.append("missing local resources for :new: mention tokens:")
        errors.extend([f"  - {path}" for path in missing])

    if not local_resources:
        warnings.append(
            "no local resources found under references/, scripts/, or assets/"
        )

    if errors:
        print("validation failed")
        for line in errors:
            print(f"- {line}")
        if warnings:
            for line in warnings:
                print(f"- warning: {line}")
        return 1

    print("validation passed")
    print(f"- resources: {len(local_resources)}")
    print(f"- :new: mention paths: {len(mention_paths)}")
    if warnings:
        for line in warnings:
            print(f"- warning: {line}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate Better Skills local skill folder"
    )
    parser.add_argument("folder", help="Path to local skill folder")
    args = parser.parse_args()

    folder = Path(args.folder).expanduser().resolve()
    if not folder.exists() or not folder.is_dir():
        print(f"error: not a directory: {folder}")
        return 1

    return validate(folder)


if __name__ == "__main__":
    sys.exit(main())
