---
name: better-skills
description: |
  Index and route better-skills vault operations from the CLI.
  Trigger when users ask to manage better-skills or a skill vault
  (create, edit, delete, remove, search, import, clone, link, sync, backup).
  Do not use when asked to use a skill.
---

# better-skills

## Flows

- Create a skill → [[resource:new:references/create-skill.md]]
- Edit a skill → [[resource:new:references/edit-skill.md]]
- Onboard unmanaged local skills → [[resource:new:references/onboard-skills.md]]
- Search and propose links → [[resource:new:references/search-and-propose.md]]
- Mention linking → [[resource:new:references/linking.md]]
- CLI command reference → [[resource:new:references/commands.md]]
- Authoring guidelines → [[resource:new:references/authoring.md]]

## Rules

1. Every resource file must have a `\[[resource:new:<path>]]` mention — either
   in SKILL.md or in another resource. Run `better-skills validate` and fix
   all warnings before create/update.
2. Never use bare markdown links for internal resource references.
3. Always read [[resource:new:references/authoring.md]] before creating or
   editing a skill.
