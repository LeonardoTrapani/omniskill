#!/usr/bin/env python3
"""
Bulk Skill Packager - Creates .skill files for all skills in the repository.

Usage:
    python package_all.py [options]

Options:
    --skills NAMES      Comma-separated list of skill names to package
    --claude-ai-only    Only package skills compatible with Claude AI
    --output-dir DIR    Output directory (default: dist/)
    --list              List skills and their compatibility, don't package

Example:
    python package_all.py
    python package_all.py --claude-ai-only
    python package_all.py --skills color-palette,google-apps-script
    python package_all.py --list
"""

import sys
import re
import argparse
from pathlib import Path

# Add scripts dir to path for imports
sys.path.insert(0, str(Path(__file__).parent))
from package_skill import package_skill


def parse_frontmatter(skill_path):
    """Parse frontmatter from a skill's SKILL.md."""
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return None

    content = skill_md.read_text()
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return None

    frontmatter = {}
    for line in match.group(1).strip().split('\n'):
        if ':' in line:
            key, _, value = line.partition(':')
            frontmatter[key.strip()] = value.strip().strip('"').strip("'")
    return frontmatter


def is_claude_ai_compatible(frontmatter):
    """Check if a skill is compatible with Claude AI."""
    if not frontmatter:
        return True  # default: compatible
    compatibility = frontmatter.get('compatibility', '')
    return 'claude-code-only' not in compatibility.lower()


def find_skills(skills_dir):
    """Find all skill directories."""
    skills = []
    for path in sorted(skills_dir.iterdir()):
        if path.is_dir() and (path / "SKILL.md").exists():
            skills.append(path)
    return skills


def main():
    parser = argparse.ArgumentParser(description="Package skills as .skill files")
    parser.add_argument('--skills', help='Comma-separated skill names')
    parser.add_argument('--claude-ai-only', action='store_true',
                        help='Only package Claude AI-compatible skills')
    parser.add_argument('--output-dir', default='dist',
                        help='Output directory (default: dist/)')
    parser.add_argument('--list', action='store_true',
                        help='List skills and compatibility, don\'t package')
    args = parser.parse_args()

    # Find skills directory (relative to repo root)
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent.parent.parent  # scripts/ -> skill-creator/ -> skills/ -> repo
    skills_dir = repo_root / "skills"

    if not skills_dir.exists():
        print(f"Error: Skills directory not found at {skills_dir}")
        sys.exit(1)

    all_skills = find_skills(skills_dir)

    if not all_skills:
        print("No skills found.")
        sys.exit(1)

    # Filter by name if specified
    if args.skills:
        requested = set(args.skills.split(','))
        all_skills = [s for s in all_skills if s.name in requested]
        missing = requested - {s.name for s in all_skills}
        if missing:
            print(f"Warning: Skills not found: {', '.join(sorted(missing))}")

    # List mode
    if args.list:
        print(f"{'Skill':<30} {'Claude AI':<12} {'Claude Code':<12}")
        print("-" * 54)
        for skill_path in all_skills:
            fm = parse_frontmatter(skill_path)
            ai_ok = is_claude_ai_compatible(fm)
            print(f"{skill_path.name:<30} {'Yes' if ai_ok else 'No':<12} {'Yes':<12}")
        total_ai = sum(1 for s in all_skills if is_claude_ai_compatible(parse_frontmatter(s)))
        print(f"\n{len(all_skills)} skills total, {total_ai} Claude AI compatible")
        sys.exit(0)

    # Filter by compatibility
    if args.claude_ai_only:
        all_skills = [s for s in all_skills
                      if is_claude_ai_compatible(parse_frontmatter(s))]

    if not all_skills:
        print("No skills match the filter criteria.")
        sys.exit(1)

    # Package
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Packaging {len(all_skills)} skills to {output_dir}/\n")

    success = 0
    failed = 0

    for skill_path in all_skills:
        print(f"--- {skill_path.name} ---")
        result = package_skill(str(skill_path), str(output_dir))
        if result:
            success += 1
        else:
            failed += 1
        print()

    print("=" * 40)
    print(f"Packaged: {success}")
    if failed:
        print(f"Failed:   {failed}")
    print(f"Output:   {output_dir}/")

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
