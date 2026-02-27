# Search and Propose

Use this for discovery, recommendations, and linking suggestions.

## Read first

- [[resource:new:references/commands.md]]

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
2. For each link: the specific file and section where the
   `\[[skill:<uuid>]]` mention should go. Prefer the most relevant
   reference file and section over SKILL.md. See
   [[resource:new:references/linking.md]] for placement rules.
3. Exact command(s) to run once approved.

For linking, update target markdown with valid UUID mentions using the
create/edit flows.
