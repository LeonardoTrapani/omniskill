# Flow: Create a Skill

Use this when user wants to create a new skill from a local folder.

## Read first

- [[resource:new:references/guidelines/authoring.md]]
- [[resource:new:references/guidelines/mention-linking.md]]
- [[resource:new:references/commands/create-update.md]]

## Steps

1. Draft the new skill in temporary files under a temporary folder first (do not write directly into the repo):

```bash
tmp_root="$(mktemp -d)"
skill_dir="$tmp_root/<skill-slug>"
mkdir -p "$skill_dir"
```

Create `SKILL.md` at `"$skill_dir/SKILL.md"` and any resources inside `"$skill_dir"`.

2. Validate folder:

```bash
better-skills validate <skill_dir>
```

3. Create skill:

```bash
better-skills create --from <skill_dir> [--slug <slug>] [--public]
```

4. Confirm with:

```bash
better-skills get <slug-or-uuid>
```

5. Clean up temp files after reporting results:

```bash
rm -rf "$tmp_root"
```

## Output expectation

- Success output is JSON containing `id`, `slug`, `name`, `visibility`.
- If local `:new:` mention paths are missing, fail before mutation.
