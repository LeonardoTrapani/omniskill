# Flow: Upload Local Skills to Better-Skills Vault

Use this when user asks to bring unmanaged local skills into the vault.

## Read first

- [[resource:new:references/guidelines/authoring.md]]
- [[resource:new:references/guidelines/mention-linking.md]]
- [[resource:new:references/flows/create-skill.md]]
- [[resource:new:references/flows/edit-skill.md]]

## Rule

Use only `better-skills backup` for local collection. Do not use plan/apply flows.

## Step 1: Backup local skills to tmp (copy only)

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

## Step 2: Route each `work/` skill folder

1. Check whether skill already exists in vault (`better-skills list --all`).
2. If it does not exist, follow [[resource:new:references/flows/create-skill.md]].
3. If it exists, follow [[resource:new:references/flows/edit-skill.md]].

Do not duplicate create/update logic in this flow. Reuse those flow references.

## Step 3: Optional cleanup

Only if user explicitly asks:

- delete vault-only skills with `better-skills delete <uuid> --yes`

Never delete without explicit confirmation.

## Step 4: Report

Return concise recap:

- backup paths (`tmp`, `raw`, `work`)
- counts: copied / skipped / failed backup folders
- counts from create/edit actions
- explicit deletions (if any)

End by telling the user to start a new session so updated skills are reloaded.
