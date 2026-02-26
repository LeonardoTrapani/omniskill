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
better-skills search "<query>" [--public] [--limit N]
better-skills get <slug-or-uuid>
better-skills clone <slug-or-uuid> [--to <dir>] [--force]
```

Behavior for `list`:

- Lists the authenticated user's skills (requires login).
- Optional positional `search` text filters by name/slug (ILIKE).
- `--limit N` caps results (default 20). `--all` fetches every skill.

## Import and delete

```bash
better-skills import <slug-or-uuid> [--slug <new-slug>]
better-skills delete <uuid>
```

## Agent config and sync

```bash
better-skills config
better-skills sync
better-skills validate <dir>
better-skills backup plan [--source <dir>] [--out <file>] [--agent <agent>]
better-skills backup apply --plan <file> [--keep-snapshot]
```

## Automation notes

- create/import/update print JSON on success (`id`, `slug`, `name`, `visibility`).
- failures return non-zero and print actionable error text.
