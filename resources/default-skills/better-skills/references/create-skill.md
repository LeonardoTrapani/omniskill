# Create a Skill

Use this when user wants to create a new skill.

## Read first

- [[resource:new:references/authoring.md]]

## Steps

0. Receive instructions:

Could be:

- Detailed instructions of what the user wants
- An abstraction of some choices taken in the current session
- A github link to a repo with the skill
- Any public repo link or command, like skills.sh

For the last two, fetch the repo, and then go on with the rest

1. Draft the skill in a temporary folder (never write directly into the repo):

```bash
tmp_root="$(mktemp -d)"
skill_dir="$tmp_root/<skill-slug>"
mkdir -p "$skill_dir/references"
```

Create `SKILL.md` at `"$skill_dir/SKILL.md"` and resource files inside
`"$skill_dir/references/"` (or `scripts/`, `assets/`).

2. For every resource file, add a `[[resource:new:<path>]]` mention in
   SKILL.md or in another resource file. No resource should exist without
   a matching mention.

3. Replace any bare markdown links to local resources
   (e.g. `[text](references/foo.md)`) with `[[resource:new:references/foo.md]]`.

4. Validate the folder:

```bash
better-skills validate "$skill_dir"
```

Fix any errors and warnings before proceeding.

5. Create the skill:

```bash
better-skills create --from "$skill_dir" [--slug <slug>]
```

The CLI will:

- Read `SKILL.md` and scan resource files
- Validate `:new:` mention paths
- Create the skill and resources on the server
- Resolve `[[resource:new:...]]` mentions to `[[resource:<uuid>]]` in both
  SKILL.md and resource file content

6. Confirm creation:

```bash
better-skills get <slug-or-uuid>
```

7. Clean up temp files:

```bash
rm -rf "$tmp_root"
```

## Output

- Success: JSON with `id`, `slug`, `name`.
- Failure: non-zero exit with actionable error text.
