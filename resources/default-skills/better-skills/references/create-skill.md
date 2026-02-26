# Create a Skill

## Step 1: Load authoring rules

Read [[resource:new:references/authoring.md]] now. All decisions below depend
on those rules.

## Step 2: Gather input

The user provides one of:

- Detailed written instructions
- Choices/patterns extracted from the current session
- A URL to a public repo or skill (e.g. GitHub, skills.sh)

If a URL is given, fetch the repo content first, then continue.

## Step 3: Discovery (optional)

If the intent is broad or the skill might already exist, search the vault
before creating a duplicate:

```bash
better-skills search "<query>"
better-skills get <slug-or-uuid>
```

If a matching skill exists, confirm with the user: create a new one anyway,
or switch to the edit flow?

## Step 4: Draft in a temp folder

Never write directly into the repo.

```bash
tmp_root="$(mktemp -d)"
skill_dir="$tmp_root/<skill-slug>"
mkdir -p "$skill_dir/references"
```

Create `SKILL.md` at `"$skill_dir/SKILL.md"` and resource files inside
`"$skill_dir/references/"` (or `scripts/`, `assets/`).

## Step 5: Wire mentions

For every resource file, add a `[[resource:new:<path>]]` mention in SKILL.md
or in another resource file. No resource should exist without a matching
mention.

Replace any bare markdown links to local resources
(e.g. `[text](references/foo.md)`) with `[[resource:new:references/foo.md]]`.

## Step 6: Validate

```bash
better-skills validate "$skill_dir"
```

Fix all errors and warnings before proceeding.

## Step 7: Create

```bash
better-skills create --from "$skill_dir" [--slug <slug>]
```

The CLI will:

- Read SKILL.md and scan resource files
- Validate `:new:` mention paths
- Create the skill and resources on the server
- Resolve `[[resource:new:...]]` to `[[resource:<uuid>]]` in all content

## Step 8: Confirm and clean up

```bash
better-skills get <slug-or-uuid>
rm -rf "$tmp_root"
```

## Output

- Success: JSON with `id`, `slug`, `name`.
- Failure: non-zero exit with actionable error text.
