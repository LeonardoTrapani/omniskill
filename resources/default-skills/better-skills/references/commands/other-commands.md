# Commands: Other Operations

## Auth and connectivity

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

Behavior for `list`:

- Lists the authenticated user's skills (requires login).
- Optional positional `search` text filters by name/slug (ILIKE).
- `--limit N` caps results (default 20). `--all` fetches every skill.

## Delete

```bash
better-skills delete <uuid> [--yes]
```

`--yes` skips the interactive confirmation prompt. Required in non-interactive
environments (agents, CI, piped input).

## Agent config and sync

```bash
better-skills config
better-skills sync
better-skills validate <dir>
better-skills backup [--source <dir>] [--out <tmp-dir>] [--agent <agent>]
```

`backup` copies unmanaged local skills into a tmp folder with two identical
copies:

- `raw/` immutable backup copy (restore only)
- `work/` editable copy for the agent to prepare before uploading

Both copies are plain, unmodified. The agent is responsible for editing
`work/` files (rewriting inline links to draft mentions, verifying frontmatter,
etc.) before running create/update workflows.

## Non-interactive / agent usage

The CLI auto-detects non-interactive environments (no TTY, `AGENT=1`,
`OPENCODE=1`, `CI=true`) and suppresses spinners and decorative output.

- Destructive commands like `delete` require `--yes` in non-interactive mode.
- Interactive prompts (agent selection, backup suggestions) are skipped with
  sensible defaults.
- create/update print JSON on success (`id`, `slug`, `name`).
- failures return non-zero and print actionable error text.
