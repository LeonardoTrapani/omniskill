# CLI Commands

## Auth

```bash
better-skills health
better-skills login
better-skills whoami
better-skills logout
```

## Discovery

```bash
better-skills list [search] [--all] [--limit N]
better-skills search "<query>" [--limit N]
better-skills get <slug-or-uuid>
better-skills clone <slug-or-uuid> [--to <dir>] [--force]
```

`list` shows the authenticated user's skills. Optional search text filters by
name/slug (ILIKE). `--limit N` caps results (default 20). `--all` fetches all.

## Create and update

```bash
better-skills create --from <dir> [--slug <slug>]
better-skills update <slug-or-uuid> --from <dir> [--slug <slug>]
better-skills validate <dir>
```

Both `create` and `update` resolve `\[[resource:new:...]]` mentions to
`\[[resource:<uuid>]]` in SKILL.md and all resource file content.

`validate` checks frontmatter and `:new:` mention targets, and fails when
resource files are missing mention references.

## Delete

```bash
better-skills delete <uuid> [--yes]
```

`--yes` skips confirmation. Required in non-interactive environments.

## Config and sync

```bash
better-skills config
better-skills sync
```

## Non-interactive usage

The CLI auto-detects non-interactive environments (no TTY, `AGENT=1`,
`OPENCODE=1`, `CI=true`) and suppresses spinners.

- Destructive commands require `--yes` in non-interactive mode.
- create/update print JSON on success (`id`, `slug`, `name`).
- Failures return non-zero with actionable error text.
