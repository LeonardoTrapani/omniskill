# Guidelines: Authoring Skills

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

## Progressive disclosure

- Keep SKILL.md under 500 lines. Use it for routing and checklists.
- Move detailed workflows to `references/` files.
- Just-in-time loading: explicitly instruct the agent when to read a file. The agent will not see reference content until directed to.
- Use relative paths with forward slashes regardless of OS.
- Prefer flat subdirectories where possible (e.g. `references/schema.md` over `references/db/schema.md`). Nesting is acceptable when grouping many files for clarity.

## What NOT to create

Skills are for agents, not humans. To keep the context window lean:

- No documentation files: README.md, CHANGELOG.md, INSTALLATION_GUIDE.md.
- No redundant logic: if the agent already handles a task reliably without help, delete the instruction.
- No library code: skills should reference existing tools or contain tiny single-purpose scripts. Long-lived library code belongs in standard repo directories.

## Instruction style

- Use step-by-step numbering. Define workflows as strict chronological sequences.
- Map decision trees explicitly (e.g. "Step 2: If X, run Y. Otherwise skip to Step 3.").
- Write in third-person imperative: "Extract the text..." not "I will extract..." or "You should extract..."
- Provide concrete templates in `assets/` for structured output. Agents pattern-match well against examples instead of prose descriptions.
- Use identical terminology: pick one term per concept and use it consistently throughout all skill files.
- Use domain-specific terms native to the subject (e.g. "template" not "html" in Angular context).

## Scripts

- Offload fragile/repetitive operations to tested scripts in `scripts/`.
- Scripts must return descriptive human-readable error messages on stderr so the agent can self-correct without user intervention.
- Do not ask the LLM to write complex parsing or boilerplate from scratch when a script can handle it deterministically.

## Quality checklist

1. Trigger description is broad but precise, includes negative triggers.
2. SKILL.md is a router pointing to specific flow/reference docs.
3. Command examples use real CLI syntax.
4. Folder passes `better-skills validate` before create/update.
5. No redundant instructions for things the agent already does well.
6. Terminology is consistent across all files.

## Validation workflow

After drafting a skill, validate through these steps using an LLM:

### 1. Discovery validation

Test whether the frontmatter triggers correctly. In a fresh LLM chat, paste only the name + description and ask it to:

1. Generate 3 realistic user prompts that should trigger this skill.
2. Generate 3 similar prompts that should NOT trigger it.
3. Critique the description: is it too broad or too narrow? Suggest a rewrite.

Also prompt agents with assignments you expect to trigger a skill read and inspect the thought process. Iterate on the description until routing is reliable.

### 2. Logic validation

Feed the full SKILL.md + directory tree to an LLM and ask it to simulate execution step by step for a realistic user request. For each step it should:

1. State what it is doing and which file/script it reads or runs.
2. Flag any execution blocker: a point where it is forced to guess because instructions are ambiguous.

### 3. Edge case testing

Ask the LLM to act as QA tester and generate 3-5 specific challenging questions about failure states, missing fallbacks, or implicit assumptions in the skill. Do not fix yet - collect the questions first, then answer them.

### 4. Architecture refinement

Based on edge case answers, have the LLM rewrite SKILL.md enforcing progressive disclosure:

1. Keep SKILL.md as high-level steps using third-person imperative.
2. Move dense rules, large templates, or complex schemas to `references/` or `assets/`.
3. Add an error handling section incorporating answers from edge case testing.
