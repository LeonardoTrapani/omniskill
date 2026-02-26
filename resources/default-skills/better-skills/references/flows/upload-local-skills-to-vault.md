# Flow: Upload Local Skills to Better-Skills Vault

Use this when user asks to upload/merge local OpenCode/Claude/Cursor (or custom-folder) skills into the better-skills vault, and optionally clean up graph links.

## Read first

- [[resource:new:references/guidelines/authoring.md]]
- [[resource:new:references/guidelines/mention-linking.md]]
- [[resource:new:references/commands/create-update.md]]
- [[resource:new:references/flows/search-and-propose.md]]

## Overview

This is a three-step interactive flow: discover, choose, execute.
No mutations happen until the user explicitly confirms a selection.

## Context loading order (read once)

1. This flow file.
2. `[[resource:new:references/commands/create-update.md]]`.
3. `[[resource:new:references/commands/other-commands.md]]`.
4. The CLI handoff prompt if one was generated (clipboard text, optional temp `prompt.md`).

The CLI handoff prompt includes unsynced skill slugs grouped by selected agent + skill root path.
Use that list as starting inventory and only rescan folders when data is missing or stale.

## Step 1: Discover

1. Find local skill folders:
   - If user gave a folder, use it.
   - Else check common roots in this order (if they exist):
     - `~/.config/opencode/skills`
     - `~/.claude/skills`
     - `~/.cursor/skills`
     - `.agents/skills` in current workspace
   - Each subfolder with `SKILL.md` is a candidate. Skip invalid folders and note them briefly.

2. Fetch vault inventory:

   ```bash
   better-skills list --all
   ```

3. Build a comparison table classifying every skill into one of:
   - **Local only** - exists locally but not in the vault (will create)
   - **Both (changed)** - exists in both, local version differs (will update)
   - **Both (unchanged)** - exists in both, no meaningful diff (skip)
   - **Vault only** - exists in vault but not found locally (orphan)

## Step 2: Choose

Present the comparison to the user and ask the following questions:

### Question A: Which skills to upload?

Show all **local only** and **both (changed)** skills as a checklist.
Include a brief note for each (e.g. "new skill", "description changed", "3 resources added").
Let the user select which ones to upload into the vault. Default: all of them selected.

Skills classified as **both (unchanged)** are reported as skipped - no action needed.

### Question B: If not all are selected, what to do with the remaining local-only skills?

If the user selected less than all local candidates, ask:

- **Keep remaining local skills** - do not mutate unselected local folders (default)
- **Delete remaining local skills** - remove only the unselected local-only folders

Never delete unselected local folders without explicit confirmation.

### Question C: What to do with vault-only skills?

If there are **vault only** skills (in the vault but not on the local filesystem), list them and ask:

- **Keep in vault** - leave them as-is, no changes (default)
- **Delete from vault** - remove them from better-skills

Let the user decide per-skill or in bulk.

Only proceed to Step 3 after the user confirms their selections.

## Step 3: Execute

1. Build the upload plan scoped to the user's selections:

   ```bash
   better-skills backup plan [--source <dir>] [--out <file>] [--agent <agent>]
   ```

2. Execute the approved plan:

   ```bash
   better-skills backup apply --plan <plan-file>
   ```

3. If the user chose to delete any vault-only skills:

   ```bash
   better-skills delete <uuid> --yes
   ```

4. `backup apply` behavior:
   - creates snapshot copies outside agent skill roots
   - validates each folder before mutation
   - runs create/update using snapshot sources
   - removes unmanaged local skill copies that were successfully backed up
   - runs `better-skills sync`
   - deletes snapshot on successful sync (unless keep flag is used)
   - keeps snapshot on sync failure for recovery

5. If the user explicitly approved deleting unselected local-only skills, remove those folders after successful backup/apply.

6. Return concise recap:
   - counts: created / updated / skipped / deleted from vault
   - local cleanup: removed folders (selected + optional unselected) + retained snapshot path (if any)
   - sync result: success / failure
   - failures and manual recovery steps (if any)

7. End by telling the user to create a new session so updated skills are loaded.

## Link heuristics

- Prefer explicit existing links over inferred links.
- Prefer update over create when identity + purpose match.
- Add links that help navigation/actionability; avoid cosmetic full-mesh graphs.
- If uncertain, do not mutate that edge; keep as suggestion.
- Link policy default in automated upload is `preserve-current-links-only`.
- If user asks for link curation, propose exact edits separately before mutating.
