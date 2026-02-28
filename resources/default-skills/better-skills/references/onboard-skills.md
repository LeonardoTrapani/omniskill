# Onboard Unmanaged Skills

Use this when user asks to bring existing unmanaged local skill folders
into the vault. Do NOT use for GitHub URLs, skills.sh links, or any
external source — those follow the Create flow.

## Read first

- [[resource:new:references/authoring.md]]
- [[resource:new:references/create-skill.md]]
- [[resource:new:references/edit-skill.md]]

## Rule

Use only `better-skills backup` for local collection. Do not copy files manually.

## Step 1: Select skills to upload

Present the full list of unsynced local skills and ask which ones to port.
Accept "all" or a subset.

If the user selects a subset, ask what to do with the unselected skills:

- **Keep locally** (default) — leave as-is.
- **Delete locally** — remove local folders after backup. Never delete without explicit confirmation.

## Step 2: Backup to tmp

```bash
better-skills backup [--source <dir>] [--out <tmp-dir>] [--agent <agent>]
```

Output paths:

- `raw/` — immutable backup (restore only)
- `work/` — editable copy for the agent to prepare before uploading

Both copies are plain, unmodified. The agent edits `work/` files (rewriting
inline links to draft mentions, verifying frontmatter) before create/update.

## Step 3: Prepare `work/` folders

For each selected skill:

1. Wire mentions per [[resource:new:references/linking.md]] — rewrite bare
   markdown links to `\[[resource:new:<path>]]` form and ensure every resource
   file has a matching mention.
2. Verify frontmatter has required `name` and `description` fields.
3. Run `better-skills validate <work-folder>` — fix all errors and warnings.

## Step 4: Route to create or update

1. Check if skill already exists: `better-skills list --all`.
2. If it does not exist, follow [[resource:new:references/create-skill.md]].
3. If it exists, follow [[resource:new:references/edit-skill.md]].

## Step 5: Sync

```bash
better-skills sync
```

## Step 6: Report

Return concise recap:

- backup paths (`raw`, `work`)
- counts: copied / skipped / failed
- selected vs total
- create/edit results
- sync result

End by telling the user to start a new session so updated skills are reloaded.
