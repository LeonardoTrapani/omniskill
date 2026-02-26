# Flow: Backup Local Skills

Use this when user asks to back up local OpenCode/Claude/Cursor (or custom-folder) skills into better-skills, and optionally clean up graph links.

## Read first

- [[skill:new:references/guidelines/authoring.md]]
- [[skill:new:references/guidelines/mention-linking.md]]
- [[skill:new:references/commands/create-update.md]]
- [[skill:new:references/flows/search-and-propose.md]]

## Two-pass contract

1. Pass 1 (required): inspect deeply, then return a concise proposal.
2. Pass 2 (only after approval): create/update skills, then apply link edits.

Do not mutate in pass 1.

## Source discovery

1. If user gave a folder, use it.
2. Else check common roots in this order (if they exist):
   - `~/.config/opencode/skills`
   - `~/.claude/skills`
   - `~/.cursor/skills`
   - `.agents/skills` in current workspace
3. Treat each subfolder with `SKILL.md` as a candidate skill folder.
4. Skip invalid folders and report skipped items briefly.

## Pass 1: analyze and propose

1. Build the backup plan JSON (no mutation):

```bash
better-skills backup plan [--source <dir>] [--out <file>] [--agent <agent>]
```

2. Review the plan and return concise proposal:
   - create/update/skip decisions
   - dedupe summary (same skill seen in multiple folders)
   - confidence (`high`/`medium`/`low`) and skip reasons
   - explicit plan path for pass 2

3. Link policy default in automated backup is `preserve-current-links-only`.
   - If user asks for link curation, propose exact edits separately before mutating.

## Pass 2: execute after approval

1. Execute the approved plan:

```bash
better-skills backup apply --plan <plan-file>
```

2. `backup apply` behavior:
   - creates snapshot copies outside agent skill roots
   - validates each folder before mutation
   - runs create/update using snapshot sources
   - removes unmanaged local skill copies that were successfully backed up
   - runs `better-skills sync`
   - deletes snapshot on successful sync (unless keep flag is used)
   - keeps snapshot on sync failure for recovery

3. Return concise recap:
   - counts: created/updated/skipped
   - local cleanup: removed folders + retained snapshot path (if any)
   - sync result: success/failure
   - failures and manual recovery steps (if any)

## Link heuristics

- Prefer explicit existing links over inferred links.
- Prefer update over create when identity + purpose match.
- Add links that help navigation/actionability; avoid cosmetic full-mesh graphs.
- If uncertain, do not mutate that edge; keep as suggestion.
