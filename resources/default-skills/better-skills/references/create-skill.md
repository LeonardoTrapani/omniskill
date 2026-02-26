# Create a Skill

Use this when user wants to create a new skill.

## Read first

- [[resource:new:references/authoring.md]]

## Step 1: Obtain `$skill_dir`

Every path below must produce a `$skill_dir` folder containing at least a
`SKILL.md`. All later steps apply identically regardless of source.

### A. skills.sh URL

URL pattern: `https://skills.sh/<org>/<repo>/<skill-name>`

The path segments map directly to a GitHub repo and subfolder:

```bash
tmp_root="$(mktemp -d)"
git clone --depth 1 https://github.com/<org>/<repo>.git "$tmp_root/repo"
skill_dir="$tmp_root/<skill-name>"
cp -r "$tmp_root/repo/<skill-name>" "$skill_dir"
```

### B. GitHub URL

Clone the repo and locate the skill folder:

```bash
tmp_root="$(mktemp -d)"
git clone --depth 1 <repo-url> "$tmp_root/repo"
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

1. For every resource file, add a `\[[resource:new:<path>]]` mention in
   SKILL.md or in another resource file.

2. Replace any bare markdown links to local resources
   (e.g. `[text](references/foo.md)`) with `\[[resource:new:references/foo.md]]`.

## Step 3: Validate

```bash
better-skills validate "$skill_dir"
```

Fix any errors and warnings before proceeding.

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

## Step 5: Confirm and clean up

```bash
better-skills get <slug-or-uuid>
rm -rf "$tmp_root"
```

## Output

- Success: JSON with `id`, `slug`, `name`.
- Failure: non-zero exit with actionable error text.
