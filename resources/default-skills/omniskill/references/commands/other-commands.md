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
better-skills search "<query>" [--public] [--limit N]
better-skills get <slug-or-uuid>
```

## Import and delete

```bash
better-skills import <slug-or-uuid> [--slug <new-slug>]
better-skills delete <uuid>
```

## Agent config and sync

```bash
better-skills config
better-skills sync
```

## Automation notes

- create/import/update print JSON on success (`id`, `slug`, `name`, `visibility`).
- failures return non-zero and print actionable error text.
