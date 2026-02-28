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

3. Wire mentions per [[resource:new:references/linking.md]]. If adding a new
   file, create it under `references/`, `scripts/`, or `assets/` and add a
   `\[[resource:new:<path>]]` mention. Replace any bare markdown links with
   mention tokens.

4. Validate the folder:

```bash
better-skills validate <folder>
```

Validation is strict: any warning fails. Fix all issues before proceeding.

5. Update the skill:

```bash
better-skills update <slug-or-uuid> --from <folder> [--slug <slug>]
```

The CLI will:

- Diff local resources against the server (insert/update/delete)
- Resolve `\[[resource:new:...]]` mentions to `\[[resource:<uuid>]]` in both
  SKILL.md and resource file content

6. Sync:

```bash
better-skills sync
```

7. Confirm the update:

```bash
better-skills get <slug-or-uuid>
```

End by telling the user to start a new session so updated skills are reloaded.

## Behavior

- Local folder is desired state for resources.
- Missing local file on update removes the remote resource.
- Renamed file path → delete old + create new.
