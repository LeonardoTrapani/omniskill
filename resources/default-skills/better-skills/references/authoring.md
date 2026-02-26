# Authoring Skills

Rules for creating and editing skill folders. Read this before any create or update flow.

## Frontmatter

- `name` and `description` are required.
- `name`: 1-64 characters, lowercase letters, numbers, hyphens only (no consecutive hyphens). Must exactly match the parent directory name.
- `description`: max 1024 characters. This is the only metadata the agent sees for routing.
  - Write in third person: describe the capability + when to use it.
  - Include realistic user phrasings (aliases, common variants).
  - Include negative triggers: what should NOT trigger this skill.
  - Bad: "React skills." (too vague, no trigger context, no negative triggers)
  - Good: "Creates React components with Tailwind CSS. Use when user wants to update component styles or UI logic. Do not use for Vue, Svelte, or vanilla CSS projects."

## Directory structure

```
skill-name/
├── SKILL.md              # Required: metadata + core instructions (<500 lines)
├── references/           # Supplementary context (schemas, cheatsheets, guides)
├── scripts/              # Executable code designed as tiny single-purpose CLIs
└── assets/               # Templates or static files used in output
```

- SKILL.md acts as the "brain": navigation + high-level procedures only.
- `references/` for contextual docs loaded just-in-time.
- `scripts/` for deterministic helpers. Do not bundle library code here.
- `assets/` for output templates not intended for context loading.

## Mention linking

See [[resource:new:references/linking.md]] for the full reference on mention
tokens (draft, persisted, and escaped forms).

Key rule: every file under `references/`, `scripts/`, or `assets/` MUST have a
matching mention. `better-skills validate` warns about unlinked files.

Update behavior:

- Local folder is desired state for resources.
- Removed local file → removed remote resource.
- Renamed file path → delete old + create new.

## Progressive disclosure

- Keep SKILL.md under 500 lines. Use it for routing and checklists.
- Move detailed workflows to `references/` files.
- Just-in-time loading: explicitly instruct the agent when to read a file.
  The agent will not see reference content until directed to.
- Use relative paths with forward slashes regardless of OS.
- Prefer flat references (e.g. `references/schema.md` over
  `references/db/schema.md`). Nesting is acceptable when grouping many files.

## Instruction style

- Use step-by-step numbering. Define workflows as strict chronological sequences.
- Map decision trees explicitly (e.g. "Step 2: If X, run Y. Otherwise skip to Step 3.").
- Write in third-person imperative: "Extract the text..." not "I will extract..." or "You should extract..."
- Provide concrete templates in `assets/` for structured output.
- Use identical terminology: pick one term per concept and use it consistently throughout all skill files.

## What NOT to create

Skills are for agents, not humans. To keep the context window lean:

- No documentation files: README.md, CHANGELOG.md, INSTALLATION_GUIDE.md.
- No redundant logic: if the agent already handles a task reliably without help, delete the instruction.
- No library code: skills should reference existing tools or contain tiny single-purpose scripts.

## Scripts

- Offload fragile/repetitive operations to tested scripts in `scripts/`.
- Scripts must return descriptive human-readable error messages on stderr so the agent can self-correct.
- Do not ask the LLM to write complex parsing or boilerplate from scratch when a script can handle it deterministically.

## Quality checklist

1. Trigger description is broad but precise, includes negative triggers.
2. SKILL.md is a router pointing to specific flow/reference docs.
3. Every resource file is referenced by a `\[[resource:new:...]]` mention.
4. Command examples use real CLI syntax.
5. Folder passes `better-skills validate` with zero warnings before create/update.
6. No redundant instructions for things the agent already does well.
7. Terminology is consistent across all files.
