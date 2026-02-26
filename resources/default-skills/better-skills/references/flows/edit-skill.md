# Flow: Edit a Skill

Use this when user wants to update an existing skill from a local folder.

## Read first

- [[skill:new:references/guidelines/authoring.md]]
- [[skill:new:references/guidelines/mention-linking.md]]
- [[skill:new:references/commands/create-update.md]]

## Steps

1. Clone current skill to local folder first:

```bash
better-skills clone <slug-or-uuid> --to <folder>
```

2. Edit local files (`SKILL.md` and resources).

If adding a new file, create it under `references/`, `scripts/`, or `assets/`, then mention it with draft token form like `[[resource:new:references/new-file.md]]`.

3. Validate folder:

```bash
better-skills validate <folder>
```

4. Update skill:

```bash
better-skills update <slug-or-uuid> --from <folder> [--slug <slug>] [--public|--private]
```

5. Confirm with:

```bash
better-skills get <slug-or-uuid>
```

## Behavior note

- Local folder is desired state for resources.
- Missing local file on update removes remote resource.
