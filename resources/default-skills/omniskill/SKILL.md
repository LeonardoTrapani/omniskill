---
name: better-skills
description: |
  Route and execute better-skills vault work from CLI: create skills, edit skills,
  search/import/delete/sync, and propose linking or curation actions. Trigger on
  "create a skill", "edit/update a skill", "better-skills", "better skills",
  "skill vault", "import this skill", "link this skill", and similar requests.
---

# better-skills

## Skill index

- To create a skill -> [[skill:new:references/flows/create-skill.md]]
- To edit a skill -> [[skill:new:references/flows/edit-skill.md]]
- To search and propose imports/links -> [[skill:new:references/flows/search-and-propose.md]]
- To run other CLI operations -> [[skill:new:references/flows/operations.md]]
- General guidelines for writing skills -> [[skill:new:references/guidelines/authoring.md]]
- Mention and linking rules -> [[skill:new:references/guidelines/mention-linking.md]]

## Always do

1. Keep context lean. Load only the files needed for current route.
2. Use local folder authoring format: `SKILL.md` + optional `references/`, `scripts/`, `assets/`.
3. Use local draft mention token forms for new local resources:
   - \[[skill:new:<path>]]
   - \[[resource:new:<path>]]
4. Validate local folder before mutation with [[skill:new:scripts/validate_skill_folder.py]].
