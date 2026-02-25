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

## Update

```bash
better-skills update <slug-or-uuid> --from <dir> [--slug <slug>] [--public|--private]
```

Behavior:

1. Load target skill.
2. Diff resources against local folder.
3. Apply inserts/updates/deletes.
4. Resolve local draft mentions to UUID resource mentions.

## Folder validation helper

```bash
python scripts/validate_skill_folder.py <dir>
```

Checks `SKILL.md`, frontmatter fields, and local `:new:` mention targets.
