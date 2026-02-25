# Flow: Create a Skill

Use this when user wants to create a new skill from a local folder.

## Read first

- [[skill:new:references/guidelines/authoring.md]]
- [[skill:new:references/guidelines/mention-linking.md]]
- [[skill:new:references/commands/create-update.md]]

## Steps

1. Validate folder:

```bash
python scripts/validate_skill_folder.py <folder>
```

2. Create skill:

```bash
omniskill create --from <folder> [--slug <slug>] [--public]
```

3. Confirm with:

```bash
omniskill get <slug-or-uuid>
```

## Output expectation

- Success output is JSON containing `id`, `slug`, `name`, `visibility`.
- If local `:new:` mention paths are missing, fail before mutation.
