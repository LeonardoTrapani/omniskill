# Flow: Search and Propose

Use this for discovery, recommendations, import proposals, and linking suggestions.

## Read first

- [[resource:new:references/commands/other-commands.md]]
- [[resource:new:references/guidelines/mention-linking.md]]

## Search steps

1. Search own/private first:

```bash
better-skills search "<query>"
```

2. Search public next:

```bash
better-skills search "<query>" --public
```

3. Inspect candidates:

```bash
better-skills get <slug-or-uuid>
```

## Proposal format

1. Candidate skill(s) and why they match.
2. Suggested action:
   - import into private vault, and/or
   - link from existing private skill.
3. Exact command(s) to run once approved.

## Execute after approval

```bash
better-skills import <slug-or-uuid> [--slug <new-slug>]
```

For linking, update target markdown with valid UUID mentions using create/edit flows.
