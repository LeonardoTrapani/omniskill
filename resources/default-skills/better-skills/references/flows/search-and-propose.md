# Flow: Search and Propose

Use this for discovery, recommendations, and linking suggestions.

## Read first

- [[resource:new:references/commands/other-commands.md]]
- [[resource:new:references/guidelines/mention-linking.md]]

## Search steps

1. Search your vault:

```bash
better-skills search "<query>"
```

2. Inspect candidates:

```bash
better-skills get <slug-or-uuid>
```

## Proposal format

1. Candidate skill(s) and why they match.
2. Suggested action:
   - link from existing private skill.
3. Exact command(s) to run once approved.

For linking, update target markdown with valid UUID mentions using create/edit flows.
