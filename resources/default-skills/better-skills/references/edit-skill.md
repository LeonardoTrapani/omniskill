# Edit a Skill

Use this when user wants to update an existing skill.

## Read first

- [[resource:new:references/authoring.md]]

## Steps

1. Clone the current skill to a local folder:

```bash
better-skills clone <slug-or-uuid> --to <folder> [--force]
```

The clone writes the folder in update-ready format: `SKILL.md` +
`references/` + `scripts/` + `assets/`. It prints a link context table
(`uuid -> resource path`) for existing mentions.

2. Edit local files (`SKILL.md` and resources).

If adding a new file, create it under `references/`, `scripts/`, or `assets/`,
then reference it with `[[resource:new:references/new-file.md]]` in SKILL.md
or another resource file.

3. Verify all resource files have a `[[resource:new:...]]` mention somewhere.
   Replace any bare markdown links to local resources with the mention form.

4. Validate the folder:

```bash
better-skills validate <folder>
```

Fix any errors and warnings before proceeding.

5. Update the skill:

```bash
better-skills update <slug-or-uuid> --from <folder> [--slug <slug>]
```

The CLI will:

- Diff local resources against the server (insert/update/delete)
- Resolve `[[resource:new:...]]` mentions to `[[resource:<uuid>]]` in both
  SKILL.md and resource file content

6. Confirm the update:

```bash
better-skills get <slug-or-uuid>
```

## Behavior

- Local folder is desired state for resources.
- Missing local file on update removes the remote resource.
- Renamed file path → delete old + create new.
