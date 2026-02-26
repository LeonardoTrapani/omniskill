# Flow: Edit a Skill

Use this when user wants to update an existing skill from a local folder.

## Read first

- [[resource:new:references/guidelines/authoring.md]]
- [[resource:new:references/guidelines/mention-linking.md]]
- [[resource:new:references/commands/create-update.md]]

## Steps

1. Clone current skill to local folder first:

```bash
better-skills clone <slug-or-uuid> --to <folder>
```

2. Edit local files (`SKILL.md` and resources).

If adding a new file, create it under `references/`, `scripts/`, or `assets/`, then mention it with draft token form like `[[resource:new:references/new-file.md]]`.

3. Verify all local resource links in `SKILL.md` use draft mention form.
   Scan for any remaining bare markdown links pointing to `references/`,
   `scripts/`, or `assets/` paths (e.g. `[text](references/foo.md)`) and
   replace them with `[[resource:new:<path>]]`. No bare local links should
   survive into the update step.

4. Validate folder:

```bash
better-skills validate <folder>
```

5. Update skill:

```bash
better-skills update <slug-or-uuid> --from <folder> [--slug <slug>]
```

6. Confirm with:

```bash
better-skills get <slug-or-uuid>
```

## Behavior note

- Local folder is desired state for resources.
- Missing local file on update removes remote resource.
