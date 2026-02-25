# Flow: Edit a Skill

Use this when user wants to update an existing skill from a local folder.

## Read first

- [[skill:new:references/guidelines/authoring.md]]
- [[skill:new:references/guidelines/mention-linking.md]]
- [[skill:new:references/commands/create-update.md]]

## Steps

1. Validate folder:

```bash
python scripts/validate_skill_folder.py <folder>
```

2. Update skill:

```bash
better-skills update <slug-or-uuid> --from <folder> [--slug <slug>] [--public|--private]
```

3. Confirm with:

```bash
better-skills get <slug-or-uuid>
```

## Behavior note

- Local folder is desired state for resources.
- Missing local file on update removes remote resource.
