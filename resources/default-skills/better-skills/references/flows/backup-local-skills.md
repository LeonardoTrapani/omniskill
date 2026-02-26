# Flow: Backup Local Skills

Use this when user asks to back up local OpenCode/Claude/Cursor (or custom-folder) skills into better-skills, and optionally clean up graph links.

## Read first

- [[skill:new:references/guidelines/authoring.md]]
- [[skill:new:references/guidelines/mention-linking.md]]
- [[skill:new:references/commands/create-update.md]]
- [[skill:new:references/flows/search-and-propose.md]]

## Overview

This is a three-step interactive flow: discover, choose, execute.
No mutations happen until the user explicitly confirms a selection.

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

Present the comparison to the user and ask two questions:

### Question A: Which skills to port?

Show all **local only** and **both (changed)** skills as a checklist.
Include a brief note for each (e.g. "new skill", "description changed", "3 resources added").
Let the user select which ones to back up. Default: all of them selected.

Skills classified as **both (unchanged)** are reported as skipped - no action needed.

### Question B: What to do with vault-only skills?

If there are **vault only** skills (in the vault but not on the local filesystem), list them and ask:

- **Keep in vault** - leave them as-is, no changes (default)
- **Delete from vault** - remove them from better-skills

Let the user decide per-skill or in bulk.

Only proceed to Step 3 after the user confirms their selections.

## Step 3: Execute

1. Build the backup plan scoped to the user's selections:

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

5. Return concise recap:
   - counts: created / updated / skipped / deleted from vault
   - local cleanup: removed folders + retained snapshot path (if any)
   - sync result: success / failure
   - failures and manual recovery steps (if any)

## Link heuristics

- Prefer explicit existing links over inferred links.
- Prefer update over create when identity + purpose match.
- Add links that help navigation/actionability; avoid cosmetic full-mesh graphs.
- If uncertain, do not mutate that edge; keep as suggestion.
- Link policy default in automated backup is `preserve-current-links-only`.
- If user asks for link curation, propose exact edits separately before mutating.
