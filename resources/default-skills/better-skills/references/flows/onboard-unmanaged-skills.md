# Flow: Onboard unmanaged skills

Use this when user asks to bring unmanaged local skills into the vault.

## Read first

- [[resource:new:references/guidelines/authoring.md]]
- [[resource:new:references/guidelines/mention-linking.md]]
- [[resource:new:references/flows/create-skill.md]]
- [[resource:new:references/flows/edit-skill.md]]

## Rule

Use only `better-skills backup` for local collection. Do not use plan/apply flows.

## Step 1: Select skills to upload

Present the full list of unsynced local skills to the user and ask which ones
to port to the vault. Accept "all" or a subset.

If the user selects a subset, ask what to do with the unselected skills:

- **Keep locally** (default) - leave them as-is, skip during upload.
- **Delete locally** - remove the local skill folders after backup completes.

Never delete without explicit confirmation.

## Step 2: Backup local skills to tmp (copy only)

Run:

```bash
better-skills backup [--source <dir>] [--out <tmp-dir>] [--agent <agent>]...
```

Expected output paths:

- `tmp` backup root
- `raw/` immutable copy (restore only)
- `work/` identical editable copy (upload source)

Both `raw/` and `work/` are plain copies. `raw/` is for restore; `work/` is
for the agent to edit before uploading.

## Step 3: Prepare selected `work/` skill folders

For each skill the user selected in Step 1, open the `work/` copy and edit it
so it conforms to the authoring and mention-linking guidelines:

1. Read the `SKILL.md` in the `work/` folder.
2. Rewrite any local inline markdown links that point to `references/`,
   `scripts/`, or `assets/` paths into draft mention form
   (`[[resource:new:<path>]]`). Strip leading `./` prefixes, `#fragment`
   suffixes, and `<>` angle-bracket wrapping during normalization.
3. Verify frontmatter has required `name` and `description` fields. Ensure
   `name` matches the skill slug (lowercase, hyphens, no consecutive hyphens).
4. Ensure `description` follows authoring guidelines (third person, includes
   trigger phrases and negative triggers).
5. Check the folder structure matches the expected layout (`SKILL.md` +
   optional `references/`, `scripts/`, `assets/`).

## Step 4: Route selected `work/` skill folders

Only process the skills the user selected in Step 1.

1. Check whether skill already exists in vault (`better-skills list --all`).
2. If it does not exist, follow [[resource:new:references/flows/create-skill.md]].
3. If it exists, follow [[resource:new:references/flows/edit-skill.md]].

Do not duplicate create/update logic in this flow. Reuse those flow references.

## Step 5: Optional cleanup

Only if user explicitly asked to delete unselected skills in Step 1:

- Remove the local skill folders that were not selected.

For vault-only deletions, only if user explicitly asks:

- Delete vault-only skills with `better-skills delete <uuid> --yes`.

Never delete without explicit confirmation.

## Step 6: Sync

Run sync to install the newly created/updated vault skills into local agent
directories:

```bash
better-skills sync
```

## Step 7: Report

Return concise recap:

- backup paths (`tmp`, `raw`, `work`)
- counts: copied / skipped / failed backup folders
- selected vs total: how many were chosen for upload
- counts from create/edit actions
- sync result
- local deletions (if any)
- vault deletions (if any)

End by telling the user to start a new session so updated skills are reloaded.
