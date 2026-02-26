# Flow: Create a Skill

Use this when user wants to create a new skill from a local folder.

## Read first

- [[resource:new:references/guidelines/authoring.md]]
- [[resource:new:references/guidelines/mention-linking.md]]
- [[resource:new:references/commands/create-update.md]]

## Steps

1. Validate folder:

```bash
better-skills validate <folder>
```

2. Create skill:

```bash
better-skills create --from <folder> [--slug <slug>] [--public]
```

3. Confirm with:

```bash
better-skills get <slug-or-uuid>
```

## Output expectation

- Success output is JSON containing `id`, `slug`, `name`, `visibility`.
- If local `:new:` mention paths are missing, fail before mutation.
