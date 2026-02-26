# Flow: Upload Local Skills to Better-Skills Vault

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
- `work/` editable copy (upload source)

`work/` has local inline resource links rewritten to draft mentions
(`[[resource:new:...]]`) so it is ready for create/update flows.

## Step 3: Route selected `work/` skill folders

Only process the skills the user selected in Step 1.

1. Check whether skill already exists in vault (`better-skills list --all`).
2. If it does not exist, follow [[resource:new:references/flows/create-skill.md]].
3. If it exists, follow [[resource:new:references/flows/edit-skill.md]].

Do not duplicate create/update logic in this flow. Reuse those flow references.

## Step 4: Optional cleanup

Only if user explicitly asked to delete unselected skills in Step 1:

- Remove the local skill folders that were not selected.

For vault-only deletions, only if user explicitly asks:

- Delete vault-only skills with `better-skills delete <uuid> --yes`.

Never delete without explicit confirmation.

## Step 5: Report

Return concise recap:

- backup paths (`tmp`, `raw`, `work`)
- counts: copied / skipped / failed backup folders
- selected vs total: how many were chosen for upload
- counts from create/edit actions
- local deletions (if any)
- vault deletions (if any)

End by telling the user to start a new session so updated skills are reloaded.
