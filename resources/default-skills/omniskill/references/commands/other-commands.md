# Commands: Other Operations

## Auth and connectivity

```bash
omniskill health
omniskill login
omniskill whoami
omniskill logout
```

## Discovery

```bash
omniskill search "<query>" [--public] [--limit N]
omniskill get <slug-or-uuid>
```

## Import and delete

```bash
omniskill import <slug-or-uuid> [--slug <new-slug>]
omniskill delete <uuid>
```

## Agent config and sync

```bash
omniskill config
omniskill sync
```

## Automation notes

- create/import/update print JSON on success (`id`, `slug`, `name`, `visibility`).
- failures return non-zero and print actionable error text.
