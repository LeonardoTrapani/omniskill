---
name: better-skills
description: |
  Route and execute better-skills vault work from CLI: create/edit/delete/
  remove/search/import/clone/sync skills, back up local agent skills into
  better-skills, and handle graph-link curation (propose first, then apply).
  Trigger on any request about "better-skills" or "better skills", managing a
  skill vault, creating/updating/deleting/removing a skill, importing/cloning/
  linking skills, backing up local skills, and similar requests.
---

# better-skills

## Skill index

- To create a skill -> [[skill:new:references/flows/create-skill.md]]
- To edit a skill -> [[skill:new:references/flows/edit-skill.md]]
- To back up local skills + curate links -> [[skill:new:references/flows/backup-local-skills.md]]
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
5. After any edit, update, or mutation to a skill, run `better-skills sync` and tell the user to start a new session so the changes take effect.
6. For backup requests, run a two-pass flow: concise analysis/proposal first, then mutate only after user approval.
