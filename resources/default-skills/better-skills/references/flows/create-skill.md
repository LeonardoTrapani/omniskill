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

2. Verify all local resource links in `SKILL.md` use draft mention form.
   Scan for any remaining bare markdown links pointing to `references/`,
   `scripts/`, or `assets/` paths (e.g. `[text](references/foo.md)`) and
   replace them with `[[resource:new:<path>]]`. No bare local links should
   survive into the create step.

3. Validate folder:

```bash
better-skills validate <skill_dir>
```

4. Create skill:

```bash
better-skills create --from <skill_dir> [--slug <slug>]
```

5. Confirm with:

```bash
better-skills get <slug-or-uuid>
```

6. Clean up temp files after reporting results:

```bash
rm -rf "$tmp_root"
```

## Output expectation

- Success output is JSON containing `id`, `slug`, `name`.
- If local `:new:` mention paths are missing, fail before mutation.
