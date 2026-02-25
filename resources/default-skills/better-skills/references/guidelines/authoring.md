# Guidelines: Authoring

Use these rules when creating or editing skill folders.

## Frontmatter

- `name` and `description` are required.
- Write `description` as trigger text: what the skill does + when to use it.
- Include realistic user phrasing (aliases, common variants).

## Structure

- Keep main `SKILL.md` as a router + concise checklist.
- Move detailed workflows to `references/` files.
- Keep `SKILL.md` short (target under ~500 lines).
- Keep reusable tooling in `scripts/`.

## Resource model

- `references/` for contextual docs.
- `scripts/` for deterministic helpers.
- `assets/` for output assets/templates not intended for context loading.

## Quality checklist

- Trigger description is broad but precise.
- Router in `SKILL.md` points to specific flow docs.
- Command examples use real CLI syntax.
- Folder passes validation before create/update.
