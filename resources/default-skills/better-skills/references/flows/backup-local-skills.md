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

1. For each candidate, read `SKILL.md` and resource structure.
2. Extract:
   - identity (`name`, likely slug, short purpose)
   - current links (`[[skill:*]]`, `[[resource:*]]`, and escaped examples)
   - likely relationship signals (dependencies, extensions, companion tools)
3. Check vault status:
   - existing candidate in private vault (search/get)
   - likely duplicate/overlap candidates
4. Build concise proposal with:
   - backup plan: create vs update vs skip
   - dedupe plan: which folders are the same skill and should be backed up once
   - link plan: exact suggested edges + one-line reason each
   - confidence label: `high`, `medium`, or `low`
5. If linking policy is unclear, present clean options:
   - curated links only (recommended)
   - preserve current links only
   - connect everything (only if user explicitly wants dense graph)

## Pass 2: execute after approval

1. Create a safety backup snapshot first:
   - create a temporary folder outside agent skill roots
   - copy each candidate local skill folder into it
   - use those copied folders as mutation sources

2. Backup/import from the snapshot:

```bash
python scripts/validate_skill_folder.py <backup-folder>/<skill-folder>
better-skills create --from <backup-folder>/<skill-folder> [--slug <slug>] [--public]
better-skills update <slug-or-uuid> --from <backup-folder>/<skill-folder> [--slug <slug>] [--public|--private]
better-skills get <slug-or-uuid>
```

3. Link curation pass:
   - clone each target skill to local folder
   - edit markdown to use final UUID mention forms:
     - `[[skill:<uuid>]]`
     - `[[resource:<uuid>]]`
   - do not use `[[skill:new:<path>]]` for cross-skill links
   - validate folder, then update skill

4. Reconcile local agent folders and sync:
   - for each skill successfully backed up, delete unmanaged copies from local agent skill folders before running sync
   - run `better-skills sync`
   - after successful sync, delete the temporary backup snapshot folder
   - if sync fails, keep snapshot folder and report recovery steps

5. Return concise recap:
   - counts: created/updated/skipped
   - local cleanup: removed folders + retained snapshot path (if any)
   - sync result: success/failure
   - links: added/updated/left-as-suggestion
   - unresolved low-confidence edges

## Link heuristics

- Prefer explicit existing links over inferred links.
- Prefer update over create when identity + purpose match.
- Add links that help navigation/actionability; avoid cosmetic full-mesh graphs.
- If uncertain, do not mutate that edge; keep as suggestion.
