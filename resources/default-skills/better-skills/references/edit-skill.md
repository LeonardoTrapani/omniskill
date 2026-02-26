# Edit a Skill

## Step 1: Load authoring rules

Read [[resource:new:references/authoring.md]] now. All decisions below depend
on those rules.

## Step 2: Identify the target

Determine which skill to edit. If the user is vague, search the vault first:

```bash
better-skills search "<query>"
better-skills get <slug-or-uuid>
```

Confirm the correct skill with the user before proceeding.

## Step 3: Clone to a local folder

```bash
better-skills clone <slug-or-uuid> --to <folder> [--force]
```

The clone writes the folder in update-ready format: `SKILL.md` +
`references/` + `scripts/` + `assets/`. It prints a link context table
(`uuid -> resource path`) for existing mentions.

## Step 4: Apply changes

Edit local files (`SKILL.md` and resources).

If adding a new file, create it under `references/`, `scripts/`, or `assets/`,
then reference it with `[[resource:new:references/new-file.md]]` in SKILL.md
or another resource file.

## Step 5: Wire mentions

Verify all resource files have a `[[resource:new:...]]` mention somewhere.
Replace any bare markdown links to local resources with the mention form.

## Step 6: Validate

```bash
better-skills validate <folder>
```

Fix all errors and warnings before proceeding.

## Step 7: Update

```bash
better-skills update <slug-or-uuid> --from <folder> [--slug <slug>]
```

The CLI will:

- Diff local resources against the server (insert/update/delete)
- Resolve `[[resource:new:...]]` to `[[resource:<uuid>]]` in all content

## Step 8: Confirm

```bash
better-skills get <slug-or-uuid>
```

## Behavior

- Local folder is desired state for resources.
- Missing local file on update removes the remote resource.
- Renamed file path → delete old + create new.
