# Commands: Create and Update

## Create

```bash
better-skills create --from <dir> [--slug <slug>] [--public]
```

Behavior:

1. Read `SKILL.md` and scan resources.
2. Validate `:new:` mention paths.
3. Create skill/resources.
4. Resolve local draft mentions to UUID resource mentions.
5. Patch markdown via update if needed.

## Clone (for editing)

```bash
better-skills clone <slug-or-uuid> [--to <dir>] [--force]
```

Behavior:

1. Load target skill/resources from API.
2. Write local folder in update-ready format: `SKILL.md` + `references/` + `scripts/` + `assets/`.
3. Write `SKILL.md` using DB markdown (`originalMarkdown`), not rendered markdown.
4. Print link context table (`uuid -> skill name / resource path`) for existing mentions.

## Update

```bash
better-skills update <slug-or-uuid> --from <dir> [--slug <slug>] [--public|--private]
```

Behavior:

1. Load target skill.
2. Diff resources against local folder.
3. Apply inserts/updates/deletes.
4. Resolve local draft mentions to UUID resource mentions.

If you need new files while editing, create them locally (example `references/new-note.md`) and use local draft mentions like `[[resource:new:references/new-note.md]]`.

## Folder validation helper

```bash
better-skills validate <dir>
```

Checks `SKILL.md`, frontmatter fields, and local `:new:` mention targets.
