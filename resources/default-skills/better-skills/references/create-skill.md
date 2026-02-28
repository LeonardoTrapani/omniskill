# Create a Skill

Use this when user wants to create a new skill.

## Read first

- [[resource:new:references/authoring.md]]

## Step 1: Obtain `$skill_dir`

Every path below must produce a `$skill_dir` folder containing at least a
`SKILL.md`. All later steps apply identically regardless of source.

### A. skills.sh URL

URL pattern: `https://skills.sh/<org>/<repo>/<skill-name>`

The path segments map to a GitHub repo plus the skill folder name. Clone first,
then resolve the folder using common layouts:

```bash
tmp_root="$(mktemp -d)"
git clone --depth 1 https://github.com/<org>/<repo>.git "$tmp_root/repo"

if [ -d "$tmp_root/repo/skills/<skill-name>" ]; then
  skill_dir="$tmp_root/repo/skills/<skill-name>"
elif [ -d "$tmp_root/repo/<skill-name>" ]; then
  skill_dir="$tmp_root/repo/<skill-name>"
elif [ -f "$tmp_root/repo/SKILL.md" ]; then
  skill_dir="$tmp_root/repo"
else
  # locate the folder containing SKILL.md for <skill-name>, then set skill_dir
  exit 1
fi
```

### B. GitHub URL

Clone the repo and locate the skill folder:

```bash
tmp_root="$(mktemp -d)"
git clone --depth 1 <repo-url> "$tmp_root/repo"
```

If the repo root contains `SKILL.md` directly, the repo itself is the skill:

```bash
skill_dir="$tmp_root/repo"
```

If the URL points to a subdirectory, copy that subfolder out as `$skill_dir`.

### C. Other URL (blog post, docs page, npm package, etc.)

1. WebFetch the URL to extract the content.
2. If the page references a source repo (e.g. npm → GitHub link), clone that
   repo instead and follow path B.
3. If no repo is available, use the fetched content as reference material and
   draft the skill manually (see path D).

### D. Written instructions or session context

Draft from scratch:

```bash
tmp_root="$(mktemp -d)"
skill_dir="$tmp_root/<skill-slug>"
mkdir -p "$skill_dir/references"
```

Create `SKILL.md` at `"$skill_dir/SKILL.md"` and resource files inside
`"$skill_dir/references/"` (or `scripts/`, `assets/`).

## Step 2: Wire mentions

Follow [[resource:new:references/linking.md]]. In short:

1. Replace **every** reference to a local resource file with
   `\[[resource:new:<path>]]` — in SKILL.md **and** inside resource files.
   Multiple mentions of the same file are valid; the CLI deduplicates.

2. Bare markdown links (`[text](references/foo.md)`) and plain-text paths
   (`references/foo.md`) are both forbidden. Every occurrence must be a
   mention token.

3. If any resource file still has no inbound mention, add a short list in
   SKILL.md (for example `## Resource Index`) with one
   `\[[resource:new:<path>]]` mention per missing file.

Before:

```
See [Quick Reference](references/quick-reference.md) for details.
Also consult references/code-patterns.md for examples.
```

After:

```
See \[[resource:new:references/quick-reference.md]] for details.
Also consult \[[resource:new:references/code-patterns.md]] for examples.
```

## Step 3: Validate

```bash
better-skills validate "$skill_dir"
```

Validation is strict: any warning fails. Fix all issues before proceeding.

After validate passes, scan SKILL.md **and every resource file** for
remaining bare markdown links (`[text](references/...)`) or plain-text
paths to local files. `validate` catches missing mentions but does not
detect leftover bare links — fix those manually.

## Step 4: Create

```bash
better-skills create --from "$skill_dir" [--slug <slug>]
```

The CLI will:

- Read `SKILL.md` and scan resource files
- Validate `:new:` mention paths
- Create the skill and resources on the server
- Resolve `\[[resource:new:...]]` mentions to `\[[resource:<uuid>]]` in both
  SKILL.md and resource file content

## Step 5: Sync

```bash
better-skills sync
```

## Step 6: Confirm and clean up

```bash
better-skills get <slug-or-uuid>
rm -rf "$tmp_root"
```

## Output

- Success: JSON with `id`, `slug`, `name`.
- Failure: non-zero exit with actionable error text.

End by telling the user to start a new session so updated skills are reloaded.
