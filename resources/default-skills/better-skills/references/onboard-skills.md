# Onboard Unmanaged Skills

## Step 1: Load authoring rules

Read [[resource:new:references/authoring.md]] now. All decisions below depend
on those rules.

## Step 2: Select skills to upload

Present the full list of unsynced local skills and ask which ones to port.
Accept "all" or a subset.

If the user selects a subset, ask what to do with the unselected skills:

- **Keep locally** (default) — leave as-is.
- **Delete locally** — remove local folders after backup. Never delete without
  explicit confirmation.

## Step 3: Backup to tmp

Use only `better-skills backup` for local collection. Do not copy files
manually.

```bash
better-skills backup [--source <dir>] [--out <tmp-dir>] [--agent <agent>]
```

Output paths:

- `raw/` — immutable backup (restore only)
- `work/` — editable copy for the agent to prepare before uploading

Both copies are plain, unmodified. Edit `work/` files only (rewriting inline
links to draft mentions, verifying frontmatter) before create/update.

## Step 4: Prepare `work/` folders

For each selected skill:

1. Rewrite any bare markdown links to `references/`, `scripts/`, or `assets/`
   paths into `[[resource:new:<path>]]` form.
2. Verify frontmatter has required `name` and `description` fields.
3. Ensure every resource file has a matching `[[resource:new:...]]` mention.
4. Run `better-skills validate <work-folder>` — fix all errors and warnings.

## Step 5: Route to create or edit

1. Check if skill already exists: `better-skills list --all`.
2. If it does not exist → load [[resource:new:references/create-skill.md]]
   and follow from Step 4 (draft is already prepared).
3. If it exists → load [[resource:new:references/edit-skill.md]] and follow
   from Step 4 (apply changes to the cloned folder using the prepared work).

## Step 6: Sync

```bash
better-skills sync
```

## Step 7: Report

Return concise recap:

- backup paths (`raw`, `work`)
- counts: copied / skipped / failed
- selected vs total
- create/edit results
- sync result

End by telling the user to start a new session so updated skills are reloaded.
